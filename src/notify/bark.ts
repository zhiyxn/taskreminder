import fetch from 'node-fetch';
import { validateOutboundUrl, safeAgent } from '../security/ssrf';

const DEFAULT_BARK_URL = process.env.BARK_URL || '';

export async function sendBarkMessage(
  message: string,
  options?: { barkUrl?: string }
): Promise<{ success: boolean; error?: string }> {
  const barkUrl = (options?.barkUrl || DEFAULT_BARK_URL).trim();

  if (!barkUrl) {
    return { success: false, error: 'Bark URL 未配置' };
  }

  try {
    // 支持两种格式：
    // 1. 完整 URL: https://api.day.app/{device_key}
    // 2. 仅 device_key: abc123
    const raw = barkUrl.startsWith('http')
      ? barkUrl.replace(/\/$/, '')
      : `https://api.day.app/${encodeURIComponent(barkUrl)}`;

    // 地址完全由用户提供，先做协议/字面量 IP 校验；
    // 域名解析到内网的情况由 safeAgent 在建连时拦截（同时覆盖重定向）
    const checked = validateOutboundUrl(raw);
    if (!checked.ok) {
      return { success: false, error: `Bark URL 校验失败: ${checked.error}` };
    }

    const response = await fetch(checked.url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: '事项提醒',
        body: message,
        group: '事项提醒系统'
      }),
      agent: safeAgent,
      follow: 2,
      timeout: 10_000
    });

    if (response.ok) {
      return { success: true };
    }

    // 不回显上游响应体：该地址由用户指定，回显会把这里变成读取型 SSRF 的输出通道
    return { success: false, error: `Bark 请求失败，HTTP ${response.status}` };
  } catch (err: any) {
    return { success: false, error: err.message || '请求失败' };
  }
}
