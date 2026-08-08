# pnpm 11 要求 Node >= 22.13；Node 18 亦已 EOL，不再收到安全补丁
FROM node:22-slim

# 安装 better-sqlite3 编译依赖
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# 启用 corepack 并锁定 pnpm 版本（与 package.json 的 packageManager 保持一致）
RUN corepack enable && corepack prepare pnpm@11.20.0 --activate

WORKDIR /app

# 先复制依赖清单，利用 Docker 缓存层。
# pnpm-workspace.yaml 里含 allowBuilds，缺失会导致 better-sqlite3 跳过原生编译
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# 按 lockfile 精确安装；与 package.json 不一致时直接失败，而非静默改写锁文件
RUN pnpm install --frozen-lockfile

# 复制源码并编译
COPY tsconfig.json ./
COPY src/ ./src/

RUN pnpm run build

# 暴露端口
EXPOSE 3000

# 数据持久化目录
VOLUME ["/app/data"]

# 启动
CMD ["node", "dist/index.js"]
