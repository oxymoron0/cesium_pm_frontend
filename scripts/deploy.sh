#!/bin/bash
echo "Stopping existing container..."
docker stop pm-frontend-test 2>/dev/null || true
docker rm pm-frontend-test 2>/dev/null || true
docker stop pm-frontend-test-civil 2>/dev/null || true
docker rm pm-frontend-test-civil 2>/dev/null || true

echo "Starting new container..."
docker run -d --name pm-frontend-test -p 17000:8080 -v "/NDATA/output:/NDATA/output" bump-svc3d-front-uaqms
docker run -d -e IS_CIVIL=true --name pm-frontend-test-civil -p 17006:8080 -v "/NDATA/output:/NDATA/output" bump-svc3d-front-uaqms-public

echo "Deployment complete. Container status:"
docker ps | grep pm-frontend-test
