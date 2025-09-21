# 다수 Entity에 대한 HTML 오버레이 실시간 위치 업데이트

## 핵심 좌표 변환 API

### Cesium.SceneTransforms.worldToWindowCoordinates()
```typescript
const screenPos = Cesium.SceneTransforms.worldToWindowCoordinates(
  ViewerModel.getViewer()!.scene,
  pos  // Cesium.Cartesian3 world position
);
```
- **파일**: `CCTVCameraViewModel.ts:94`
- **입력**: Scene, Cartesian3 월드 좌표
- **출력**: Cartesian2 스크린 픽셀 좌표

## 다수 Entity 실시간 배치 업데이트

```typescript
registerPostRenderForScreenPositions() {
  this._postRenderCallback = () => {
    const positions: EntityScreenPosition[] = [];

    this._entities.forEach(entity => {
      const pos = entity.position?.getValue(ViewerModel.getViewer()!.clock.currentTime);

      if (pos) {
        const screenPos = Cesium.SceneTransforms.worldToWindowCoordinates(
          ViewerModel.getViewer()!.scene, pos
        );

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
  ViewerModel.getViewer()!.scene.postRender.addEventListener(this._postRenderCallback);
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

## 주요 Cesium API

| API | 용도 |
|-----|------|
| `SceneTransforms.worldToWindowCoordinates()` | 3D → 2D 변환 |
| `scene.postRender.addEventListener()` | 프레임별 업데이트 |
| `entity.position.getValue(currentTime)` | 시간 기반 위치 |