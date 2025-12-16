#!/bin/sh
set -e

# Runtime configuration for Docker/Kubernetes
# Generates config.json from environment variables at container startup

CONFIG_PATH="/usr/share/nginx/html/config.json"

# Default values (used if environment variable is not set)
IS_CIVIL="${IS_CIVIL:-false}"
BASE_PATH="${BASE_PATH:-/bump-svc3d-front-pm/}"
CIVIL_BASE_PATH="${CIVIL_BASE_PATH:-/bump-svc3d-front-pm-public/}"

# Select base path based on IS_CIVIL
if [ "$IS_CIVIL" = "true" ]; then
  SELECTED_BASE_PATH="$CIVIL_BASE_PATH"
else
  SELECTED_BASE_PATH="$BASE_PATH"
fi

# Generate config.json
cat > "$CONFIG_PATH" << EOF
{
  "isCivil": ${IS_CIVIL},
  "basePath": "${SELECTED_BASE_PATH}"
}
EOF

echo "[entrypoint] Generated $CONFIG_PATH"
echo "[entrypoint] isCivil=${IS_CIVIL}"
echo "[entrypoint] basePath=${SELECTED_BASE_PATH}"

# Execute the main container command (nginx)
exec "$@"
