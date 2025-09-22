import { useEffect, useRef, useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import { Entity } from 'cesium';
import * as Cesium from 'cesium';
import { stationStore } from '@/stores/StationStore';
import { stationSensorStore } from '@/stores/StationSensorStore';

/**
 * StationHtmlRenderer
 * DOM 직접 조작으로 성능 최적화한 정류장 HTML 오버레이 컴포넌트
 */
const StationHtmlRenderer = observer(() => {
  const containerRef = useRef<HTMLDivElement>(null);
  const stationElementsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const lastUpdateTime = useRef<number>(0);

  // 스테이션 태그 HTML 생성 함수
  const createStationTagHTML = useCallback((
    stationName: string,
    stationId: string,
    routeName: string,
    direction: 'inbound' | 'outbound'
  ) => {
    // stationRenderer.ts와 동일한 활성/비활성 로직
    const isSelected = stationStore.isStationSelected(stationId);
    const isRouteSelected = stationStore.selectedRouteName === routeName;
    const isDirectionSelected = stationStore.selectedDirection === direction;

    // 활성 상태 판단: 선택된 정류장이거나 활성 상태의 노선+방향
    const isActive = isSelected || (isRouteSelected && isDirectionSelected);

    // 스타일 클래스
    const scaleClass = isSelected ? 'scale-110' : '';
    const shadowClass = isSelected ? 'shadow-lg' : 'shadow-md';

    // 색상 스키마: 활성 상태는 빨간색, 비활성 상태는 회색
    const borderColor = isActive ? '#F12124' : '#888888';
    const textColor = isActive ? '#DC5449' : '#666666';
    const bgOpacity = isActive ? 'bg-white/90' : 'bg-white/70';

    return `
      <div class="inline-flex justify-center items-center px-2 py-0.5 rounded-[26.87px] border ${bgOpacity} ${shadowClass} ${scaleClass}" style="border-color: ${borderColor}; pointer-events: none; user-select: none; -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none;">
        <span class="text-center font-bold text-xs leading-normal tracking-[-0.36px]" style="color: ${textColor}; font-family: Pretendard">
          ${stationName}
        </span>
      </div>
    `;
  }, []);

  // 정류장 Element 생성/업데이트
  const createOrUpdateStationElement = useCallback((
    entityId: string,
    stationName: string,
    stationId: string,
    routeName: string,
    direction: 'inbound' | 'outbound',
    left: number,
    top: number
  ) => {
    let element = stationElementsRef.current.get(entityId);

    // 현재 상태 계산 (stationRenderer.ts와 동일한 로직)
    const isSelected = stationStore.isStationSelected(stationId);
    const isRouteSelected = stationStore.selectedRouteName === routeName;
    const isDirectionSelected = stationStore.selectedDirection === direction;
    const isActive = isSelected || (isRouteSelected && isDirectionSelected);

    if (!element) {
      // 새 엘리먼트 생성
      element = document.createElement('div');
      element.style.position = 'absolute';
      element.style.pointerEvents = 'auto'; // 호버 이벤트를 위해 활성화
      element.style.transform = 'translateX(-50%)';
      element.style.whiteSpace = 'nowrap';
      element.style.overflow = 'visible';
      element.innerHTML = createStationTagHTML(stationName, stationId, routeName, direction);

      // 호버 이벤트 핸들러 추가
      element.addEventListener('mouseenter', () => {
        stationSensorStore.setHoveredStation(stationId);
      });

      element.addEventListener('mouseleave', () => {
        stationSensorStore.clearHoveredStation();
      });

      stationElementsRef.current.set(entityId, element);
      containerRef.current?.appendChild(element);
    } else {
      // 상태 변경 감지: 선택 상태, 활성 상태, 또는 활성/비활성 상태 변경 시 HTML 업데이트
      const currentIsSelected = element.innerHTML.includes('scale-110');
      const currentIsActive = element.innerHTML.includes('#F12124'); // 빨간색 테두리 확인

      if (currentIsSelected !== isSelected || currentIsActive !== isActive) {
        element.innerHTML = createStationTagHTML(stationName, stationId, routeName, direction);
      }
    }

    // 위치 업데이트 (매 프레임) - Billboard 중심 아래로 정확히 위치
    element.style.left = `${left}px`; // 중심 정렬을 위해 translateX(-50%) 사용
    element.style.top = `${top}px`; // Billboard 바로 아래 5px 간격
    element.style.zIndex = isActive ? '1500' : '1499';
  }, []);

  // 60fps 제한을 위한 스로틀링
  const updateStationPositions = useCallback(() => {
    const now = performance.now();
    if (now - lastUpdateTime.current < 16) return; // ~60fps
    lastUpdateTime.current = now;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const viewer = (window as unknown as { cviewer: { scene: any; clock: any; dataSources: any } }).cviewer;
      if (!viewer || !viewer.scene || !viewer.clock || !containerRef.current) return;

      const currentEntityIds = new Set<string>();

      // 모든 stations_ DataSource를 순회하여 Entity 찾기
      for (let i = 0; i < viewer.dataSources.length; i++) {
        const dataSource = viewer.dataSources.get(i);

        if (dataSource?.name?.startsWith('stations_') && dataSource.show && dataSource.entities) {
          // DataSource 이름에서 route와 direction 추출: "stations_routeName_direction"
          const nameParts = dataSource.name.split('_');
          if (nameParts.length !== 3) continue;

          const routeName = nameParts[1];
          const direction = nameParts[2] as 'inbound' | 'outbound';

          const entities = dataSource.entities.values;
          if (!entities) continue;

          entities.forEach((entity: Entity) => {
            try {
              if (entity.id?.startsWith('station_') && entity.billboard) {
                // Billboard의 실제 화면 위치 계산 (terrain-clamped position)
                const billboard = entity.billboard;
                const entityPosition = entity.position?.getValue(viewer.clock.currentTime);

                if (entityPosition) {
                  // Billboard가 CLAMP_TO_GROUND인 경우, 실제 terrain 높이 적용된 위치를 계산
                  let actualPosition = entityPosition;

                  if (billboard.heightReference?.getValue(viewer.clock.currentTime) === Cesium.HeightReference.CLAMP_TO_GROUND) {
                    // Billboard Entity의 실제 position 값을 사용 (이미 terrain 높이가 적용됨)
                    actualPosition = entityPosition;
                  }

                  // terrain-clamped position을 화면 좌표로 변환
                  const screenPosition = viewer.scene.cartesianToCanvasCoordinates(actualPosition);

                  if (screenPosition &&
                      screenPosition.x >= -100 && screenPosition.x <= window.innerWidth + 100 &&
                      screenPosition.y >= -50 && screenPosition.y <= window.innerHeight - 50) {

                    const stationId = entity.id.replace('station_', '');
                    const stationName = entity.name || stationId;

                    currentEntityIds.add(entity.id);
                    createOrUpdateStationElement(entity.id, stationName, stationId, routeName, direction, screenPosition.x, screenPosition.y);
                  }
                }
              }
            } catch {
              // 개별 Entity 처리 오류는 무시
            }
          });
        }
      }

      // 더 이상 표시되지 않는 Entity 제거
      stationElementsRef.current.forEach((element, entityId) => {
        if (!currentEntityIds.has(entityId)) {
          element.remove();
          stationElementsRef.current.delete(entityId);
        }
      });

    } catch (error) {
      console.error('[StationHtmlRenderer] Position update error:', error);
    }
  }, [createOrUpdateStationElement]);

  useEffect(() => {
    let postRenderCallback: (() => void) | null = null;

    // postRender 이벤트 등록
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const viewer = (window as unknown as { cviewer: { scene: { postRender: any } } }).cviewer;
    if (viewer && viewer.scene && viewer.scene.postRender) {
      postRenderCallback = updateStationPositions;
      try {
        viewer.scene.postRender.addEventListener(postRenderCallback);
        console.log('[StationHtmlRenderer] PostRender callback registered successfully');
      } catch (error) {
        console.error('[StationHtmlRenderer] Failed to register postRender callback:', error);
      }
    }

    // 컴포넌트 언마운트 시 정리
    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const currentViewer = (window as unknown as { cviewer: { scene: { postRender: any } } }).cviewer;
      if (currentViewer && currentViewer.scene && currentViewer.scene.postRender && postRenderCallback) {
        try {
          currentViewer.scene.postRender.removeEventListener(postRenderCallback);
          console.log('[StationHtmlRenderer] PostRender callback removed successfully');
        } catch (error) {
          console.error('[StationHtmlRenderer] Failed to remove postRender callback:', error);
        }
      }

      // 모든 DOM 요소 정리
      stationElementsRef.current.forEach(element => element.remove());
      stationElementsRef.current.clear();
    };
  }, [updateStationPositions]);

  return (
    <div
      ref={containerRef}
      className="absolute top-0 left-0 z-10 w-full h-full overflow-visible pointer-events-none whitespace-nowrap"
      style={{ overflow: 'visible' }}
    />
  );
});

StationHtmlRenderer.displayName = 'StationHtmlRenderer';

export default StationHtmlRenderer;