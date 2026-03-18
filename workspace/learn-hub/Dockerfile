FROM node:20-alpine

WORKDIR /app

# 安装依赖
COPY server/package*.json ./
RUN npm ci --only=production

# 复制后端代码
COPY server/src ./src

# 创建数据目录
RUN mkdir -p data uploads

# 暴露端口
EXPOSE 3000

# 启动
CMD ["node", "src/index.js"]
