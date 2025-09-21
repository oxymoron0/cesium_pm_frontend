import { useEffect, useRef, useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import { Entity } from 'cesium';
import * as Cesium from 'cesium';
import { stationStore } from '@/stores/StationStore';

/**
 * StationHtmlRenderer
 * DOM 직접 조작으로 성능 최적화한 정류장 HTML 오버레이 컴포넌트
 */
const StationHtmlRenderer = observer(() => {
  const containerRef = useRef<HTMLDivElement>(null);
  const stationElementsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const lastUpdateTime = useRef<number>(0);

  // 스테이션 태그 HTML 생성 함수
  const createStationTagHTML = useCallback((stationName: string, isSelected: boolean) => {
    const className = isSelected ? 'shadow-lg scale-110' : 'shadow-md';
    return `
      <div class="inline-flex justify-center items-center px-2 py-0.5 rounded-[26.87px] border border-[#F12124] bg-white/90 ${className}">
        <span class="text-[#DC5449] text-center font-bold text-xs leading-normal tracking-[-0.36px]" style="font-family: Pretendard">
          ${stationName}
        </span>
      </div>
    `;
  }, []);

  // 정류장 Element 생성/업데이트
  const createOrUpdateStationElement = useCallback((
    entityId: string,
    stationName: string,
    isSelected: boolean,
    left: number,
    top: number
  ) => {
    let element = stationElementsRef.current.get(entityId);

    if (!element) {
      // 새 엘리먼트 생성
      element = document.createElement('div');
      element.style.position = 'absolute';
      element.style.pointerEvents = 'none';
      element.style.transform = 'translateX(-50%)';
      element.style.whiteSpace = 'nowrap';
      element.style.overflow = 'visible';
      element.innerHTML = createStationTagHTML(stationName, isSelected);

      stationElementsRef.current.set(entityId, element);
      containerRef.current?.appendChild(element);
    } else {
      // 선택 상태가 변경된 경우에만 HTML 업데이트
      const currentIsSelected = element.innerHTML.includes('scale-110');
      if (currentIsSelected !== isSelected) {
        element.innerHTML = createStationTagHTML(stationName, isSelected);
      }
    }

    // 위치 업데이트 (매 프레임) - Billboard 중심 아래로 정확히 위치
    element.style.left = `${left}px`; // 중심 정렬을 위해 translateX(-50%) 사용
    element.style.top = `${top}px`; // Billboard 바로 아래 5px 간격
    element.style.zIndex = isSelected ? '1510' : '1500';
  }, [createStationTagHTML]);

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
                    const isSelected = stationStore.isStationSelected(stationId);
                    const stationName = entity.name || stationId;

                    currentEntityIds.add(entity.id);
                    createOrUpdateStationElement(entity.id, stationName, isSelected, screenPosition.x, screenPosition.y);
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