#!/bin/sh
set -e

# Runtime configuration for Docker/Kubernetes
# Generates config.json from environment variables at container startup

CONFIG_PATH="/usr/share/nginx/html/config.json"

# Default values (used if environment variable is not set)
IS_CIVIL="${IS_CIVIL:-false}"

# Generate config.json
cat > "$CONFIG_PATH" << EOF
{
  "isCivil": ${IS_CIVIL}
}
EOF

echo "[entrypoint] Generated $CONFIG_PATH"
echo "[entrypoint] isCivil=${IS_CIVIL}"

# Execute the main container command (nginx)
exec "$@"
