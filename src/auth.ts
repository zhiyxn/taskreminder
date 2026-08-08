import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { userRepository, sessionRepository, captchaRepository } from './db';
import {
  loginIpLimiter,
  loginAccountLimiter,
  registerLimiter,
  captchaLimiter,
  clientIp,
  rateLimit,
  tooManyRequests
} from './security/rateLimit';

// 初始化默认用户
const DEFAULT_USERNAME = process.env.LOGIN_USERNAME || 'admin';

if (userRepository.count() === 0) {
  // 未配置 LOGIN_PASSWORD 时随机生成，不再使用众所周知的固定弱口令。
  // 随机口令只在创建这一刻打印一次，供首次登录使用。
  const configuredPassword = process.env.LOGIN_PASSWORD;
  const password = configuredPassword || crypto.randomBytes(12).toString('base64url');

  userRepository.create(DEFAULT_USERNAME, bcrypt.hashSync(password, 10), 'admin');

  if (configuredPassword) {
    // 口令来自环境变量，运维已知晓，绝不写进日志
    console.log(`✅ 默认管理员已创建: ${DEFAULT_USERNAME}（密码取自 LOGIN_PASSWORD）`);
  } else {
    console.log(
      `✅ 默认管理员已创建: ${DEFAULT_USERNAME}\n` +
      `   初始密码: ${password}\n` +
      `   ⚠️  此密码仅显示这一次，请立即登录并在设置页修改，随后清理容器日志。`
    );
  }
} else {
  // 确保默认 admin 用户具有管理员角色
  const adminUser = userRepository.getByName(DEFAULT_USERNAME);
  if (adminUser && adminUser.role !== 'admin') {
    userRepository.updateRole(adminUser.id, 'admin');
  }
}

export function getTokenFromRequest(req: Request): string | null {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    return auth.slice(7);
  }
  const cookie = req.headers.cookie;
  if (cookie) {
    const match = cookie.match(/(?:^|;\s*)auth_token=([^\s;]+)/);
    if (match) return match[1];
  }
  return null;
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = getTokenFromRequest(req);
  if (!token) {
    res.status(401).json({ success: false, error: '未登录' });
    return;
  }
  const session = sessionRepository.getByToken(token);
  if (!session) {
    res.status(401).json({ success: false, error: '登录已过期' });
    return;
  }
  const user = userRepository.getById(session.user_id);
  if (!user) {
    res.status(401).json({ success: false, error: '用户不存在' });
    return;
  }
  if (user.status !== 'active') {
    sessionRepository.delete(token);
    res.status(401).json({ success: false, error: '账号已停用' });
    return;
  }
  // 滑动续期：持续使用的会话自动延长，闲置的会话到期失效
  sessionRepository.touch(token);
  (req as any).user = user;
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const user = (req as any).user;
  if (!user || user.role !== 'admin') {
    res.status(403).json({ success: false, error: '需要管理员权限' });
    return;
  }
  next();
}

const authRouter: Router = Router();

authRouter.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ success: false, error: '请输入用户名和密码' });
    return;
  }

  const ipKey = clientIp(req);
  // 账号维度的键统一转小写，避免靠大小写变化重置计数
  const accountKey = String(username).toLowerCase();

  // 先查限流再校验口令：bcrypt 是 CPU 密集操作，放行到这一步之前挡住
  // 才能同时防住暴力破解和拿登录接口打单线程的资源耗尽
  const ipVerdict = loginIpLimiter.check(ipKey);
  if (!ipVerdict.allowed) {
    tooManyRequests(res, ipVerdict.retryAfter, '登录尝试过于频繁，请稍后再试');
    return;
  }
  const accountVerdict = loginAccountLimiter.check(accountKey);
  if (!accountVerdict.allowed) {
    tooManyRequests(res, accountVerdict.retryAfter, '该账号登录失败次数过多，请稍后再试');
    return;
  }

  const user = userRepository.getByName(String(username));
  if (!user || !bcrypt.compareSync(String(password), user.password)) {
    loginIpLimiter.hit(ipKey);
    loginAccountLimiter.hit(accountKey);
    res.status(401).json({ success: false, error: '用户名或密码错误' });
    return;
  }
  if (user.status !== 'active') {
    res.status(403).json({ success: false, error: '账号已停用，请联系管理员' });
    return;
  }
  const token = crypto.randomBytes(32).toString('hex');
  sessionRepository.create(user.id, token);
  // 认证成功，清空失败计数
  loginIpLimiter.reset(ipKey);
  loginAccountLimiter.reset(accountKey);
  res.json({ success: true, data: { token, username: user.username, role: user.role } });
});

authRouter.post('/logout', (req, res) => {
  const token = getTokenFromRequest(req);
  if (token) sessionRepository.delete(token);
  res.json({ success: true });
});

