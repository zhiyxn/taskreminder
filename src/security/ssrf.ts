import dns from 'dns';
import net from 'net';
import http from 'http';
import https from 'https';
import { URL } from 'url';

// 自建 Bark / 内网 SMTP 等场景可显式放行内网地址（默认关闭）
const ALLOW_PRIVATE_NETWORK = process.env.ALLOW_PRIVATE_NETWORK === 'true';

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);

// ===== IP 网段判定 =====

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  let value = 0;
  for (const part of parts) {
    // 拒绝 "01"、"0x7f" 等非十进制写法，避免绕过
    if (!/^\d{1,3}$/.test(part)) return null;
    const n = Number(part);
    if (n > 255) return null;
    value = value * 256 + n;
  }
  return value;
}

// [网段起始, 前缀长度]
const BLOCKED_IPV4_CIDRS: [string, number][] = [
  ['0.0.0.0', 8],          // 当前网络
  ['10.0.0.0', 8],         // 私有
  ['100.64.0.0', 10],      // 运营商级 NAT
  ['127.0.0.0', 8],        // 回环
  ['169.254.0.0', 16],     // 链路本地（含 169.254.169.254 云元数据）
  ['172.16.0.0', 12],      // 私有
  ['192.0.0.0', 24],       // IETF 保留
  ['192.0.2.0', 24],       // 文档用
  ['192.88.99.0', 24],     // 6to4 中继
  ['192.168.0.0', 16],     // 私有
  ['198.18.0.0', 15],      // 基准测试
  ['198.51.100.0', 24],    // 文档用
  ['203.0.113.0', 24],     // 文档用
  ['224.0.0.0', 4],        // 组播
  ['240.0.0.0', 4]         // 保留（含 255.255.255.255）
];

function isBlockedIpv4(ip: string): boolean {
  const value = ipv4ToInt(ip);
  if (value === null) return true; // 解析不出来一律视为不安全
  for (const [base, bits] of BLOCKED_IPV4_CIDRS) {
    const baseValue = ipv4ToInt(base);
    if (baseValue === null) continue;
    const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
    if ((value & mask) >>> 0 === (baseValue & mask) >>> 0) return true;
  }
  return false;
}

/** 展开为 8 个 16 位段；无法解析返回 null */
function expandIpv6(ip: string): number[] | null {
  let addr = ip.toLowerCase().split('%')[0]; // 去掉 zone id，如 fe80::1%eth0

  // 形如 ::ffff:127.0.0.1 —— 尾部为点分十进制，先转成两个 16 位段
  const dotted = addr.lastIndexOf(':');
  if (addr.includes('.')) {
    const tail = addr.slice(dotted + 1);
    const value = ipv4ToInt(tail);
    if (value === null) return null;
    addr = addr.slice(0, dotted + 1) +
      ((value >>> 16) & 0xffff).toString(16) + ':' + (value & 0xffff).toString(16);
  }

  const halves = addr.split('::');
  if (halves.length > 2) return null;

  const parseGroups = (s: string): number[] | null => {
    if (s === '') return [];
    const out: number[] = [];
    for (const g of s.split(':')) {
      if (!/^[0-9a-f]{1,4}$/.test(g)) return null;
      out.push(parseInt(g, 16));
    }
    return out;
  };

  const head = parseGroups(halves[0]);
  const tail = halves.length === 2 ? parseGroups(halves[1]) : [];
  if (head === null || tail === null) return null;

  if (halves.length === 2) {
    const fill = 8 - head.length - tail.length;
    if (fill < 0) return null;
    return [...head, ...new Array(fill).fill(0), ...tail];
  }
  return head.length === 8 ? head : null;
}

function isBlockedIpv6(ip: string): boolean {
  const g = expandIpv6(ip);
  if (g === null) return true;

  // ::ffff:a.b.c.d / ::a.b.c.d —— IPv4 映射或兼容地址，按 IPv4 规则判定
  const firstFiveZero = g.slice(0, 5).every(x => x === 0);
  if (firstFiveZero && (g[5] === 0xffff || g[5] === 0)) {
    const v4 = `${g[6] >> 8}.${g[6] & 0xff}.${g[7] >> 8}.${g[7] & 0xff}`;
    return isBlockedIpv4(v4);
  }
  // 64:ff9b::/96 NAT64
  if (g[0] === 0x0064 && g[1] === 0xff9b) {
    const v4 = `${g[6] >> 8}.${g[6] & 0xff}.${g[7] >> 8}.${g[7] & 0xff}`;
    return isBlockedIpv4(v4);
  }

  if ((g[0] & 0xfe00) === 0xfc00) return true;              // fc00::/7  唯一本地
  if ((g[0] & 0xffc0) === 0xfe80) return true;              // fe80::/10 链路本地
  if ((g[0] & 0xff00) === 0xff00) return true;              // ff00::/8  组播
  if (g[0] === 0x2001 && g[1] === 0x0db8) return true;      // 2001:db8::/32 文档用
  return false;
}

