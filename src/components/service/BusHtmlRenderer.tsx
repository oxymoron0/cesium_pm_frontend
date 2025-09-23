import { useEffect, useRef, useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import { Entity, Cartographic, Cartesian3, sampleTerrainMostDetailed } from 'cesium';
import * as Cesium from 'cesium';
import { busStore } from '@/stores/BusStore';

/**
 * BusHtmlRenderer
 * DOM 직접 조작으로 성능 최적화한 버스 HTML 오버레이 컴포넌트
 * 움직이는 버스 3D 모델 위에 노선 정보를 표시
 */
const BusHtmlRenderer = observer(() => {
  const containerRef = useRef<HTMLDivElement>(null);
  const busElementsRef = useRef<Map<string, {
    element: HTMLDivElement;
    lastSensorData?: { pm: number; fpm: number; voc: number };
    lastRouteName?: string;
    lastTrackingState?: boolean;
  }>>(new Map());
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

  // 센서 데이터 HTML 생성 함수 (AirQualityDisplay 스타일 기반)
  const createSensorHTML = useCallback((sensorData: { pm: number; fpm: number; voc: number }) => {
    const pm10Value = Math.round(sensorData.pm * 10) / 10;
    const pm25Value = Math.round(sensorData.fpm * 10) / 10;
    const vocsValue = Math.round(sensorData.voc * 10) / 10;

    // PM10 색상 계산
    const getPM10Color = (value: number) => {
      if (value <= 30) return '#18A274';
      if (value <= 80) return '#FFD040';
      if (value <= 150) return '#F70';
      return '#D32F2D';
    };

    // PM2.5 색상 계산
    const getPM25Color = (value: number) => {
      if (value <= 15) return '#18A274';
      if (value <= 35) return '#FFD040';
      if (value <= 75) return '#F70';
      return '#D32F2D';
    };

    const pm10Color = getPM10Color(pm10Value);
    const pm25Color = getPM25Color(pm25Value);
    const vocsColor = '#C8C8C8'; // VOCs는 항상 회색

    // 텍스트 색상 계산 (AirQualitySensor와 동일한 로직)
    const getPM10TextColor = (bgColor: string) => {
      return (bgColor === '#D32F2D' || bgColor === '#F70') ? '#FFF' : '#000';
    };

    const getPM25TextColor = (bgColor: string) => {
      return (bgColor === '#D32F2D' || bgColor === '#F70') ? '#FFF' : '#000';
    };

    const pm10TextColor = getPM10TextColor(pm10Color);
    const pm25TextColor = getPM25TextColor(pm25Color);
    const vocsTextColor = '#000'; // VOCs는 항상 회색 배경이므로 검정 텍스트

    return `
      <div style="display: flex; padding: 8px; justify-content: center; align-items: center; gap: 8px; border-radius: 8px; border: 1px solid #C4C6C6; background: rgba(30, 30, 30, 0.90); box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3); pointer-events: none; user-select: none; -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none;">
        <div style="display: flex; min-width: 64px; flex-direction: column; align-items: center; gap: 8px;">
          <div style="color: #FFF; text-align: center; font-variant-numeric: lining-nums tabular-nums; font-family: Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif; font-size: 14px; font-style: normal; font-weight: 800; line-height: 1; letter-spacing: -0.6px; white-space: nowrap;">미세먼지</div>
          <div style="display: flex; width: 56px; height: 56px; flex-direction: column; justify-content: center; align-items: center; border-radius: 36px; background: ${pm10Color};">
            <div style="color: ${pm10TextColor}; text-align: center; font-variant-numeric: lining-nums tabular-nums; font-family: Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif; font-size: 20px; font-style: normal; font-weight: 600; line-height: 1; margin-bottom: 2px;">${pm10Value}</div>
          </div>
        </div>
        <div style="display: flex; min-width: 64px; flex-direction: column; align-items: center; gap: 8px;">
          <div style="color: #FFF; text-align: center; font-variant-numeric: lining-nums tabular-nums; font-family: Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif; font-size: 14px; font-style: normal; font-weight: 800; line-height: 1; letter-spacing: -0.6px; white-space: nowrap;">초미세먼지</div>
          <div style="display: flex; width: 56px; height: 56px; flex-direction: column; justify-content: center; align-items: center; border-radius: 36px; background: ${pm25Color};">
            <div style="color: ${pm25TextColor}; text-align: center; font-variant-numeric: lining-nums tabular-nums; font-family: Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif; font-size: 20px; font-style: normal; font-weight: 600; line-height: 1; margin-bottom: 2px;">${pm25Value}</div>
          </div>
        </div>
        <div style="display: flex; min-width: 64px; flex-direction: column; align-items: center; gap: 8px;">
          <div style="color: #FFF; text-align: center; font-variant-numeric: lining-nums tabular-nums; font-family: Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif; font-size: 14px; font-style: normal; font-weight: 800; line-height: 1; letter-spacing: -0.6px; white-space: nowrap;">VOCs</div>
          <div style="display: flex; width: 56px; height: 56px; flex-direction: column; justify-content: center; align-items: center; border-radius: 36px; background: ${vocsColor};">
            <div style="color: ${vocsTextColor}; text-align: center; font-variant-numeric: lining-nums tabular-nums; font-family: Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif; font-size: 20px; font-style: normal; font-weight: 600; line-height: 1; margin-bottom: 2px;">${vocsValue}</div>
          </div>
        </div>
      </div>
    `;
  }, []);

  // 버스 정보 HTML 생성 함수 (추적 상태 반영)
  const createBusInfoHTML = useCallback((routeName: string, vehicleNumber: string) => {
    // 현재 추적 상태 확인
    const isTracking = busStore.trackedBusId === vehicleNumber;

    // 추적 상태에 따른 스타일 변경
    const backgroundColor = isTracking ? 'rgba(255, 208, 64, 0.9)' : 'rgba(0, 0, 0, 0.65)';
    const borderColor = isTracking ? '#FFD040' : '#C4C6C6';
    const textColor = isTracking ? '#000000' : '#FEFEFE';
    const iconFill = isTracking ? '#000000' : 'white';
    const followText = isTracking ? '따라가기 중지' : '따라가기';

    // 추적 중일 때는 항상 확장된 상태
    const followTextStyle = isTracking
      ? 'color: #000000; font-family: Pretendard; font-size: 12px; font-weight: 500; line-height: normal; margin-left: 8px; max-width: 80px; opacity: 1; overflow: hidden; transition: all 0.3s ease; white-space: nowrap;'
      : 'color: #FEFEFE; font-family: Pretendard; font-size: 12px; font-weight: 500; line-height: normal; margin-left: 0px; max-width: 0px; opacity: 0; overflow: hidden; transition: all 0.3s ease; white-space: nowrap;';

    return `
      <div class="bus-route-container" style="display: inline-flex; padding: 8px 12px; justify-content: center; align-items: center; gap: 4px; border-radius: 34.935px; border: 1px solid ${borderColor}; background: ${backgroundColor}; cursor: pointer; transition: all 0.3s ease;">
        <svg width="13" height="12" viewBox="0 0 13 12" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M9.75 10.7368H3.25V11.3684C3.25 11.5359 3.18152 11.6966 3.05962 11.815C2.93772 11.9335 2.77239 12 2.6 12H1.95C1.77761 12 1.61228 11.9335 1.49038 11.815C1.36848 11.6966 1.3 11.5359 1.3 11.3684V10.7368H0.65V5.68421H0V3.15789H0.65V1.26316C0.65 0.928148 0.786964 0.606858 1.03076 0.36997C1.27456 0.133082 1.60522 0 1.95 0H11.05C11.3948 0 11.7254 0.133082 11.9692 0.36997C12.213 0.606858 12.35 0.928148 12.35 1.26316V3.15789H13V5.68421H12.35V10.7368H11.7V11.3684C11.7 11.5359 11.6315 11.6966 11.5096 11.815C11.3877 11.9335 11.2224 12 11.05 12H10.4C10.2276 12 10.0623 11.9335 9.94038 11.815C9.81848 11.6966 9.75 11.5359 9.75 11.3684V10.7368ZM11.05 5.68421V1.26316H1.95V5.68421H11.05ZM11.05 6.94737H1.95V9.47368H11.05V6.94737ZM2.6 7.57895H5.2V8.8421H2.6V7.57895ZM7.8 7.57895H10.4V8.8421H7.8V7.57895Z" fill="${iconFill}"/>
        </svg>
        <span class="route-number" style="color: ${textColor}; text-align: center; font-variant-numeric: lining-nums tabular-nums; font-family: Pretendard; font-size: 12px; font-weight: 700; line-height: normal;">${routeName}</span>
        <span class="follow-text" style="${followTextStyle}">${followText}</span>
      </div>
    `;
  }, []);

  // 컨테이너 HTML 생성
  const generateContainerHTML = useCallback((routeName: string, vehicleNumber: string, sensorData: { pm: number; fpm: number; voc: number } | undefined) => {
    const busInfoHTML = createBusInfoHTML(routeName, vehicleNumber);
    const sensorHTML = sensorData ? createSensorHTML(sensorData) : '';
    return `
      <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
        ${busInfoHTML}
        ${sensorHTML}
      </div>
    `;
  }, [createBusInfoHTML, createSensorHTML]);

  // 이벤트 등록 (단일 함수)
  const registerBusEvents = useCallback((element: HTMLElement, vehicleNumber: string) => {
    const busRouteContainer = element.querySelector('.bus-route-container') as HTMLElement;
    if (!busRouteContainer) return;

    const isTracking = busStore.trackedBusId === vehicleNumber;

    // 호버 이벤트 (추적 중이 아닐 때만)
    if (!isTracking) {
      busRouteContainer.addEventListener('mouseenter', () => {
        const followText = busRouteContainer.querySelector('.follow-text') as HTMLElement;
        if (followText) {
          followText.style.maxWidth = '60px';
          followText.style.marginLeft = '8px';
          followText.style.opacity = '1';
        }
      });

      busRouteContainer.addEventListener('mouseleave', () => {
        const followText = busRouteContainer.querySelector('.follow-text') as HTMLElement;
        if (followText) {
          followText.style.maxWidth = '0px';
          followText.style.marginLeft = '0px';
          followText.style.opacity = '0';
        }
      });
    }

    // 클릭 이벤트
    busRouteContainer.addEventListener('click', () => {
      const currentTracked = busStore.trackedBusId;
      if (currentTracked === vehicleNumber) {
        busStore.stopCameraTracking();
      } else {
        busStore.trackBus(vehicleNumber);
      }
    });
  }, []);

  // 버스 Element 생성/업데이트
  const createOrUpdateBusElement = useCallback((
    vehicleNumber: string,
    routeName: string,
    sensorData: { pm: number; fpm: number; voc: number } | undefined,
    left: number,
    top: number
  ) => {
    let busInfo = busElementsRef.current.get(vehicleNumber);
    const currentTrackingState = busStore.trackedBusId === vehicleNumber;

    if (!busInfo) {
      // 새 엘리먼트 생성
      const element = document.createElement('div');
      element.style.position = 'absolute';
      element.style.pointerEvents = 'auto';
      element.style.whiteSpace = 'nowrap';
      element.style.overflow = 'visible';
      element.style.zIndex = '1520';
      element.className = 'bus-html-overlay';

      element.innerHTML = generateContainerHTML(routeName, vehicleNumber, sensorData);

      busInfo = {
        element,
        lastSensorData: sensorData ? { ...sensorData } : undefined,
        lastRouteName: routeName,
        lastTrackingState: currentTrackingState
      };
      busElementsRef.current.set(vehicleNumber, busInfo);
      containerRef.current?.appendChild(element);

      registerBusEvents(element, vehicleNumber);
    } else {
      // 내용 변경 확인 (단순화)
      const contentChanged = (
        busInfo.lastRouteName !== routeName ||
        busInfo.lastTrackingState !== currentTrackingState ||
        JSON.stringify(busInfo.lastSensorData) !== JSON.stringify(sensorData)
      );

      if (contentChanged) {
        busInfo.element.innerHTML = generateContainerHTML(routeName, vehicleNumber, sensorData);

        busInfo.lastSensorData = sensorData ? { ...sensorData } : undefined;
        busInfo.lastRouteName = routeName;
        busInfo.lastTrackingState = currentTrackingState;

        registerBusEvents(busInfo.element, vehicleNumber);
      }
    }

    // 위치 업데이트
    busInfo.element.style.left = `${left}px`;
    busInfo.element.style.top = `${top + 12}px`;
    busInfo.element.style.transform = 'translateX(-50%)';
  }, [generateContainerHTML, registerBusEvents]);

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

                  const vehicleNumber = entity.id.replace('bus_model_', '');
                  const busData = busStore.busData.find(bus => bus.vehicle_number === vehicleNumber);
                  if (busData) {
                    const latestPosition = busData.positions[busData.positions.length - 1];
                    const sensorData = latestPosition?.sensor_data;
                    createOrUpdateBusElement(vehicleNumber, busData.route_name, sensorData, screenPosition.x, screenPosition.y);
                    return vehicleNumber;
                  }
                }
              }
            }
          } catch (error) {
            // DeveloperError 상세 로깅
            if (error instanceof Error && error.name === 'DeveloperError') {
              console.warn('[BusHtmlRenderer] DeveloperError details:', {
                message: error.message,
                entityId: entity.id,
                hasPosition: !!entity.position,
                stack: error.stack
              });
            } else {
              console.debug('[BusHtmlRenderer] Entity processing error:', error);
            }
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

      // 모든 DOM 요소 정리
      busElementsRef.current.forEach(busInfo => {
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