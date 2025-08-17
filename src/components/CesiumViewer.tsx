import { useEffect, useRef, useState } from 'react';
import { Viewer, Ion, Color, Cartesian3, Cartesian2, HeightReference, LabelStyle, VerticalOrigin } from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';

const CesiumViewer = () => {
  const cesiumContainer = useRef<HTMLDivElement>(null);
  const [parentViewer, setParentViewer] = useState<any>(null);
  const [isUsingParentViewer, setIsUsingParentViewer] = useState(false);

  useEffect(() => {
    // Cesium Ion 토큰 설정
    Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI2Yzk3OTAxYi1hYzc5LTRjN2QtYmY4ZC0wYmM4NTVjMDgzNDQiLCJpZCI6MTIzMjE4LCJpYXQiOjE3NTIzNTcxNjh9.oZ_Z-44nxEx1he-wa4Dq9EQoz24MrQVQkJE8lynkeJk';

    // Qiankun 환경에서 부모 Viewer 감지
    if ((window as any).__POWERED_BY_QIANKUN__ && (window as any).cviewer) {
      console.log('[PM Frontend] 부모 Cesium Viewer 감지됨:', (window as any).cviewer);
      setParentViewer((window as any).cviewer);
      setIsUsingParentViewer(true);
      
      // 부모 Viewer에 테스트 엔티티 추가
      testParentViewerControl((window as any).cviewer);
      
      return;
    }

    // 독립 모드: 자체 Viewer 생성
    if (cesiumContainer.current) {
      console.log('[PM Frontend] 독립 Cesium Viewer 생성');
      const viewer = new Viewer(cesiumContainer.current, {
        baseLayerPicker: false,
        homeButton: false,
        sceneModePicker: false,
        navigationHelpButton: false,
        animation: false,
        timeline: false
      });

      return () => {
        viewer.destroy();
      };
    }
  }, []);

  // 부모 Viewer 제어 테스트 함수
  const testParentViewerControl = (viewer: any) => {
    try {
      console.log('[PM Frontend] 부모 Viewer 제어 테스트 시작');
      
      // 부모 Viewer에 테스트 마커 추가
      const entity = viewer.entities.add({
        name: 'PM Frontend Test Marker',
        position: Cartesian3.fromDegrees(129.0756, 35.1796, 0), // 부산 좌표
        point: {
          pixelSize: 10,
          color: Color.YELLOW,
          outlineColor: Color.BLACK,
          outlineWidth: 2,
          heightReference: HeightReference.CLAMP_TO_GROUND
        },
        label: {
          text: 'PM Frontend Connected!',
          font: '12pt sans-serif',
          fillColor: Color.WHITE,
          outlineColor: Color.BLACK,
          outlineWidth: 1,
          style: LabelStyle.FILL_AND_OUTLINE,
          verticalOrigin: VerticalOrigin.BOTTOM,
          pixelOffset: new Cartesian2(0, -10)
        }
      });

      console.log('[PM Frontend] 테스트 마커 추가 성공:', entity);

      // 부모 Viewer를 해당 위치로 이동
      viewer.camera.flyTo({
        destination: Cartesian3.fromDegrees(129.0756, 35.1796, 1000)
      });

    } catch (error) {
      console.error('[PM Frontend] 부모 Viewer 제어 실패:', error);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h3>PM Frontend - Cesium Integration</h3>
      
      {isUsingParentViewer ? (
        <div>
          <p style={{ color: 'green' }}>✅ 부모 Cesium Viewer 연결됨</p>
          <p>부모 Viewer에 테스트 마커가 추가되었습니다.</p>
          <button onClick={() => testParentViewerControl(parentViewer)}>
            부모 Viewer 테스트 재실행
          </button>
        </div>
      ) : (
        <div>
          <p style={{ color: 'blue' }}>🔧 독립 모드 - 자체 Cesium Viewer</p>
          <div 
            ref={cesiumContainer}
            style={{ 
              width: '100%', 
              height: '500px',
              border: '1px solid #ccc',
              marginTop: '10px'
            }}
          />
        </div>
      )}
    </div>
  );
};

export default CesiumViewer;