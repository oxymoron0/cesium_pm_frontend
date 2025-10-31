import { useEffect, useRef, useCallback, useState } from 'react';
import { Entity } from 'cesium';
import { setSelectedSimulationStationId } from '@/utils/cesium/simulationResultRenderer';

const SimulationStationHtmlRenderer = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const stationElementsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const sensorElementsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const lastUpdateTime = useRef<number>(0);
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);

  useEffect(() => {
    setSelectedSimulationStationId(selectedStationId);
  }, [selectedStationId]);

  // 시간 포맷 변환 함수 (2024.08.07 15:00 → 오후 03:00)
  const formatTime = useCallback((timeStr: string): string => {
    try {
      // "2024.08.07 15:00" 형식 파싱
      const parts = timeStr.split(' ');
      if (parts.length !== 2) return timeStr;

      const timePart = parts[1]; // "15:00"
      const [hourStr, minute] = timePart.split(':');
      const hour = parseInt(hourStr, 10);

      if (isNaN(hour)) return timeStr;

      const isPM = hour >= 12;
      const displayHour = hour === 0 ? 12 : (hour > 12 ? hour - 12 : hour);
      const period = isPM ? '오후' : '오전';

      return `${period} ${String(displayHour).padStart(2, '0')}:${minute}`;
    } catch {
      return timeStr;
    }
  }, []);

  // PM10 색상 로직 (StationSensorRenderer 패턴)
  const getPM10Color = useCallback((value: number): string => {
    if (value <= 30) return '#18A274';
    if (value <= 80) return '#FFD040';
    if (value <= 150) return '#F70';
    return '#D32F2D';
  }, []);

  // PM10 센서 HTML 생성 (StationSensorRenderer 패턴 단순화)
  const createPM10HTML = useCallback((pm10Value: string, timeValue: string) => {
    const numericValue = parseFloat(pm10Value.replace(' μg/m³', ''));
    const pm10Color = isNaN(numericValue) ? '#999' : getPM10Color(numericValue);
    const displayValue = isNaN(numericValue) ? '---' : numericValue.toString();
    const formattedTime = formatTime(timeValue);

    return `
      <div style="display: flex; padding: 8px; flex-direction: column; justify-content: center; align-items: center; gap: 8px; border-radius: 4px; background: rgba(30, 30, 30, 0.90);">
        <div style="display: flex; flex-direction: column; align-items: center;">
          <div style="color: #FFF; text-align: center; font-family: Pretendard; font-size: 17px; font-weight: 400;">미세먼지</div>
          <div style="color: #A6A6A6; text-align: center; font-family: Pretendard; font-size: 12px; font-weight: 400;">${formattedTime}</div>
          <div style="color: ${pm10Color}; text-align: center; font-family: Pretendard; font-size: 36px; font-weight: 800; letter-spacing: -0.8px;">${displayValue}</div>
        </div>
        <button style="display: flex; height: 40px; padding: 5px 8px; justify-content: center; align-items: center; gap: 4px; align-self: stretch; border-radius: 4px; background: #CFFF40; border: none; cursor: pointer;">
          <div style="color: #000; text-align: center; font-family: Pretendard; font-size: 16px; font-weight: 700; line-height: normal;">정류장 시뮬레이션 실행</div>
        </button>
      </div>
    `;
  }, [getPM10Color, formatTime]);

  // 스테이션 ID 태그 HTML 생성
  const createStationIdHTML = useCallback((displayText: string, isSelected: boolean) => {
    const backgroundColor = isSelected ? 'black' : 'white';

    return `
      <div class="station-tag-container" style="display: inline-flex; justify-content: center; align-items: center; gap: 4px; border-radius: 26.87px; border: 1px solid #F12124; background: ${backgroundColor}; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1); padding: 2px 6px 2px 8px; transition: all 0.3s ease; cursor: pointer; user-select: none; -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none;">
        <span class="station-name" style="color: #DC5449; text-align: center; font-variant-numeric: lining-nums tabular-nums; font-family: Pretendard; font-size: 12px; font-weight: 700; line-height: normal;">
          ${displayText}
        </span>
      </div>
    `;
  }, []);

  // PM10 센서 Element 생성/업데이트
  const createOrUpdateSensorElement = useCallback((
    entityId: string,
    pm10Value: string,
    timeValue: string,
    left: number,
    top: number
  ) => {
    let element = sensorElementsRef.current.get(entityId);

    if (!element) {
      element = document.createElement('div');
      element.style.position = 'absolute';
      element.style.pointerEvents = 'auto';
      element.style.transform = 'translateX(-50%)';
      element.style.whiteSpace = 'nowrap';
      element.style.overflow = 'visible';
      element.style.zIndex = '1520';
      element.innerHTML = createPM10HTML(pm10Value, timeValue);

      sensorElementsRef.current.set(entityId, element);
      containerRef.current?.appendChild(element);
    }

    // 위치 업데이트
    element.style.left = `${left + 1}px`;
    element.style.top = `${top + 30}px`;
  }, [createPM10HTML]);

  // 정류장 Element 생성/업데이트
  const createOrUpdateStationElement = useCallback((
    entityId: string,
    stationId: string,
    stationName: string,
    left: number,
    top: number
  ) => {
    let element = stationElementsRef.current.get(entityId);
    const isSelected = selectedStationId === entityId;
    const displayText = isSelected ? stationName : stationId;

    if (!element) {
      element = document.createElement('div');
      element.style.position = 'absolute';
      element.style.pointerEvents = 'auto';
      element.style.transform = 'translateX(-50%)';
      element.style.whiteSpace = 'nowrap';
      element.style.overflow = 'visible';
      element.style.zIndex = '1500';
      element.innerHTML = createStationIdHTML(displayText, isSelected);

      element.addEventListener('click', () => {
        setSelectedStationId(prev => prev === entityId ? null : entityId);
      });

      stationElementsRef.current.set(entityId, element);
      containerRef.current?.appendChild(element);
    } else {
      const currentIsSelected = element.innerHTML.includes('background: black');
      if (currentIsSelected !== isSelected) {
        element.innerHTML = createStationIdHTML(displayText, isSelected);
      }
    }

    // 위치 업데이트
    element.style.left = `${left + 1}px`;
    element.style.top = `${top}px`;
  }, [createStationIdHTML, selectedStationId]);

  // 60fps 제한을 위한 스로틀링
  const updateStationPositions = useCallback(() => {
    const now = performance.now();
    if (now - lastUpdateTime.current < 16) return;
    lastUpdateTime.current = now;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const viewer = (window as unknown as { cviewer: { scene: any; clock: any; dataSources: any } }).cviewer;

      if (!viewer?.scene || !viewer?.clock || !containerRef.current) return;

      const currentEntityIds = new Set<string>();
      const currentSensorIds = new Set<string>();

      for (let i = 0; i < viewer.dataSources.length; i++) {
        const dataSource = viewer.dataSources.get(i);

        if (dataSource?.name === 'simulation_result_stations' && dataSource.show && dataSource.entities) {
          const entities = dataSource.entities.values;
          if (!entities) continue;

          entities.forEach((entity: Entity) => {
            try {
              if (entity.id?.startsWith('station_') && entity.billboard) {
                const entityPosition = entity.position?.getValue(viewer.clock.currentTime);

                if (entityPosition) {
                  const screenPosition = viewer.scene.cartesianToCanvasCoordinates(entityPosition);

                  if (screenPosition &&
                      screenPosition.x >= -100 && screenPosition.x <= window.innerWidth + 100 &&
                      screenPosition.y >= -50 && screenPosition.y <= window.innerHeight - 100) {

                    const stationId = entity.name || entity.id.replace('station_', '');
                    const stationName = entity.properties?.stationName?.getValue() || stationId;

                    currentEntityIds.add(entity.id);
                    createOrUpdateStationElement(entity.id, stationId, stationName, screenPosition.x, screenPosition.y);

                    if (selectedStationId === entity.id && entity.properties) {
                      const pm10Value = entity.properties.pm10?.getValue();
                      const timeValue = entity.properties.time?.getValue();
                      if (pm10Value && timeValue) {
                        currentSensorIds.add(entity.id);
                        createOrUpdateSensorElement(entity.id, pm10Value, timeValue, screenPosition.x, screenPosition.y);
                      }
                    }
                  }
                }
              }
            } catch {
              // 개별 Entity 처리 오류 무시
            }
          });
        }
      }

      stationElementsRef.current.forEach((element, entityId) => {
        if (!currentEntityIds.has(entityId)) {
          element.remove();
          stationElementsRef.current.delete(entityId);
        }
      });

      sensorElementsRef.current.forEach((element, entityId) => {
        if (!currentSensorIds.has(entityId)) {
          element.remove();
          sensorElementsRef.current.delete(entityId);
        }
      });

    } catch (error) {
      console.error('[SimulationStationHtmlRenderer] Position update error:', error);
    }
  }, [createOrUpdateStationElement, createOrUpdateSensorElement, selectedStationId]);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const viewer = (window as unknown as { cviewer: { scene: { postRender: any } } }).cviewer;
    if (!viewer?.scene?.postRender) return;

    try {
      viewer.scene.postRender.addEventListener(updateStationPositions);
      console.log('[SimulationStationHtmlRenderer] PostRender callback registered');
    } catch (error) {
      console.error('[SimulationStationHtmlRenderer] Failed to register postRender:', error);
    }

    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const currentViewer = (window as unknown as { cviewer: { scene: { postRender: any } } }).cviewer;
      if (currentViewer?.scene?.postRender) {
        try {
          currentViewer.scene.postRender.removeEventListener(updateStationPositions);
        } catch (error) {
          console.error('[SimulationStationHtmlRenderer] Failed to remove postRender:', error);
        }
      }

      stationElementsRef.current.forEach(element => element.remove());
      stationElementsRef.current.clear();
      sensorElementsRef.current.forEach(element => element.remove());
      sensorElementsRef.current.clear();
    };
  }, [updateStationPositions]);

  return (
    <div
      ref={containerRef}
      className="absolute top-0 left-0 z-10 w-full h-full overflow-visible pointer-events-none whitespace-nowrap"
      style={{ overflow: 'visible' }}
    />
  );
};

SimulationStationHtmlRenderer.displayName = 'SimulationStationHtmlRenderer';

export default SimulationStationHtmlRenderer;
