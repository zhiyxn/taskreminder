import { Request, Response, NextFunction } from 'express';

/**
 * 进程内固定窗口限流器。
 *
 * 本服务是单进程 + SQLite 的部署形态，计数放内存即可，无需引入额外依赖。
 * 若将来横向扩容到多实例，需要换成共享存储（Redis 等），否则每个实例各算各的。
 */

interface Bucket {
  count: number;
  resetAt: number;
}

export interface RateLimitVerdict {
  allowed: boolean;
  /** 距离窗口重置的秒数，allowed 为 false 时有意义 */
  retryAfter: number;
}

export class FixedWindowLimiter {
  private buckets = new Map<string, Bucket>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly maxKeys = 10_000
  ) {}

  private current(key: string, now: number): Bucket | undefined {
    const bucket = this.buckets.get(key);
    if (!bucket) return undefined;
    if (now >= bucket.resetAt) {
      this.buckets.delete(key);
      return undefined;
    }
    return bucket;
  }

  /** 只读检查，不计数 */
  check(key: string): RateLimitVerdict {
    const now = Date.now();
    const bucket = this.current(key, now);
    if (!bucket || bucket.count < this.limit) {
      return { allowed: true, retryAfter: 0 };
    }
    return { allowed: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  /** 计数 +1，并返回计数后的判定 */
  hit(key: string): RateLimitVerdict {
    const now = Date.now();
    let bucket = this.current(key, now);

    if (!bucket) {
      // 容量保护：键过多时先清理过期项，仍然超限则拒绝新建，避免内存被打爆
      if (this.buckets.size >= this.maxKeys) {
        this.cleanup();
        if (this.buckets.size >= this.maxKeys) {
          return { allowed: false, retryAfter: Math.ceil(this.windowMs / 1000) };
        }
      }
      bucket = { count: 0, resetAt: now + this.windowMs };
      this.buckets.set(key, bucket);
    }

    bucket.count += 1;
    if (bucket.count <= this.limit) {
      return { allowed: true, retryAfter: 0 };
    }
    return { allowed: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  /** 认证成功后清空该键的失败计数 */
  reset(key: string): void {
    this.buckets.delete(key);
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, bucket] of this.buckets) {
      if (now >= bucket.resetAt) this.buckets.delete(key);
    }
  }

  /** 仅供测试使用 */
  clear(): void {
    this.buckets.clear();
  }
}

const FIFTEEN_MIN = 15 * 60 * 1000;

/** 登录失败：按来源 IP 计数。仅统计失败，成功登录会清零 */
export const loginIpLimiter = new FixedWindowLimiter(20, FIFTEEN_MIN);

/**
 * 登录失败：按账号计数，是撞库场景下的主要防线
 * （IP 维度在反向代理后可能退化为全局计数）。
 */
export const loginAccountLimiter = new FixedWindowLimiter(5, FIFTEEN_MIN);

/** 注册：按 IP 限制，统计所有尝试 */
export const registerLimiter = new FixedWindowLimiter(10, 60 * 60 * 1000);

/** 验证码：按 IP 限制，防止刷图占用数据库 */
export const captchaLimiter = new FixedWindowLimiter(30, 10 * 60 * 1000);

const allLimiters = [loginIpLimiter, loginAccountLimiter, registerLimiter, captchaLimiter];

// 定期回收过期桶；unref 保证不会阻止进程退出
const sweeper = setInterval(() => allLimiters.forEach(l => l.cleanup()), 60 * 1000);
sweeper.unref();

export function clientIp(req: Request): string {
  // req.ip 是否可信取决于 app.set('trust proxy', ...)，见 index.ts
  return req.ip || req.socket.remoteAddress || 'unknown';
}

export function tooManyRequests(res: Response, retryAfter: number, message: string): void {
  res.setHeader('Retry-After', String(Math.max(retryAfter, 1)));
  res.status(429).json({ success: false, error: message });
}

/** 每次请求都计数的通用限流中间件 */
export function rateLimit(limiter: FixedWindowLimiter, message: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const verdict = limiter.hit(clientIp(req));
    if (!verdict.allowed) {
      tooManyRequests(res, verdict.retryAfter, message);
      return;
    }
    next();
  };
}
