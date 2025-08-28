# Multi-stage build
FROM node:22.16.0-alpine3.22 AS builder

WORKDIR /app

# Copy package files
COPY package*.json pnpm-lock.yaml ./

# Install pnpm and dependencies
RUN npm install -g pnpm
RUN pnpm install

# Copy source code
COPY . .

# Build the project
RUN pnpm build

# Production stage
FROM nginx:alpine3.22

# Copy built files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Configure nginx for simple static file serving
RUN echo 'server { \
    listen 8080; \
    server_name _; \
    root /usr/share/nginx/html; \
}' > /etc/nginx/conf.d/default.conf

# Change nginx to listen on port 8080
RUN sed -i 's/listen       80;/listen       8080;/' /etc/nginx/nginx.conf

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]