/** 该 IP 是否属于应当拒绝访问的内网/保留地址 */
export function isBlockedAddress(ip: string): boolean {
  if (ALLOW_PRIVATE_NETWORK) return false;
  if (net.isIPv4(ip)) return isBlockedIpv4(ip);
  if (net.isIPv6(ip)) return isBlockedIpv6(ip);
  return true;
}

// ===== DNS 解析拦截 =====

export class BlockedAddressError extends Error {
  constructor(hostname: string) {
    super(`目标地址 ${hostname} 解析到内网或保留地址，已被安全策略阻止`);
    this.name = 'BlockedAddressError';
  }
}

/**
 * 在 DNS 解析结果返回时过滤内网地址。
 * 校验发生在真正建连所用的地址上，因此同时防御 DNS rebinding
 * （TOCTOU：先解析到公网、连接时再切回内网）。
 */
const guardedLookup = ((hostname: string, options: any, callback: any): void => {
  const opts = typeof options === 'function' ? {} : options || {};
  const cb = typeof options === 'function' ? options : callback;

  dns.lookup(hostname, { ...opts, all: true } as dns.LookupAllOptions, (err, addresses) => {
    if (err) return cb(err);
    const safe = addresses.filter(a => !isBlockedAddress(a.address));
    if (safe.length === 0) return cb(new BlockedAddressError(hostname));
    if (opts.all) return cb(null, safe);
    cb(null, safe[0].address, safe[0].family);
  });
}) as unknown as net.LookupFunction;

const safeHttpAgent = new http.Agent({ keepAlive: false, lookup: guardedLookup });
const safeHttpsAgent = new https.Agent({ keepAlive: false, lookup: guardedLookup });

/**
 * 供 node-fetch 的 agent 选项使用。传函数形式，重定向到其它协议/主机时
 * 仍会走带拦截的 Agent。
 */
export function safeAgent(parsedUrl: URL): http.Agent | https.Agent {
  return parsedUrl.protocol === 'https:' ? safeHttpsAgent : safeHttpAgent;
}

// ===== URL 结构校验 =====

export type UrlCheckResult = { ok: true; url: URL } | { ok: false; error: string };

/**
 * 出站 URL 的同步结构校验：协议白名单、禁止内嵌凭据、字面量 IP 直接判定。
 * 不含 DNS 解析——域名到内网的拦截由 safeAgent 在建连时完成。
 */
export function validateOutboundUrl(raw: string): UrlCheckResult {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, error: 'URL 格式不正确' };
  }

  if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
    return { ok: false, error: `不支持的协议 ${url.protocol}，仅允许 http/https` };
  }
  if (url.username || url.password) {
    return { ok: false, error: 'URL 中不允许内嵌用户名或密码' };
  }
  if (!url.hostname) {
    return { ok: false, error: 'URL 缺少主机名' };
  }

  // 字面量 IP 可以立即判定，给用户即时反馈
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (net.isIP(host) && isBlockedAddress(host)) {
    return { ok: false, error: '不允许指向内网或保留地址' };
  }

  return { ok: true, url };
}

/**
 * 解析主机名并校验全部返回地址，返回一个已确认安全的 IP。
 * 用于 nodemailer 这类无法注入自定义 lookup 的库：把连接钉在已校验的 IP 上，
 * 避免解析与建连之间被重新绑定。
 */
export function resolveSafeHost(hostname: string): Promise<{ address: string; family: number }> {
  const bare = hostname.replace(/^\[|\]$/g, '');

  if (net.isIP(bare)) {
    if (isBlockedAddress(bare)) return Promise.reject(new BlockedAddressError(hostname));
    return Promise.resolve({ address: bare, family: net.isIPv4(bare) ? 4 : 6 });
  }

  return new Promise((resolve, reject) => {
    dns.lookup(bare, { all: true }, (err, addresses) => {
      if (err) return reject(err);
      const safe = addresses.filter(a => !isBlockedAddress(a.address));
      if (safe.length === 0) return reject(new BlockedAddressError(hostname));
      resolve({ address: safe[0].address, family: safe[0].family });
    });
  });
}