// 生成验证码
const CAPTCHA_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function generateCaptchaCode(): string {
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += CAPTCHA_CHARS[Math.floor(Math.random() * CAPTCHA_CHARS.length)];
  }
  return code;
}

function generateCaptchaSvg(code: string): string {
  const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'];
  let svg = `<svg width="120" height="40" xmlns="http://www.w3.org/2000/svg">`;
  // 背景
  svg += `<rect width="120" height="40" fill="#f1f5f9" rx="6"/>`;
  // 干扰线
  for (let i = 0; i < 4; i++) {
    const x1 = Math.random() * 120, y1 = Math.random() * 40;
    const x2 = Math.random() * 120, y2 = Math.random() * 40;
    svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${colors[Math.floor(Math.random() * colors.length)]}" stroke-width="1" opacity="0.3"/>`;
  }
  // 干扰点
  for (let i = 0; i < 20; i++) {
    const x = Math.random() * 120, y = Math.random() * 40;
    svg += `<circle cx="${x}" cy="${y}" r="1" fill="${colors[Math.floor(Math.random() * colors.length)]}" opacity="0.4"/>`;
  }
  // 文字
  for (let i = 0; i < code.length; i++) {
    const x = 18 + i * 25;
    const y = 26 + Math.random() * 6 - 3;
    const rotate = Math.random() * 30 - 15;
    const fontSize = 20 + Math.random() * 4;
    const color = colors[Math.floor(Math.random() * colors.length)];
    svg += `<text x="${x}" y="${y}" font-size="${fontSize}" fill="${color}" font-family="Arial, sans-serif" font-weight="bold" transform="rotate(${rotate} ${x} ${y})">${code[i]}</text>`;
  }
  svg += `</svg>`;
  return svg;
}

authRouter.get('/captcha', rateLimit(captchaLimiter, '验证码请求过于频繁，请稍后再试'), (_req, res) => {
  const code = generateCaptchaCode();
  const id = crypto.randomBytes(16).toString('hex');
  captchaRepository.create(id, code);
  const svg = generateCaptchaSvg(code);
  res.json({ success: true, data: { id, svg } });
});

// 注册
authRouter.post('/register', rateLimit(registerLimiter, '注册请求过于频繁，请稍后再试'), (req, res) => {
  const { email, password, captcha_id, captcha_code } = req.body;

  if (!email || !password) {
    res.status(400).json({ success: false, error: '请输入邮箱和密码' });
    return;
  }

  // 验证邮箱格式
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(String(email))) {
    res.status(400).json({ success: false, error: '邮箱格式不正确' });
    return;
  }

  // 验证密码长度
  if (String(password).length < 6) {
    res.status(400).json({ success: false, error: '密码至少需要 6 位' });
    return;
  }

  // 验证验证码
  if (!captcha_id || !captcha_code) {
    res.status(400).json({ success: false, error: '请输入验证码' });
    return;
  }
  const storedCode = captchaRepository.getAndDelete(String(captcha_id));
  if (!storedCode) {
    res.status(400).json({ success: false, error: '验证码已过期，请刷新' });
    return;
  }
  if (storedCode.toLowerCase() !== String(captcha_code).toLowerCase()) {
    res.status(400).json({ success: false, error: '验证码不正确' });
    return;
  }

  // 检查邮箱是否已注册
  const existing = userRepository.getByName(String(email));
  if (existing) {
    res.status(400).json({ success: false, error: '该邮箱已注册' });
    return;
  }

  // 创建用户（用邮箱作为用户名）
  const hashed = bcrypt.hashSync(String(password), 10);
  userRepository.create(String(email), hashed);

  res.json({ success: true, message: '注册成功，请登录' });
});

authRouter.get('/me', requireAuth, (req, res) => {
  const user = (req as any).user;
  res.json({ success: true, data: { username: user.username, role: user.role, timezone: user.timezone } });
});

authRouter.put('/settings', requireAuth, (req, res) => {
  const user = (req as any).user;
  const { new_username, new_password, current_password } = req.body;

  if (!current_password || !bcrypt.compareSync(String(current_password), user.password)) {
    res.status(403).json({ success: false, error: '当前密码不正确' });
    return;
  }

  if (new_username && new_username !== user.username) {
    const existing = userRepository.getByName(String(new_username));
    if (existing) {
      res.status(400).json({ success: false, error: '用户名已存在' });
      return;
    }
    userRepository.updateUsername(user.id, String(new_username));
  }

  if (new_password) {
    const hashed = bcrypt.hashSync(String(new_password), 10);
    userRepository.updatePassword(user.id, hashed);
  }

  res.json({ success: true, message: '设置已更新' });
});

export default authRouter;
