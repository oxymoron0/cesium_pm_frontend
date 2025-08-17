import { useEffect, useRef, useState } from 'react';
import { Viewer, Ion, Color, Cartesian3, Cartesian2, HeightReference, LabelStyle, VerticalOrigin } from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';

const CesiumViewer = () => {
  const cesiumContainer = useRef<HTMLDivElement>(null);
  const [isUsingParentViewer, setIsUsingParentViewer] = useState(false);

  useEffect(() => {
    console.log('[PM Frontend] CesiumViewer 초기화 시작');
    console.log('[PM Frontend] Qiankun 환경:', (window as any).__POWERED_BY_QIANKUN__);
    console.log('[PM Frontend] 부모 cviewer:', (window as any).cviewer);

    // Cesium Ion 토큰 설정
    Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI2Yzk3OTAxYi1hYzc5LTRjN2QtYmY4ZC0wYmM4NTVjMDgzNDQiLCJpZCI6MTIzMjE4LCJpYXQiOjE3NTIzNTcxNjh9.oZ_Z-44nxEx1he-wa4Dq9EQoz24MrQVQkJE8lynkeJk';
    console.log('[PM Frontend] Cesium Ion 토큰 설정 완료');

    // Qiankun 환경에서 부모 Viewer 감지
    if ((window as any).__POWERED_BY_QIANKUN__ && (window as any).cviewer) {
      console.log('[PM Frontend] 부모 Cesium Viewer 감지됨, DOM 컨테이너 렌더링 안함');
      setIsUsingParentViewer(true);
      return;
    }

    // 독립 환경에서만 Viewer 생성
    const initCesiumViewer = () => {
      if (!cesiumContainer.current) {
        console.warn('[PM Frontend] 컨테이너가 아직 준비되지 않음, 재시도...');
        setTimeout(initCesiumViewer, 100);
        return;
      }

      console.log('[PM Frontend] 독립 Cesium Viewer 생성 시작');
      
      try {
        const viewer = new Viewer(cesiumContainer.current, {
          baseLayerPicker: false,
          homeButton: false,
          sceneModePicker: false,
          navigationHelpButton: false,
          animation: false,
          timeline: false,
          infoBox: false,
          selectionIndicator: false
        });

        console.log('[PM Frontend] Cesium Viewer 생성 성공:', viewer);

        // 전역에 Cesium 라이브러리 노출 (개발 환경용)
        (window as any).Cesium = { Viewer, Ion, Color, Cartesian3, Cartesian2, HeightReference, LabelStyle, VerticalOrigin };
        (window as any).cviewer = viewer;
        console.log('[PM Frontend] window.cviewer 설정 완료');

      } catch (error) {
        console.error('[PM Frontend] Cesium Viewer 생성 실패:', error);
      }
    };

    // DOM 준비 상태 확인 후 실행
    if (cesiumContainer.current) {
      initCesiumViewer();
    } else {
      setTimeout(initCesiumViewer, 100);
    }

    // 정리 함수
    return () => {
      console.log('[PM Frontend] CesiumViewer cleanup');
      if ((window as any).cviewer && !isUsingParentViewer) {
        console.log('[PM Frontend] Cesium Viewer 정리 시작');
        const viewer = (window as any).cviewer;
        try {
          viewer.destroy();
          delete (window as any).cviewer;
          console.log('[PM Frontend] Cesium Viewer 정리 완료');
        } catch (error) {
          console.error('[PM Frontend] Viewer 정리 중 오류:', error);
        }
      }
    };
  }, []);

  // Qiankun 환경에서는 부모 Viewer를 사용하므로 DOM 컨테이너 렌더링 안함
  if (isUsingParentViewer) {
    return null;
  }

  return (
    <div 
      ref={cesiumContainer}
      style={{ 
        width: '100%', 
        height: '100%',
        position: 'absolute',
        top: 0,
        left: 0
      }}
    />
  );
};

export default CesiumViewer;