# Multi-stage build
FROM node:22.16.0-alpine3.22 AS builder

# Build arguments
ARG PROJECT_NAME=bump-svc3d-front-uaqms
ARG IS_CIVIL=false

WORKDIR /app

# Copy package files
COPY package*.json pnpm-lock.yaml ./

# Install pnpm and dependencies
RUN npm install -g pnpm
RUN pnpm install

# Copy source code
COPY . .

# Override VITE_BASE_PATH in .env.production based on PROJECT_NAME
RUN sed -i "s|^VITE_BASE_PATH=.*|VITE_BASE_PATH=\"/${PROJECT_NAME}/\"|" .env.production

# Build the project
RUN pnpm build

# Production stage
FROM nginx:alpine3.22

# Re-declare ARG for this stage
ARG IS_CIVIL=false

# Copy built files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy entrypoint script for runtime environment configuration
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Configure nginx for static file serving with simulation files path
RUN echo 'server { \
    listen 8080; \
    server_name _; \
    root /usr/share/nginx/html; \
    index index.html; \
    \
    # Static files (config.json, assets, etc.) \
    location / { \
        try_files $uri $uri/ /index.html; \
        add_header Cache-Control "public, max-age=3600"; \
    } \
    \
    # Simulation result files (JSON, CSV, GLB) \
    # Mount NFS or volume to /mnt/nfs at runtime \
    # Path: /bump-svc3d-front-pm/sim/{uuid}/Finedust_XXXX.{json|csv|glb} \
    location /sim/ { \
        alias /NDATA/output/; \
        autoindex off; \
        add_header Access-Control-Allow-Origin *; \
        add_header Cache-Control "public, max-age=3600"; \
    } \
}' > /etc/nginx/conf.d/default.conf

# Change nginx to listen on port 8080
RUN sed -i 's/listen       80;/listen       8080;/' /etc/nginx/nginx.conf

EXPOSE 8080

# Volume for simulation result files
VOLUME ["/NDATA/output"]

# Runtime environment variables (set from build ARG, can be overridden at container start)
ENV IS_CIVIL=${IS_CIVIL}

ENTRYPOINT ["/entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]