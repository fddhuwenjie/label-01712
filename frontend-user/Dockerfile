# 使用跨平台 nginx 镜像 (支持 ARM 和 X86)
FROM --platform=$BUILDPLATFORM nginx:alpine

# 设置工作目录
WORKDIR /usr/share/nginx/html

# 删除默认的 nginx 静态文件
RUN rm -rf ./*

# 复制项目文件
COPY . .

# 复制 nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 暴露端口
EXPOSE 80

# 启动 nginx
CMD ["nginx", "-g", "daemon off;"]
