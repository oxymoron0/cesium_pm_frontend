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

# Create simulation files mount point
RUN mkdir -p /mnt/nfs

# Configure nginx for static file serving with simulation files path
RUN echo 'server { \
    listen 8080; \
    server_name _; \
    root /usr/share/nginx/html; \
    \
    # Simulation result files (JSON, CSV, GLB) \
    # Mount NFS or volume to /mnt/nfs at runtime \
    # Path: /bump-svc3d-front-pm/sim/{uuid}/Finedust_XXXX.{json|csv|glb} \
    location /sim/ { \
        alias /mnt/nfs/; \
        autoindex off; \
        add_header Access-Control-Allow-Origin *; \
        add_header Cache-Control "public, max-age=3600"; \
    } \
}' > /etc/nginx/conf.d/default.conf

# Change nginx to listen on port 8080
RUN sed -i 's/listen       80;/listen       8080;/' /etc/nginx/nginx.conf

EXPOSE 8080

# Volume for simulation result files
VOLUME ["/mnt/nfs"]

CMD ["nginx", "-g", "daemon off;"]