import { useEffect, useRef, useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import { Entity, Cartographic, Cartesian3, sampleTerrainMostDetailed } from 'cesium';
import * as Cesium from 'cesium';
import { busStore } from '@/stores/BusStore';
import BusInfoContainer from '@/components/basic/BusInfoContainer';
import { createRoot, type Root } from 'react-dom/client';

/**
 * BusHtmlRenderer
 * DOM 직접 조작으로 성능 최적화한 버스 HTML 오버레이 컴포넌트
 * 움직이는 버스 3D 모델 위에 노선 정보를 표시
 */
const BusHtmlRenderer = observer(() => {
  const containerRef = useRef<HTMLDivElement>(null);
  const busElementsRef = useRef<Map<string, { element: HTMLDivElement; root: Root }>>(new Map());
  const lastUpdateTime = useRef<number>(0);
  const terrainHeightCache = useRef<Map<string, number>>(new Map());

  // Terrain 높이 계산 함수 (캐시 활용)
  const getTerrainHeight = useCallback(async (longitude: number, latitude: number): Promise<number> => {
    const key = `${longitude.toFixed(6)}_${latitude.toFixed(6)}`;

    // 캐시에서 확인
    if (terrainHeightCache.current.has(key)) {
      return terrainHeightCache.current.get(key)!;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const viewer = (window as unknown as { cviewer: { terrainProvider: any } }).cviewer;
      if (!viewer?.terrainProvider) {
        terrainHeightCache.current.set(key, 0);
        return 0;
      }

      // Terrain 샘플링
      const cartographic = Cartographic.fromDegrees(longitude, latitude);
      const sampledPositions = await sampleTerrainMostDetailed(viewer.terrainProvider, [cartographic]);

      const height = sampledPositions[0]?.height || 0;
      terrainHeightCache.current.set(key, height);

      return height;
    } catch (error) {
      console.error('[BusHtmlRenderer] Terrain height calculation error:', error);
      terrainHeightCache.current.set(key, 0);
      return 0;
    }
  }, []);

  // 버스 Element 생성/업데이트
  const createOrUpdateBusElement = useCallback((
    vehicleNumber: string,
    routeName: string,
    left: number,
    top: number
  ) => {
    let busInfo = busElementsRef.current.get(vehicleNumber);

    if (!busInfo) {
      // 새 엘리먼트 생성
      const element = document.createElement('div');
      element.style.position = 'absolute';
      element.style.pointerEvents = 'auto';
      element.style.transform = 'translateX(-50%)';
      element.style.whiteSpace = 'nowrap';
      element.style.overflow = 'visible';

      // React 컴포넌트를 DOM에 렌더링
      const root = createRoot(element);
      root.render(<BusInfoContainer routeName={routeName} />);

      busInfo = { element, root };
      busElementsRef.current.set(vehicleNumber, busInfo);
      containerRef.current?.appendChild(element);
    } else {
      // 노선명이 변경된 경우 리렌더링 (일반적으로 변경되지 않지만 안전을 위해)
      const currentRouteName = busInfo.element.textContent?.trim();
      if (currentRouteName !== routeName) {
        busInfo.root.render(<BusInfoContainer routeName={routeName} />);
      }
    }

    // 위치 업데이트 (매 프레임) - 버스 모델 위에 위치
    busInfo.element.style.left = `${left}px`;
    busInfo.element.style.top = `${top - 10}px`; // 버스 모델 위 10px
    busInfo.element.style.zIndex = '1520';
  }, []);

  // 60fps 제한을 위한 스로틀링
  const updateBusPositions = useCallback(async () => {
    const now = performance.now();
    if (now - lastUpdateTime.current < 16) return; // ~60fps
    lastUpdateTime.current = now;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const viewer = (window as unknown as { cviewer: { scene: any; clock: any; dataSources: any } }).cviewer;
    if (!viewer || !viewer.scene || !viewer.clock || !containerRef.current) {
      return;
    }

    try {

      let currentBusIds = new Set<string>();

      // 버스 모델 DataSource 찾기
      const busDataSource = viewer.dataSources.getByName('bus_models');
      if (busDataSource.length > 0 && busDataSource[0].show && busDataSource[0].entities) {
        const dataSource = busDataSource[0];
        const entities = dataSource.entities.values;

        const entityPromises = entities.map(async (entity: Entity): Promise<string | null> => {
          try {
            if (entity.id?.startsWith('bus_model_') && entity.position) {
              // 버스 Entity의 실제 화면 위치 계산 (terrain-aware)
              const entityPosition = entity.position.getValue(viewer.clock.currentTime);

              if (entityPosition) {
                // Bus position에서 longitude, latitude 추출
                const cartographic = Cartographic.fromCartesian(entityPosition);
                const longitude = Cesium.Math.toDegrees(cartographic.longitude);
                const latitude = Cesium.Math.toDegrees(cartographic.latitude);

                // Terrain 높이 계산
                const terrainHeight = await getTerrainHeight(longitude, latitude);

                // 새로운 terrain-aware position 생성
                const actualPosition = Cartesian3.fromDegrees(longitude, latitude, terrainHeight);

                // terrain-aware position을 화면 좌표로 변환
                const screenPosition = viewer.scene.cartesianToCanvasCoordinates(actualPosition);

                if (screenPosition &&
                    screenPosition.x >= -100 && screenPosition.x <= window.innerWidth + 100 &&
                    screenPosition.y >= -100 && screenPosition.y <= window.innerHeight - 50) {

                  // entity.id에서 vehicle_number 추출 (예: "bus_model_12345" -> "12345")
                  const vehicleNumber = entity.id.replace('bus_model_', '');

                  // BusStore에서 해당 버스의 노선 정보 조회
                  const busData = busStore.busData.find(bus => bus.vehicle_number === vehicleNumber);
                  if (busData) {
                    createOrUpdateBusElement(vehicleNumber, busData.route_name, screenPosition.x, screenPosition.y);
                    return vehicleNumber;
                  }
                }
              }
            }
          } catch {
            // 개별 Entity 처리 오류는 무시
          }
          return null;
        });

        // 모든 entity 처리 완료 후 결과 수집
        const validVehicleNumbers = await Promise.all(entityPromises);
        currentBusIds = new Set(validVehicleNumbers.filter(id => id !== null) as string[]);
      }

      // 더 이상 표시되지 않는 버스 Element 제거
      busElementsRef.current.forEach((busInfo, vehicleNumber) => {
        if (!currentBusIds.has(vehicleNumber)) {
          busInfo.root.unmount();
          busInfo.element.remove();
          busElementsRef.current.delete(vehicleNumber);
        }
      });

    } catch (error) {
      console.error('[BusHtmlRenderer] Position update error:', error);
    }
  }, [createOrUpdateBusElement, getTerrainHeight]);

  useEffect(() => {
    let postRenderCallback: (() => void) | null = null;

    // postRender 이벤트 등록
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const viewer = (window as unknown as { cviewer: { scene: { postRender: any } } }).cviewer;
    if (viewer && viewer.scene && viewer.scene.postRender) {
      postRenderCallback = () => {
        updateBusPositions().catch(error => {
          console.error('[BusHtmlRenderer] Async update error:', error);
        });
      };
      try {
        viewer.scene.postRender.addEventListener(postRenderCallback);
        console.log('[BusHtmlRenderer] PostRender callback registered successfully');
      } catch (error) {
        console.error('[BusHtmlRenderer] Failed to register postRender callback:', error);
      }
    }

    // 컴포넌트 언마운트 시 정리
    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const currentViewer = (window as unknown as { cviewer: { scene: { postRender: any } } }).cviewer;
      if (currentViewer && currentViewer.scene && currentViewer.scene.postRender && postRenderCallback) {
        try {
          currentViewer.scene.postRender.removeEventListener(postRenderCallback);
          console.log('[BusHtmlRenderer] PostRender callback removed successfully');
        } catch (error) {
          console.error('[BusHtmlRenderer] Failed to remove postRender callback:', error);
        }
      }

      // 모든 React roots와 DOM 요소 정리
      busElementsRef.current.forEach(busInfo => {
        busInfo.root.unmount();
        busInfo.element.remove();
      });
      busElementsRef.current.clear();
    };
  }, [updateBusPositions]);

  return (
    <div
      ref={containerRef}
      className="absolute top-0 left-0 z-10 w-full h-full overflow-visible pointer-events-none whitespace-nowrap"
      style={{ overflow: 'visible' }}
    />
  );
});

BusHtmlRenderer.displayName = 'BusHtmlRenderer';

export default BusHtmlRenderer;