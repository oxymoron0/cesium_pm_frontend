import { useEffect, useRef, useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import { Entity } from 'cesium';
import { stationStore } from '@/stores/StationStore';
import { stationSensorStore } from '@/stores/StationSensorStore';
import { stationDetailStore } from '@/stores/StationDetailStore';
import { getCurrentSelectedSearchStationId } from '@/utils/cesium/searchStationRenderer';

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
    // 검색 결과 정류장 여부 확인
    const isSearchResult = routeName === 'search';

    // 선택 상태 계산
    let isSelected: boolean;
    if (isSearchResult) {
      // 검색 결과 정류장: 전역 상태에서 선택 상태 확인
      isSelected = getCurrentSelectedSearchStationId() === stationId;
    } else {
      // 기존 정류장: StationStore에서 선택 상태 확인
      isSelected = stationStore.isStationSelected(stationId);
    }

    // 활성 상태 판단
    let isActive: boolean;
    if (isSearchResult) {
      // 검색 결과 정류장: 선택된 경우만 활성
      isActive = isSelected;
    } else {
      // 기존 정류장: stationRenderer.ts와 동일한 로직
      const isRouteSelected = stationStore.selectedRouteName === routeName;
      const isDirectionSelected = stationStore.selectedDirection === direction;
      isActive = isSelected || (isRouteSelected && isDirectionSelected);
    }

    // 스타일 클래스
    const scaleClass = isSelected ? 'scale-110' : '';
    const shadowClass = isSelected ? 'shadow-lg' : 'shadow-md';

    // 색상 스키마 통합: 검색 정류장과 기존 정류장 동일한 색상 적용
    const borderColor = isActive ? '#F12124' : '#888888'; // 활성: 빨간색, 비활성: 회색
    const textColor = isActive ? '#DC5449' : '#666666';   // 활성: 진한 빨간색, 비활성: 진한 회색

    // 상세보기 텍스트 스타일 (기본적으로 숨김)
    const detailTextStyle = `color: ${textColor}; font-family: Pretendard; font-size: 10px; font-weight: 500; line-height: normal; margin-left: 0px; max-width: 0px; opacity: 0; overflow: hidden; transition: all 0.3s ease; white-space: nowrap;`;

    return `
      <div class="station-tag-container" style="display: inline-flex; justify-content: center; align-items: center; gap: 4px; border-radius: 26.87px; border: 1px solid ${borderColor}; background: white; ${shadowClass} ${scaleClass}; padding: 2px 6px 2px 8px; cursor: pointer; transition: all 0.3s ease; pointer-events: auto; user-select: none; -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none;">
        <span class="station-name" style="color: ${textColor}; text-align: center; font-variant-numeric: lining-nums tabular-nums; font-family: Pretendard; font-size: 12px; font-weight: 700; line-height: normal;">
          ${stationName}
        </span>
        <span class="detail-text" style="${detailTextStyle}">상세보기</span>
      </div>
    `;
  }, []);

  // 정류장 이벤트 등록 함수
  const registerStationEvents = useCallback((
    element: HTMLElement,
    stationId: string,
    stationName: string,
    routeName: string,
    direction: 'inbound' | 'outbound'
  ) => {
    // 호버 이벤트 핸들러 추가
    element.addEventListener('mouseenter', () => {
      stationSensorStore.setHoveredStation(stationId);

      // 상세보기 텍스트 애니메이션 (우측 확장)
      const detailText = element.querySelector('.detail-text') as HTMLElement;
      if (detailText) {
        detailText.style.maxWidth = '60px';
        detailText.style.marginLeft = '8px';
        detailText.style.opacity = '1';
      }
    });

    element.addEventListener('mouseleave', () => {
      stationSensorStore.clearHoveredStation();

      // 상세보기 텍스트 애니메이션 (축소)
      const detailText = element.querySelector('.detail-text') as HTMLElement;
      if (detailText) {
        detailText.style.maxWidth = '0px';
        detailText.style.marginLeft = '0px';
        detailText.style.opacity = '0';
      }
    });

    // 정류장 태그 클릭 이벤트
    element.addEventListener('click', () => {
      // 검색 정류장 처리: Entity properties에서 direction 정보 조회
      if (routeName === 'search') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const viewer = (window as unknown as { cviewer: any }).cviewer;
        if (!viewer) return;

        // DataSource에서 Entity 찾기
        const dataSource = viewer.dataSources.getByName('search_stations');
        if (dataSource.length === 0) return;

        const entity = dataSource[0].entities.getById(`station_${stationId}`);
        if (!entity?.properties) {
          console.warn(`[StationHtmlRenderer] No entity properties for search station: ${stationId}`);
          return;
        }

        // Entity properties에서 direction 정보 가져오기
        const entityRouteName = entity.properties.routeName?.getValue?.() || entity.properties.routeName;
        const entityDirection = entity.properties.direction?.getValue?.() || entity.properties.direction;
        const entityDirectionName = entity.properties.directionName?.getValue?.() || entity.properties.directionName;

        if (!entityRouteName || !entityDirection || !entityDirectionName) {
          console.warn(`[StationHtmlRenderer] Missing direction info for search station: ${stationId}`);
          return;
        }

        // StationDetailStore에 정류장 정보 설정
        stationDetailStore.selectStation(stationId, stationName, entityRouteName, entityDirection, entityDirectionName);

        // AirQualityStatus 모달 열기
        stationDetailStore.openModal();

        console.log(`[StationHtmlRenderer] Search station detail opened: ${stationName} (${entityRouteName}-${entityDirection})`);
        return;
      }

      // 기존 정류장 처리: StationStore에서 direction_name 가져오기
      const stationData = stationStore.getStationData(routeName, direction);
      if (!stationData) {
        console.warn(`[StationHtmlRenderer] No station data for ${routeName}-${direction}`);
        return;
      }

      const directionName = stationData.direction_name;

      // StationDetailStore에 정류장 정보 설정
      stationDetailStore.selectStation(stationId, stationName, routeName, direction, directionName);

      // AirQualityStatus 모달 열기
      stationDetailStore.openModal();

      console.log(`[StationHtmlRenderer] Station detail opened: ${stationName} (${routeName}-${direction})`);
    });
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

    // 검색 결과 정류장 여부 확인
    const isSearchResult = routeName === 'search';

    // 현재 상태 계산
    let isSelected: boolean;
    if (isSearchResult) {
      // 검색 결과 정류장: 전역 상태에서 선택 상태 확인
      isSelected = getCurrentSelectedSearchStationId() === stationId;
    } else {
      // 기존 정류장: StationStore에서 선택 상태 확인
      isSelected = stationStore.isStationSelected(stationId);
    }

    let isActive: boolean;
    if (isSearchResult) {
      // 검색 결과 정류장: 선택된 경우만 활성
      isActive = isSelected;
    } else {
      // 기존 정류장: stationRenderer.ts와 동일한 로직
      const isRouteSelected = stationStore.selectedRouteName === routeName;
      const isDirectionSelected = stationStore.selectedDirection === direction;
      isActive = isSelected || (isRouteSelected && isDirectionSelected);
    }

    if (!element) {
      // 새 엘리먼트 생성
      element = document.createElement('div');
      element.style.position = 'absolute';
      element.style.pointerEvents = 'auto'; // 호버 이벤트를 위해 활성화
      element.style.transform = 'translateX(-50%)';
      element.style.whiteSpace = 'nowrap';
      element.style.overflow = 'visible';
      element.innerHTML = createStationTagHTML(stationName, stationId, routeName, direction);

      // 이벤트 등록
      registerStationEvents(element, stationId, stationName, routeName, direction);

      stationElementsRef.current.set(entityId, element);
      containerRef.current?.appendChild(element);
    } else {
      // 상태 변경 감지: 선택 상태, 활성 상태, 또는 활성/비활성 상태 변경 시 HTML 업데이트
      const currentIsSelected = element.innerHTML.includes('scale-110');
      const currentIsActive = element.innerHTML.includes('#F12124'); // 빨간색 테두리 확인

      if (currentIsSelected !== isSelected || currentIsActive !== isActive) {
        element.innerHTML = createStationTagHTML(stationName, stationId, routeName, direction);

        // HTML 변경 시 이벤트 리스너 재등록
        registerStationEvents(element, stationId, stationName, routeName, direction);
      }
    }

    // 위치 업데이트 (매 프레임) - Billboard 중심 아래로 정확히 위치
    element.style.left = `${left}px`; // 중심 정렬을 위해 translateX(-50%) 사용
    element.style.top = `${top}px`; // Billboard 바로 아래 5px 간격
    element.style.zIndex = isActive ? '1500' : '1499';
  }, [createStationTagHTML, registerStationEvents]);

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

      // 모든 stations_ 및 search_stations DataSource를 순회하여 Entity 찾기
      for (let i = 0; i < viewer.dataSources.length; i++) {
        const dataSource = viewer.dataSources.get(i);

        // 정규 정류장 DataSource 처리
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
                const entityPosition = entity.position?.getValue(viewer.clock.currentTime);

                if (entityPosition) {
                  // position을 화면 좌표로 변환 (terrain 높이 계산 생략)
                  const screenPosition = viewer.scene.cartesianToCanvasCoordinates(entityPosition);

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
        // 검색 정류장 DataSource 처리
        else if (dataSource?.name === 'search_stations' && dataSource.show && dataSource.entities) {
          const entities = dataSource.entities.values;
          if (!entities) continue;

          entities.forEach((entity: Entity) => {
            try {
              if (entity.id?.startsWith('station_') && entity.billboard) {
                const entityPosition = entity.position?.getValue(viewer.clock.currentTime);

                if (entityPosition) {
                  // position을 화면 좌표로 변환 (terrain 높이 계산 생략)
                  const screenPosition = viewer.scene.cartesianToCanvasCoordinates(entityPosition);

                  if (screenPosition &&
                      screenPosition.x >= -100 && screenPosition.x <= window.innerWidth + 100 &&
                      screenPosition.y >= -50 && screenPosition.y <= window.innerHeight - 50) {

                    const stationId = entity.id.replace('station_', '');
                    const stationName = entity.name || stationId;

                    currentEntityIds.add(entity.id);
                    // 검색 정류장은 가상의 route/direction 사용
                    createOrUpdateStationElement(entity.id, stationName, stationId, 'search', 'inbound', screenPosition.x, screenPosition.y);
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
    const stationElements = stationElementsRef.current;

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
      stationElements.forEach(element => element.remove());
      stationElements.clear();
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