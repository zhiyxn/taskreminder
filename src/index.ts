import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { startScheduler } from './scheduler';
import routes from './routes';
import authRouter, { requireAuth } from './auth';
import { sessionRepository } from './db';

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// 限流按 req.ip 分组，其取值取决于 trust proxy 设置：
//   未设置        —— 用 TCP 源地址。直接暴露时正确；反向代理后所有请求会算作同一个 IP
//   TRUST_PROXY=1 —— 信任最靠近的一层代理的 X-Forwarded-For（Nginx/Traefik 等常见情形）
// 默认关闭：开启后若代理层未覆写 X-Forwarded-For，客户端就能伪造 IP 绕过限流。
const trustProxyEnv = process.env.TRUST_PROXY;
if (trustProxyEnv) {
  const numeric = Number(trustProxyEnv);
  app.set('trust proxy', Number.isInteger(numeric) ? numeric : trustProxyEnv);
}

const publicDir = require("fs").existsSync(path.join(__dirname, "public"))
  ? path.join(__dirname, "public")
  : path.join(__dirname, "..", "src", "public");

app.use(cors());
app.use(express.json());

// Auth routes (no auth required)
app.use('/api/auth', authRouter);

// Protected API routes
app.use('/api', requireAuth, routes);

// Static files
app.use(express.static(publicDir));

app.get('/', (_req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🚀 事项提醒服务已启动: http://localhost:${PORT}`);
  console.log('─'.repeat(50));
  startScheduler();

  // 清理过期会话：启动时一次，之后每小时一次
  const purgeSessions = () => {
    const removed = sessionRepository.deleteExpired();
    if (removed > 0) console.log(`🧹 已清理 ${removed} 个过期会话`);
  };
  purgeSessions();
  setInterval(purgeSessions, 60 * 60 * 1000).unref();

  console.log('─'.repeat(50));
});
