import { useEffect, useRef, useCallback, useState } from 'react';
import ReactDOM from 'react-dom';
import { Entity} from 'cesium';
import { simulationStore } from "@/stores/SimulationStore";
import { setSelectedCivilStationId } from '@/utils/cesium/SimulationCivilResultRenderer';
import type { SimulationCivilStationData } from '@/types/simulation_request_types';

interface SimulationCivilStationHtmlRendererProps {
  dataSourceName?: string;
}

const SimulationCivilStationHtmlRenderer = ({
  dataSourceName = 'simulation_civil_result_stations'
}: SimulationCivilStationHtmlRendererProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  // HTML 엘리먼트 캐시 (매 프레임 생성 방지)
  const stationElementsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const sensorElementsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const lastUpdateTime = useRef<number>(0);

  // 로컬 선택 상태 (스토어와 동기화하지 않고 독립적으로 작동하거나, 필요시 useEffect로 동기화)
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);

  // ===== 데이터 조회 헬퍼 =====
  const getStationData = (entityId: string) => {
    // Entity ID: "station_1" -> Index: 1
    const idNum = Number(entityId.replace('station_', ''));
    const simData = simulationStore.selectedCivilSimulation;
    
    if (!simData || isNaN(idNum)) return null;
    return simData.station_data.find(s => s.index === idNum);
  };

  // ===== 정류장 태그 HTML 생성 (단순화) =====
  const createStationTagHTML = useCallback((text: string | number, isSelected: boolean) => {
    // 선택 여부에 따른 스타일
    const bgColor = isSelected ? '#000000' : '#FFFFFF';
    const textColor = '#F12124';
    const borderColor = '#F12124';
    
    // 선택되지 않았을 때(번호 표시)는 원형, 선택됐을 때(이름 표시)는 알약 모양
    const borderRadius = isSelected ? '20px' : '50%';
    const width = isSelected ? 'auto' : '28px';
    const height = isSelected ? 'auto' : '28px';
    const padding = isSelected ? '4px 10px' : '0';

    return `
      <div style="
        display: inline-flex;
        width: ${width};
        height: ${height};
        padding: ${padding};
        justify-content: center;
        align-items: center;
        border-radius: ${borderRadius};
        background: ${bgColor};
        border: 1px solid ${borderColor};
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        cursor: pointer;
        transition: all 0.2s;
      ">
        <span style="
          color: ${textColor};
          font-family: Pretendard;
          font-size: 13px;
          font-weight: 700;
          white-space: nowrap;
        ">${text}</span>
      </div>
    `;
  }, []);

  // ===== 상세 팝업 HTML 생성 =====
  const createPopupHTML = useCallback((stationData: SimulationCivilStationData) => {
    const { pm_label, measured_at } = stationData;
    const basePath = import.meta.env.VITE_BASE_PATH || '/'
    const STATION_ICONS: Record<string, string> = {
      '좋음': 'state_good.svg',
      '보통': 'state_normal.svg',
      '나쁨': 'state_bad.svg',
      '매우나쁨': 'state_very_bad.svg'
    }

    const date = new Date(measured_at);
    const hour = date.getHours();
    const min = String(date.getMinutes()).padStart(2, '0');
    const ampm = hour >= 12 ? '오후' : '오전';
    const hour12 = hour % 12 || 12;
    const timeStr = `${ampm} ${String(hour12).padStart(2, '0')}:${min}`;

    const iconSrc = `${basePath}icon/${STATION_ICONS[pm_label]}`;

    return `
        <div style="
          width: 180px;
          padding: 16px;
          background-color: #222222;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.4);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          font-family: Pretendard, sans-serif;
          position: relative;
        ">
          <div style="
            color: white;
            font-size: 16px;
            font-weight: 700;
          ">미세먼지</div>

          <div style="
            display: flex;
            align-items: center;
            gap: 12px;
            width: 100%;
            justify-content: center;
          ">
            <div style="
              width: 48px; 
              height: 48px; 
              flex-shrink: 0;
              /* 이미지가 없으면 배경색 표시 */
              background-color: ${iconSrc ? 'transparent' : '#333'};
              border-radius: 50%;
              overflow: hidden;
            ">
              <img src="${iconSrc}" style="width: 100%; height: 100%; object-fit: cover; display: ${iconSrc ? 'block' : 'none'};" alt="" />
            </div>

            <div style="display: flex; flex-direction: column; gap: 2px;">
              <div style="color: white; font-size: 16px; font-weight: 600;">${pm_label || '-'}</div>
              <div style="color: #999; font-size: 12px;">${timeStr}</div>
            </div>
          </div>

          <button data-role="run-station-sim" style="
            width: 100%;
            height: 36px;
            background-color: #CFFF40;
            border: none;
            border-radius: 6px;
            color: black;
            font-size: 13px;
            font-weight: 700;
            cursor: pointer;
            display: ${simulationStore.selectedCivilStationAnalysisId === null ?  '' : 'none'}
          ">
            정류장 시뮬레이션 실행
          </button>
        </div>
      `;
  }, [simulationStore.selectedCivilStationAnalysisId]);

  // ===== DOM 엘리먼트 업데이트 =====
  const createOrUpdateElements = useCallback((entityId: string, x: number, y: number) => {
    const stationData = getStationData(entityId);
    if (!stationData) return;

    // 1) 정류장 이름 태그
    let tagEl = stationElementsRef.current.get(entityId);
    const isSelected = selectedStationId === entityId;

    if (!tagEl) {
      tagEl = document.createElement('div');
      tagEl.style.position = 'absolute';
      tagEl.style.transform = 'translate(-50%)'; // 중앙 정렬
      tagEl.style.zIndex = '101';
      tagEl.style.pointerEvents = 'auto'; // 클릭 가능하게
      
      // 클릭 이벤트
      tagEl.onclick = () => {
        if(simulationStore.selectedCivilStationAnalysisId !== null) return;
        const newId = isSelected ? null : entityId;
        setSelectedStationId(newId);
        
        if (newId) {
          // 리스트와 동기화
          setSelectedCivilStationId(stationData.index); 
        } else {
          setSelectedCivilStationId(null);
        }
      };

      containerRef.current?.appendChild(tagEl);
      stationElementsRef.current.set(entityId, tagEl);
    }

    // 내용 업데이트 (선택 상태 변경 시)
    if (tagEl.dataset.selected !== String(isSelected)) {
      // 선택 여부에 따라 '이름' 또는 '인덱스(번호)' 표시
      const labelText = isSelected ? stationData.station_name : stationData.index;
      
      tagEl.innerHTML = createStationTagHTML(labelText, isSelected);
      tagEl.dataset.selected = String(isSelected);
      
      // Z-Index 조정: 기본(10) < 선택된 태그(20)
      tagEl.style.zIndex = isSelected ? '20' : '10'; 
    }

    tagEl.style.left = `${x}px`;
    tagEl.style.top = `${y}px`;


    // 2) 상세 정보 팝업 (선택된 경우만 표시)
    let popupEl = sensorElementsRef.current.get(entityId);

    if (isSelected) {
      if (!popupEl) {
        popupEl = document.createElement('div');
        popupEl.style.position = 'absolute';
        popupEl.style.transform = 'translate(-50%, 40px)'; 
        popupEl.style.zIndex = '30';
        popupEl.innerHTML = createPopupHTML(stationData);

        const btn = popupEl.querySelector('[data-role="run-station-sim"]');
        if (btn) {
          btn.addEventListener('click', (e) => {
            e.stopPropagation(); // 지도 클릭 이벤트 전파 방지
            console.log(`[Popup] 정류장 상세 분석 실행: ${stationData.station_name}`);
            simulationStore.runCivilStationAnalysis(stationData.index);
          });
        }

        containerRef.current?.appendChild(popupEl);
        sensorElementsRef.current.set(entityId, popupEl);
      }
      popupEl.style.left = `${x}px`;
      popupEl.style.top = `${y}px`; 
    } else {
      // 선택 해제되면 제거
      if (popupEl) {
        popupEl.remove();
        sensorElementsRef.current.delete(entityId);
      }
    }

  }, [selectedStationId, createStationTagHTML, createPopupHTML, dataSourceName]);


  // ===== 렌더링 루프 (Cesium PostRender) =====
  const onPostRender = useCallback(() => {
    // 성능 제한 (약 60fps)
    const now = performance.now();
    if (now - lastUpdateTime.current < 16) return;
    lastUpdateTime.current = now;

    const viewer = window.cviewer;
    if (!viewer || !containerRef.current) return;

    const currentIds = new Set<string>();
    const dataSource = viewer.dataSources.getByName(dataSourceName)[0];

    if (dataSource) {
      dataSource.entities.values.forEach((entity: Entity) => {
        const position = entity.position?.getValue(viewer.clock.currentTime);
        if (position) {
          // 3D 좌표 -> 2D 화면 좌표 변환
          const canvasPos = viewer.scene.cartesianToCanvasCoordinates(position);
          
          // 화면 안에 있을 때만 렌더링
          if (canvasPos && 
              canvasPos.x >= -50 && canvasPos.x <= viewer.canvas.width + 50 &&
              canvasPos.y >= -50 && canvasPos.y <= viewer.canvas.height + 50) {
            
            createOrUpdateElements(entity.id, canvasPos.x, canvasPos.y);
            currentIds.add(entity.id);
          }
        }
      });
    }

    // 화면 밖으로 나간 요소 정리
    stationElementsRef.current.forEach((el, id) => {
      if (!currentIds.has(id)) {
        el.remove();
        stationElementsRef.current.delete(id);
        // 연관된 팝업도 제거
        const popup = sensorElementsRef.current.get(id);
        if (popup) {
          popup.remove();
          sensorElementsRef.current.delete(id);
        }
      }
    });

  }, [createOrUpdateElements, dataSourceName]);


  // ===== 이벤트 리스너 등록/해제 =====
  useEffect(() => {
    const viewer = window.cviewer;
    if (!viewer) return;

    viewer.scene.postRender.addEventListener(onPostRender);

    return () => {
      if (!viewer.isDestroyed()) {
        viewer.scene.postRender.removeEventListener(onPostRender);
      }
      // 컴포넌트 언마운트 시 모든 DOM 제거
      stationElementsRef.current.forEach(el => el.remove());
      stationElementsRef.current.clear();
      sensorElementsRef.current.forEach(el => el.remove());
      sensorElementsRef.current.clear();
    };
  }, [onPostRender]);
  
  const rendererContent = (
    <div 
      ref={containerRef} 
      // z-index는 팝업(보통 50)보다 낮고 지도보다 높게 설정 (예: 10)
      className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-10" 
    />
  );
  
  return ReactDOM.createPortal(rendererContent, document.body);
};

export default SimulationCivilStationHtmlRenderer;