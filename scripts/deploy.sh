#!/bin/bash
set -e

echo "Stopping existing container..."
docker stop pm-frontend-test 2>/dev/null || true
docker rm pm-frontend-test 2>/dev/null || true

echo "Building new image..."
docker build -t pm-frontend .

echo "Starting new container..."
docker run -d --name pm-frontend-test -p 17000:8080 pm-frontend

echo "Deployment complete. Container status:"
docker ps | grep pm-frontend-test