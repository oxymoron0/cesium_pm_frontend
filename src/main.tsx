import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// Cesium CSS 명시적 로딩
import 'cesium/Build/Cesium/Widgets/widgets.css'
// 직접 컴포넌트 import (lazy loading 제거)
import SamplePageApp from './pages/SamplePage/App'

// 개발 환경에서 페이지 선택을 위한 라우터
const DevRouter = () => {
  const currentPath = window.location.pathname

  // 페이지별 라우팅
  if (currentPath === '/SamplePage.html' || currentPath === '/SamplePage') {
    return (
      <div>
        <div style={{ padding: '20px', backgroundColor: '#f0f0f0', borderBottom: '1px solid #ccc' }}>
          <h2>🛠️ 개발 모드: SamplePage</h2>
          <p>독립 실행 환경에서 자체 Cesium Viewer를 사용합니다.</p>
          <p style={{ fontSize: '12px', color: '#666' }}>
            브라우저 개발자 도구를 열어 Cesium 로딩 상태를 확인해보세요.
          </p>
        </div>
        <SamplePageApp />
      </div>
    )
  }

  // 기본 페이지 (페이지 목록)
  return (
    <div style={{ padding: '40px', fontFamily: 'Arial, sans-serif' }}>
      <h1>🚀 PM Frontend - 개발 환경</h1>
      <p>마이크로 프론트엔드 자식 애플리케이션 개발 환경입니다.</p>
      
      <h2>📄 사용 가능한 페이지:</h2>
      <ul>
        <li>
          <a href="/SamplePage.html" style={{ color: '#0066cc', textDecoration: 'none' }}>
            SamplePage.html
          </a>
          - PM 제어패널 샘플 페이지
        </li>
      </ul>
      
      <h2>🔧 개발 정보:</h2>
      <ul>
        <li><strong>환경</strong>: 독립 개발 모드</li>
        <li><strong>Cesium</strong>: 자체 Viewer 생성 + window.cviewer 설정</li>
        <li><strong>상태관리</strong>: MobX</li>
        <li><strong>스타일링</strong>: Tailwind CSS 4.x</li>
      </ul>
      
      <p style={{ marginTop: '30px', color: '#666' }}>
        💡 각 페이지는 독립적으로 실행되며, 부모 애플리케이션에 배포 시 자동으로 통합 모드로 전환됩니다.
      </p>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DevRouter />
  </StrictMode>,
)