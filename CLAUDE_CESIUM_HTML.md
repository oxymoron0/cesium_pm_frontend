# 다수 Entity에 대한 HTML 오버레이 실시간 위치 업데이트

## 핵심 좌표 변환 API

### viewer.scene.cartesianToCanvasCoordinates()
```typescript
const screenPos = viewer.scene.cartesianToCanvasCoordinates(entityPosition);
```
- **입력**: Cartesian3 월드 좌표
- **출력**: Cartesian2 스크린 픽셀 좌표
- **권장**: 직접 terrain 계산 없이 사용

## 다수 Entity 실시간 배치 업데이트

```typescript
registerPostRenderForScreenPositions() {
  this._postRenderCallback = () => {
    const positions: EntityScreenPosition[] = [];

    this._entities.forEach(entity => {
      const pos = entity.position?.getValue(viewer.clock.currentTime);

      if (pos) {
        const screenPos = viewer.scene.cartesianToCanvasCoordinates(pos);

        if (screenPos) {
          positions.push({
            id: entity.id as string,
            left: screenPos.x,
            top: screenPos.y,
            props: entity.props
          });
        }
      }
    });

    // React 상태 일괄 업데이트
    if (this._onScreenPositionsUpdate) {
      this._onScreenPositionsUpdate(positions);
    }
  };

  // 매 프레임마다 모든 Entity 위치 계산
  viewer.scene.postRender.addEventListener(this._postRenderCallback);
}
```
**파일**: `CCTVCameraViewModel.ts:81-110`

## Entity 컬렉션 관리

```typescript
// Entity 생성 및 컬렉션 추가
addPointToDataSource(LayerId: string, id: string, position: Cesium.Cartesian3) {
  const entity = dataSource.entities.add({
    id,
    position,
    point: { color: Cesium.Color.CYAN }
  });

  this._entities.push(entity);  // 추적 대상 배열에 추가
  return entity;
}
```
**파일**: `DatasourcesModel.ts:55-59`

## HTML 배치 렌더링

```typescript
const CCTVOverlay = observer(() => {
  const [positions, setPositions] = useState<EntityScreenPosition[]>([]);

  useEffect(() => {
    // 배치 업데이트 콜백 등록
    CCTVCameraViewModel.setScreenPositionsUpdateCallback(setPositions);
    CCTVCameraViewModel.registerPostRenderForScreenPositions();

    return () => {
      CCTVCameraViewModel.unregisterPostRenderForScreenPositions();
    };
  }, []);

  return (
    <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
      {positions.map(({ id, left, top, props }) => (
        <OverlayLabel
          key={id}
          left={left}
          top={top}
          screenWidth={window.innerWidth}
          {...props}
        />
      ))}
    </div>
  );
});
```
**파일**: `CCTVOverlay.tsx`

## 절대 위치 스타일링

```typescript
style={{
  position: 'absolute',
  left: left,           // Cesium 변환 X 좌표
  top: top + 50,        // Y 좌표 + 오프셋
  pointerEvents: 'auto'
}}
```
**파일**: `OverlayLabel.tsx:53-61`

## 핵심 처리 방식

1. **Entity 컬렉션**: `_entities` 배열로 모든 Entity 추적
2. **배치 변환**: `postRender` 이벤트에서 `forEach`로 일괄 처리
3. **일괄 업데이트**: `positions` 배열로 React 상태 한 번에 업데이트
4. **컴포넌트 렌더링**: `map()`으로 각 Entity별 HTML 요소 생성

## Terrain Height 처리

### CLAMP_TO_GROUND Entity의 한계

**문제점**: `HeightReference.CLAMP_TO_GROUND`를 사용한 Entity는 실제 terrain 높이를 직접 제공하지 않음

```typescript
// ❌ Entity의 height는 항상 원래 Z값 (terrain 높이 아님)
const entityPosition = entity.position?.getValue(viewer.clock.currentTime)
const cartographic = Cartographic.fromCartesian(entityPosition)
const height = cartographic.height // 0 (원래 값), terrain 높이 아님
```

### HTMLRenderer에서 Terrain Height 계산

**올바른 패턴**: Entity Position → Coordinate 추출 → Terrain Height 조회
```typescript
const updateEntityPositions = () => {
  entities.forEach(entity => {
    const entityPosition = entity.position?.getValue(viewer.clock.currentTime)

    if (entityPosition) {
      // Step 1: Entity에서 좌표 추출
      const cartographic = Cartographic.fromCartesian(entityPosition)
      const longitude = Cesium.Math.toDegrees(cartographic.longitude)
      const latitude = Cesium.Math.toDegrees(cartographic.latitude)

      // Step 2: 실제 terrain 높이 계산 (캐시 활용)
      const terrainHeight = getTerrainHeight(longitude, latitude)

      // Step 3: Terrain-aware position으로 화면 좌표 계산
      const terrainPosition = Cartesian3.fromDegrees(longitude, latitude, terrainHeight)
      const screenPosition = viewer.scene.cartesianToCanvasCoordinates(terrainPosition)

      // Step 4: HTML 요소 위치 업데이트
      updateHtmlElement(entity.id, screenPosition.x, screenPosition.y)
    }
  })
}
```

### Performance: Terrain Height Caching

**필수 패턴**: 동일 좌표 재계산 방지
```typescript
const terrainHeightCache = new Map<string, number>()

const getTerrainHeight = (longitude: number, latitude: number): number => {
  const key = `${longitude.toFixed(6)}_${latitude.toFixed(6)}`

  if (terrainHeightCache.has(key)) {
    return terrainHeightCache.get(key)!
  }

  // scene.globe.getHeight()는 로컬 데이터 사용 (네트워크 요청 없음)
  const cartographic = Cartographic.fromDegrees(longitude, latitude)
  const height = viewer.scene.globe.getHeight(cartographic) || 0

  terrainHeightCache.set(key, height)
  return height
}
```

### 성능 최적화 주의사항

**피해야 할 패턴**: 매 프레임 terrain API 호출
```typescript
// ❌ 매 프레임마다 네트워크 요청 (초당 180건+)
await sampleTerrainMostDetailed(viewer.terrainProvider, [cartographic])

// ❌ 렌더링 루프에서 heightReference 쿼리
if (billboard.heightReference?.getValue(viewer.clock.currentTime) === Cesium.HeightReference.CLAMP_TO_GROUND) {
  // 매 프레임마다 terrain 계산 트리거
}

// ✅ 대신 Entity position 직접 사용
const screenPosition = viewer.scene.cartesianToCanvasCoordinates(entityPosition)
```

## 주요 Cesium API

| API | 용도 | 비고 |
|-----|------|------|
| `viewer.scene.cartesianToCanvasCoordinates()` | 3D → 2D 변환 | Terrain 계산 없이 빠른 변환 |
| `viewer.scene.globe.getHeight()` | Terrain 높이 조회 | 로컬 데이터, 네트워크 요청 없음 |
| `viewer.scene.postRender.addEventListener()` | 프레임별 업데이트 | 60fps 렌더링 동기화 |
| `entity.position.getValue(currentTime)` | 시간 기반 위치 | CLAMP_TO_GROUND Entity 좌표 추출 |