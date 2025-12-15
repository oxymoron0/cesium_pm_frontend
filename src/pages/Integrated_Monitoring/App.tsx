import { useEffect, useState, useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import CesiumViewer from '@/components/CesiumViewer';
import ServiceSwitcher from './components/ServiceSwitcher';
import MonitoringView from './components/views/MonitoringView';
import SimulationView from './components/views/SimulationView';
import PriorityView from './components/views/PriorityView';
import type { ServiceType } from './types';
import { loadConfig } from '@/utils/env';

interface AppProps {
  onCloseMicroApp?: () => void;
  dispatch?: (action: unknown) => void;
}

const App = observer(function App(props: AppProps) {
  const [cesiumStatus, setCesiumStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [currentService, setCurrentService] = useState<ServiceType>('monitoring');

  // Load environment config
  useEffect(() => {
    loadConfig();
  }, []);

  // Cesium 초기화 및 상태 감지
  useEffect(() => {
    const checkCesiumStatus = () => {
      const isQiankun = window.__POWERED_BY_QIANKUN__;
      const parentViewer = window.cviewer;

      if (isQiankun && parentViewer) {
        console.log('[Integrated_Monitoring] 부모 Cesium Viewer 감지됨');
        setCesiumStatus('ready');
      } else if (!isQiankun) {
        console.log('[Integrated_Monitoring] 독립 실행 모드 - Cesium Viewer 초기화 대기');
        const waitForViewer = setInterval(() => {
          if (window.cviewer) {
            console.log('[Integrated_Monitoring] 독립 Cesium Viewer 초기화 완료');
            setCesiumStatus('ready');
            clearInterval(waitForViewer);
          }
        }, 100);

        // 30초 후 타임아웃
        const timeout = setTimeout(() => {
          if (cesiumStatus === 'loading') {
            console.error('[Integrated_Monitoring] Cesium Viewer 초기화 타임아웃');
            setCesiumStatus('error');
            clearInterval(waitForViewer);
          }
        }, 30000);

        return () => {
          clearInterval(waitForViewer);
          clearTimeout(timeout);
        };
      } else {
        console.error('[Integrated_Monitoring] Qiankun 환경이지만 부모 Viewer를 찾을 수 없음');
        setCesiumStatus('error');
      }
    };

    checkCesiumStatus();
  }, [cesiumStatus]);

  // 서비스 전환 핸들러
  const handleServiceChange = useCallback((service: ServiceType) => {
    console.log(`[Integrated_Monitoring] Switching service from ${currentService} to ${service}`);
    setCurrentService(service);
  }, [currentService]);

  const isQiankun = window.__POWERED_BY_QIANKUN__;

  return (
    <div className="relative w-full h-screen overflow-hidden pm-frontend-scope">
      {/* Cesium Viewer (독립 실행 모드에서만 렌더링) */}
      {!isQiankun && <CesiumViewer />}

      {/* 서비스 전환 UI */}
      <ServiceSwitcher
        currentService={currentService}
        onServiceChange={handleServiceChange}
      />

      {/* 모니터링 뷰 */}
      <MonitoringView
        isActive={currentService === 'monitoring'}
        cesiumStatus={cesiumStatus}
        onCloseMicroApp={props.onCloseMicroApp}
      />

      {/* 시뮬레이션 뷰 */}
      <SimulationView
        isActive={currentService === 'simulation'}
        cesiumStatus={cesiumStatus}
        onCloseMicroApp={props.onCloseMicroApp}
        dispatch={props.dispatch}
      />

      {/* 우선순위 뷰 */}
      <PriorityView
        isActive={currentService === 'priority'}
        cesiumStatus={cesiumStatus}
        onCloseMicroApp={props.onCloseMicroApp}
      />

      {/* 에러 상태 */}
      {cesiumStatus === 'error' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-[2000]">
          <div className="text-lg text-red-500">Cesium 초기화 실패</div>
        </div>
      )}
    </div>
  );
});

export default App;
