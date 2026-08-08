# pnpm 11 要求 Node >= 22.13；Node 18 亦已 EOL，不再收到安全补丁
FROM node:22-slim

# 安装 better-sqlite3 编译依赖
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# 启用 corepack 并锁定 pnpm 版本（与 package.json 的 packageManager 保持一致）
RUN corepack enable && corepack prepare pnpm@11.20.0 --activate

WORKDIR /app

# 先复制根级依赖清单
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# 复制后端源码
COPY tsconfig.json ./
COPY src/ ./src/

# 复制前端源码（workspace 成员）
COPY web/package.json ./web/
COPY web/index.html ./web/
COPY web/vite.config.ts ./web/
COPY web/tsconfig.json ./web/
COPY web/tsconfig.app.json ./web/
COPY web/tsconfig.node.json ./web/
COPY web/src/ ./web/src/

# 按 lockfile 精确安装整个 workspace
RUN pnpm install --frozen-lockfile

# 先构建前端（Vite → dist/public/）
RUN pnpm --filter web run build

# 再构建后端（tsc → dist/）
RUN pnpm run build

# 暴露端口
EXPOSE 3000

# 数据持久化目录
VOLUME ["/app/data"]

# 启动
CMD ["node", "dist/index.js"]
