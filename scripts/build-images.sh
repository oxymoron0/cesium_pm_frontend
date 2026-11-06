#!/bin/bash
# 반출용 이미지 빌드 및 tar 생성
#
# 산출물: docker-images/<프로젝트명>.tar   (tar 파일명 = 프로젝트명)
#   이미지 태그는 <프로젝트명>:latest
#   - bump-svc3d-front-uaqms.tar         행정  → bump-svc3d-front-uaqms:latest
#   - bump-svc3d-front-uaqms-public.tar  대민  → bump-svc3d-front-uaqms-public:latest (IS_CIVIL=true)
#
# 기본값은 .env.production 을 따른다.
# 사용법: scripts/build-images.sh [admin|civil]   (인자 없으면 둘 다)
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

ENV_FILE="$PROJECT_DIR/.env.production"
OUT_DIR="$PROJECT_DIR/docker-images"

if [ ! -f "$ENV_FILE" ]; then
    echo "Error: $ENV_FILE not found"
    exit 1
fi

# .env.production 에서 기본 프로젝트명 추출 (VITE_BASE_PATH="/<name>/" 형식)
read_path() {
    grep -E "^$1=" "$ENV_FILE" | head -1 | cut -d'=' -f2- | tr -d '"' | tr -d "'"
}
path_to_name() {
    echo "$1" | sed 's|^/||; s|/$||'
}

ADMIN_NAME=$(path_to_name "$(read_path VITE_BASE_PATH)")
CIVIL_NAME=$(path_to_name "$(read_path VITE_CIVIL_BASE_PATH)")

if [ -z "$ADMIN_NAME" ] || [ -z "$CIVIL_NAME" ]; then
    echo "Error: VITE_BASE_PATH / VITE_CIVIL_BASE_PATH not found in $ENV_FILE"
    exit 1
fi

mkdir -p "$OUT_DIR"

# build_image <프로젝트명> <IS_CIVIL>
#   이미지 태그 = <프로젝트명>:latest, tar 파일명 = <프로젝트명>.tar
build_image() {
    local name="$1"
    local is_civil="$2"
    local tag="${name}:latest"

    echo "=============================================="
    echo " Building: $tag  (IS_CIVIL=$is_civil)"
    echo "=============================================="

    docker build \
        --build-arg PROJECT_NAME="$name" \
        --build-arg IS_CIVIL="$is_civil" \
        -t "$tag" \
        .

    echo "Saving: $OUT_DIR/$name.tar  (image: $tag)"
    docker save "$tag" -o "$OUT_DIR/$name.tar"
    ls -lh "$OUT_DIR/$name.tar"
}

TARGET="${1:-all}"
case "$TARGET" in
    admin)  build_image "$ADMIN_NAME" false ;;
    civil)  build_image "$CIVIL_NAME" true ;;
    all)    build_image "$ADMIN_NAME" false
            build_image "$CIVIL_NAME" true ;;
    *)      echo "Usage: $0 [admin|civil|all]"; exit 1 ;;
esac

echo
echo "Build complete:"
ls -lh "$OUT_DIR"
