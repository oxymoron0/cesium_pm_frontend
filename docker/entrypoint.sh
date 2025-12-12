#!/bin/sh
set -e

# Runtime environment configuration for Docker/Kubernetes
# This script generates env-config.js from environment variables at container startup

ENV_CONFIG_PATH="/usr/share/nginx/html/env-config.js"

# Default values (used if environment variable is not set)
IS_CIVIL="${IS_CIVIL:-false}"

# Generate env-config.js
cat > "$ENV_CONFIG_PATH" << EOF
// Runtime environment configuration
// Generated at container startup - DO NOT EDIT MANUALLY
window.__ENV__ = {
  IS_CIVIL: ${IS_CIVIL}
};
EOF

echo "[entrypoint] Generated $ENV_CONFIG_PATH"
echo "[entrypoint] IS_CIVIL=${IS_CIVIL}"

# Execute the main container command (nginx)
exec "$@"
