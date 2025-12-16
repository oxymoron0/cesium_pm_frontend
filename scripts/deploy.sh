#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="${1:-${PROJECT_DIR}/.env.local}"

# Read SIM_LOCAL_PATH from env file
SIM_LOCAL_PATH=$(grep -E '^SIM_LOCAL_PATH=' "$ENV_FILE" | cut -d'=' -f2)
if [ -z "$SIM_LOCAL_PATH" ]; then
    echo "Error: SIM_LOCAL_PATH not found in $ENV_FILE"
    exit 1
fi

echo "Stopping existing container..."
docker stop pm-frontend-test 2>/dev/null || true
docker rm pm-frontend-test 2>/dev/null || true

echo "Building new image..."
docker build -t pm-frontend .

echo "Starting new container..."
# docker run -d --name pm-frontend-test -p 17000:8080 -v "${SIM_LOCAL_PATH}:${SIM_LOCAL_PATH}" pm-frontend
docker run -d -e IS_CIVIL=true --name pm-frontend-test -p 17000:8080 -v "${SIM_LOCAL_PATH}:${SIM_LOCAL_PATH}" pm-frontend

echo "Deployment complete. Container status:"
docker ps | grep pm-frontend-test
