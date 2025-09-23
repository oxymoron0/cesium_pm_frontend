import { useEffect, useRef, useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import { Entity } from 'cesium';
import * as Cesium from 'cesium';
import { stationSensorStore } from '@/stores/StationSensorStore';

/**
 * StationSensorRenderer
 * DOM 직접 조작으로 성능 최적화한 정류장 센서 오버레이 컴포넌트
 * StationHtmlRenderer와 유사한 패턴으로 구현
 */
const StationSensorRenderer = observer(() => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sensorElementsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const lastUpdateTime = useRef<number>(0);

  // 센서 색상 로직 (SensorItem.tsx와 동일)
  const getSensorColor = useCallback((type: 'pm10' | 'pm25' | 'vocs', value: number): string => {
    if (type === 'vocs') return '#999';

    if (type === 'pm10') {
      if (value <= 30) return '#18A274';
      if (value <= 80) return '#FFD040';
      if (value <= 150) return '#F70';
      return '#D32F2D';
    }

    if (type === 'pm25') {
      if (value <= 15) return '#18A274';
      if (value <= 35) return '#FFD040';
      if (value <= 75) return '#F70';
      return '#D32F2D';
    }

    return '#999';
  }, []);

  // 센서 HTML 생성 함수
  const createSensorHTML = useCallback((sensorData: { pm10: number; pm25: number; vocs: number } | undefined) => {
    const pm10Display = sensorData ? sensorData.pm10.toString() : '---';
    const pm25Display = sensorData ? sensorData.pm25.toString() : '---';
    const vocsDisplay = sensorData ? sensorData.vocs.toString() : '---';

    const pm10Color = sensorData ? getSensorColor('pm10', sensorData.pm10) : '#999';
    const pm25Color = sensorData ? getSensorColor('pm25', sensorData.pm25) : '#999';
    const vocsColor = sensorData ? getSensorColor('vocs', sensorData.vocs) : '#999';

    return `
      <div style="display: flex; padding: 8px; flex-direction: row; justify-content: center; align-items: center; border-radius: 4px; background: rgba(30, 30, 30, 0.90);">
        <div style="display: flex; width: 60px; flex-direction: column; align-items: center; gap: 4px;">
          <div style="color: #FFF; text-align: center; font-family: Pretendard; font-size: 10px; font-weight: 400;">미세먼지</div>
          <div style="color: ${pm10Color}; text-align: center; font-family: Pretendard; font-size: 24px; font-weight: 800; letter-spacing: -0.8px;">${pm10Display}</div>
        </div>
        <div style="display: flex; width: 60px; flex-direction: column; align-items: center; gap: 4px;">
          <div style="color: #FFF; text-align: center; font-family: Pretendard; font-size: 10px; font-weight: 400;">초미세먼지</div>
          <div style="color: ${pm25Color}; text-align: center; font-family: Pretendard; font-size: 24px; font-weight: 800; letter-spacing: -0.8px;">${pm25Display}</div>
        </div>
        <div style="display: flex; width: 60px; flex-direction: column; align-items: center; gap: 4px;">
          <div style="color: #FFF; text-align: center; font-family: Pretendard; font-size: 10px; font-weight: 400;">VOCs</div>
          <div style="color: ${vocsColor}; text-align: center; font-family: Pretendard; font-size: 24px; font-weight: 800; letter-spacing: -0.8px;">${vocsDisplay}</div>
        </div>
      </div>
    `;
  }, [getSensorColor]);

  // 센서 Element 생성/업데이트
  const createOrUpdateSensorElement = useCallback((
    entityId: string,
    stationId: string,
    left: number,
    top: number
  ) => {
    let element = sensorElementsRef.current.get(entityId);

    // 센서 데이터 조회
    const sensorData = stationSensorStore.getSensorData(stationId);

    if (!element) {
      // 새 엘리먼트 생성
      element = document.createElement('div');
      element.style.position = 'absolute';
      element.style.pointerEvents = 'none';
      element.style.transform = 'translateX(-50%)';
      element.style.whiteSpace = 'nowrap';
      element.style.overflow = 'visible';
      element.innerHTML = createSensorHTML(sensorData);

      sensorElementsRef.current.set(entityId, element);
      containerRef.current?.appendChild(element);
    } else {
      // 기존 엘리먼트 업데이트 (필요한 경우에만)
      element.innerHTML = createSensorHTML(sensorData);
    }

    // 위치 업데이트 (매 프레임) - Billboard 중심 아래로 정확히 위치
    element.style.left = `${left}px`;
    element.style.top = `${top + 30}px`;
    element.style.zIndex = '1520';
  }, [createSensorHTML]);

  // 60fps 제한을 위한 스로틀링
  const updateSensorPositions = useCallback(() => {
    const now = performance.now();
    if (now - lastUpdateTime.current < 16) return; // ~60fps
    lastUpdateTime.current = now;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const viewer = (window as unknown as { cviewer: { scene: any; clock: any; dataSources: any } }).cviewer;
      if (!viewer || !viewer.scene || !viewer.clock || !containerRef.current) return;

      const currentEntityIds = new Set<string>();

      // 모든 stations_ 및 search_stations DataSource를 순회하여 Entity 찾기
      for (let i = 0; i < viewer.dataSources.length; i++) {
        const dataSource = viewer.dataSources.get(i);

        // 정규 정류장 DataSource 또는 검색 정류장 DataSource 처리
        if ((dataSource?.name?.startsWith('stations_') || dataSource?.name === 'search_stations')
            && dataSource.show && dataSource.entities) {
          const entities = dataSource.entities.values;
          if (!entities) continue;

          entities.forEach((entity: Entity) => {
            try {
              if (entity.id?.startsWith('station_') && entity.billboard) {
                const stationId = entity.id.replace('station_', '');

                // 센서 표시 대상인지 확인
                if (!stationSensorStore.isStationVisible(stationId)) return;

                // Billboard의 실제 화면 위치 계산
                const billboard = entity.billboard;
                const entityPosition = entity.position?.getValue(viewer.clock.currentTime);

                if (entityPosition) {
                  // Billboard가 CLAMP_TO_GROUND인 경우, 실제 terrain 높이 적용된 위치를 계산
                  let actualPosition = entityPosition;

                  if (billboard.heightReference?.getValue(viewer.clock.currentTime) === Cesium.HeightReference.CLAMP_TO_GROUND) {
                    actualPosition = entityPosition;
                  }

                  // terrain-clamped position을 화면 좌표로 변환
                  const screenPosition = viewer.scene.cartesianToCanvasCoordinates(actualPosition);

                  if (screenPosition &&
                      screenPosition.x >= -100 && screenPosition.x <= window.innerWidth + 100 &&
                      screenPosition.y >= -50 && screenPosition.y <= window.innerHeight - 100) { // 센서는 더 아래 위치하므로 여유 공간 확보

                    currentEntityIds.add(entity.id);
                    createOrUpdateSensorElement(entity.id, stationId, screenPosition.x, screenPosition.y);
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
      sensorElementsRef.current.forEach((element, entityId) => {
        if (!currentEntityIds.has(entityId)) {
          element.remove();
          sensorElementsRef.current.delete(entityId);
        }
      });

    } catch (error) {
      console.error('[StationSensorRenderer] Position update error:', error);
    }
  }, [createOrUpdateSensorElement]);

  useEffect(() => {
    let postRenderCallback: (() => void) | null = null;

    // postRender 이벤트 등록
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const viewer = (window as unknown as { cviewer: { scene: { postRender: any } } }).cviewer;
    if (viewer && viewer.scene && viewer.scene.postRender) {
      postRenderCallback = updateSensorPositions;
      try {
        viewer.scene.postRender.addEventListener(postRenderCallback);
        console.log('[StationSensorRenderer] PostRender callback registered successfully');
      } catch (error) {
        console.error('[StationSensorRenderer] Failed to register postRender callback:', error);
      }
    }

    // 컴포넌트 언마운트 시 정리
    return () => {
      // ref 값을 cleanup 시작 시점에 복사
      // eslint-disable-next-line react-hooks/exhaustive-deps
      const currentElements = sensorElementsRef.current;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const currentViewer = (window as unknown as { cviewer: { scene: { postRender: any } } }).cviewer;
      if (currentViewer && currentViewer.scene && currentViewer.scene.postRender && postRenderCallback) {
        try {
          currentViewer.scene.postRender.removeEventListener(postRenderCallback);
          console.log('[StationSensorRenderer] PostRender callback removed successfully');
        } catch (error) {
          console.error('[StationSensorRenderer] Failed to remove postRender callback:', error);
        }
      }

      // 모든 DOM 요소 정리
      currentElements.forEach(element => element.remove());
      currentElements.clear();
    };
  }, [updateSensorPositions]);

  return (
    <div
      ref={containerRef}
      className="absolute top-0 left-0 z-10 w-full h-full overflow-visible pointer-events-none whitespace-nowrap"
      style={{ overflow: 'visible' }}
    />
  );
});

StationSensorRenderer.displayName = 'StationSensorRenderer';

export default StationSensorRenderer;