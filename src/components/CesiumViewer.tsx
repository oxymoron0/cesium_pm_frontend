import { useEffect, useRef, useState } from 'react';
import { Viewer, Ion, Color, Cartesian3, Cartesian2, HeightReference, LabelStyle, VerticalOrigin, UrlTemplateImageryProvider, Terrain, Ellipsoid, SkyAtmosphere, Globe, ShadowMode, MapMode2D, ImageryLayer, Rectangle, Scene} from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';


const CesiumViewer = () => {
  const cesiumContainer = useRef<HTMLDivElement>(null);
  const [isUsingParentViewer, setIsUsingParentViewer] = useState(false);

  useEffect(() => {
    // console.log('[PM Frontend] CesiumViewer 초기화 시작');
    // console.log('[PM Frontend] Qiankun 환경:', (window as any).__POWERED_BY_QIANKUN__);
    // console.log('[PM Frontend] 부모 cviewer:', (window as any).cviewer);

    // Cesium Ion 토큰 설정
    Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI2Yzk3OTAxYi1hYzc5LTRjN2QtYmY4ZC0wYmM4NTVjMDgzNDQiLCJpZCI6MTIzMjE4LCJpYXQiOjE3NTIzNTcxNjh9.oZ_Z-44nxEx1he-wa4Dq9EQoz24MrQVQkJE8lynkeJk';
    // console.log('[PM Frontend] Cesium Ion 토큰 설정 완료');

    // Qiankun 환경에서 부모 Viewer 감지
    if (window.__POWERED_BY_QIANKUN__ && window.cviewer) {
      console.log('[PM Frontend] 부모 Cesium Viewer 감지됨, DOM 컨테이너 렌더링 안함');
      setIsUsingParentViewer(true);
      return;
    }

    // vWorld 위성사진 URL Template Provider (한국 영역으로 제한)
    const koreaRectangle = Rectangle.fromDegrees(124.0, 33.0, 132.0, 39.0); // 한국 영역
    const vworldProvider = new UrlTemplateImageryProvider({
      url: 'https://api.vworld.kr/req/wmts/1.0.0/EEB70A84-A772-3BB0-9BCE-FD3C1AC2570A/Satellite/{z}/{y}/{x}.jpeg',
      maximumLevel: 18,
      minimumLevel: 5,
      rectangle: koreaRectangle,
      hasAlphaChannel: false,
    });


    // 독립 환경에서만 Viewer 생성
    const initCesiumViewer = () => {
      if (!cesiumContainer.current) {
        console.warn('[PM Frontend] 컨테이너가 아직 준비되지 않음, 재시도...');
        setTimeout(initCesiumViewer, 100);
        return;
      }

      console.log('[PM Frontend] 독립 Cesium Viewer 생성 시작');
      try {
        Scene.defaultLogDepthBuffer = false;

        const viewer = new Viewer(cesiumContainer.current, {
        // WIDGET SETTING
        geocoder: false,
        // geocoder: Cesium.IonGeocodeProviderType.GOOGLE, // 지도 검색 기능
        homeButton: false, // 최초 좌표로 카메라 이동
        sceneModePicker: false, // 2D, 3D 모드 전환
        baseLayerPicker: false, // BaseLayer, 지도 선택자
        navigationHelpButton: false, // Cesium 조작 도움말
        // navigationInstructionsInitiallyVisible: true, // 최초 시작시 도움말 표출 여부
        // projectionPicker: false, // 투영 방식 선택자: 활성화 하면 대한민국이 빠짐
        animation: false, // 우하단 Clock 형태 애니메이션 제어
        fullscreenButton: false,
        selectionIndicator: false, // Tileset 또는 Entity 선택 시 Point 강조
        infoBox: false, // Tileset 또는 Entity 정보 표시
        vrButton:false,
        timeline: false,
        blurActiveElementOnCanvasFocus: false,
        // globe: false,

        // SCENE SETTING
        scene3DOnly: true, // 2D 모드 제한
        shouldAnimate: false, // 자동 애니메이션 제어, 시간 흐름 킬 것인지
        orderIndependentTranslucency: true,
        shadows: false,
        terrainShadows: ShadowMode.ENABLED, // 지형 그림자 효과 https://cesium.com/learn/ion-sdk/ref-doc/ClockViewModel.html
        mapMode2D: MapMode2D.INFINITE_SCROLL, // 2D 모드 회전 가능 https://cesium.com/learn/ion-sdk/ref-doc/global.html#MapMode2D
        depthPlaneEllipsoidOffset: 0.0, // DepthPlane 오프셋 보정
        msaaSamples: 1, // 멀티샘플링 샘플 수

        // DATA PROVIDER
        // clockViewModel: new Cesium.ClockViewModel(),
        // selectedImageryProviderViewModel: new Cesium.ImageryProviderViewModel(), // https://cesium.com/learn/ion-sdk/ref-doc/ProviderViewModel.html
        // imageryProviderViewModels: Array.<ProviderViewModel>, // https://cesium.com/learn/ion-sdk/ref-doc/ProviderViewModel.html
        // selectedTerrainProviderViewModel: new Cesium.TerrainProviderViewModel(), // https://cesium.com/learn/ion-sdk/ref-doc/ProviderViewModel.html
        // terrainProviderViewModels: Array.<ProviderViewModel>, // https://cesium.com/learn/ion-sdk/ref-doc/ProviderViewModel.html
        // baseLayer: new Cesium.ImageryLayer(
        //   new Cesium.OpenStreetMapImageryProvider({ url: "https://tile.openstreetmap.org/" })
        // ),
        // terrainProvider: Cesium.createWorldTerrainAsync(),
        terrain: Terrain.fromWorldTerrain(),
        // skyBox: false,
        skyAtmosphere: new SkyAtmosphere(Ellipsoid.WGS84),
        globe: new Globe(Ellipsoid.WGS84),
        // mapProjection: Cesium.MapProjection.WAGNER_II,
        // dataSources: new Cesium.DataSourceCollection(),

        // RENDER LOOP SETTING
        useDefaultRenderLoop: true,
        targetFrameRate: 60,
        showRenderLoopErrors: import.meta.env.VITE_DEBUG_MODE === 'true',
        useBrowserRecommendedResolution: false,
        automaticallyTrackDataSourceClocks: true,
        contextOptions: {
          requestWebgl1: false, // WebGL 1.0 비활성화, 2.0 사용
          allowTextureFilterAnisotropic: true,
          webgl: {
            alpha: true,                 // 불필요한 알파 채널 제거
            depth: true,                  // 깊이 테스트 유지
            stencil: true,               // 스텐실 버퍼 미사용
            antialias: false,             // MSAA 비활성화 → 대역폭 절감
            premultipliedAlpha: false,    // alpha 사용 안 하므로 무의미
            preserveDrawingBuffer: false, // 프레임 제출 후 버퍼 자동 초기화
            powerPreference: "high-performance",
            failIfMajorPerformanceCaveat: true,
          },
        },
        maximumRenderTimeChange: 0.0,

        // CREDIT
        creditContainer: document.getElementById('cesium-credit') as HTMLElement,
        creditViewport: document.getElementById('cesium-credit-viewport') as HTMLElement,

        });

        console.log('[PM Frontend] Cesium Viewer 생성 성공:', viewer);

        // vWorld 레이어 추가
        const vworldLayer = new ImageryLayer(vworldProvider);
        viewer.imageryLayers.add(vworldLayer);
        console.log('[PM Frontend] vWorld 레이어 추가 완료');

        // 전역에 Cesium 라이브러리 노출 (개발 환경용)
        window.Cesium = { Viewer, Ion, Color, Cartesian3, Cartesian2, HeightReference, LabelStyle, VerticalOrigin };
        window.cviewer = viewer;
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
      if (window.cviewer && !isUsingParentViewer) {
        console.log('[PM Frontend] Cesium Viewer 정리 시작');
        const viewer = window.cviewer;
        try {
          viewer.destroy();
          delete window.cviewer;
          console.log('[PM Frontend] Cesium Viewer 정리 완료');
        } catch (error) {
          console.error('[PM Frontend] Viewer 정리 중 오류:', error);
        }
      }
    };
  }, [isUsingParentViewer]);

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