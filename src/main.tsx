import React, { Suspense, lazy, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// Cesium CSS 명시적 로딩
import 'cesium/Build/Cesium/Widgets/widgets.css'
import { loadConfig, isConfigLoaded } from '@/utils/env'

// Vite의 glob import를 사용하여 모든 페이지 자동 감지
const pageModules = import.meta.glob('./pages/*/App.tsx', { eager: false })

// 페이지 정보 추출 함수
const getPageInfo = () => {
  const pages: Record<string, { path: string;}> = {}

  Object.keys(pageModules).forEach(path => {
    // './pages/SamplePage/App.tsx' -> 'SamplePage'
    const match = path.match(/\.\/pages\/(.+)\/App\.tsx$/)
    if (match) {
      const pageName = match[1]
      pages[pageName] = {
        path,
      }
    }
  })

  return pages
}

// 페이지 컴포넌트를 동적으로 로드하는 함수
const createPageComponent = (modulePath: string) => {
  return lazy(() =>
    pageModules[modulePath]().then((module: unknown) => ({
       default: (module as { default: React.ComponentType }).default
      })
    )
  )
}

// 개발 환경에서 페이지 선택을 위한 자동 라우터
function DevRouter() {
  const [configLoaded, setConfigLoaded] = useState(isConfigLoaded())
  const currentPath = window.location.pathname
  const pages = getPageInfo()
  const basePath = import.meta.env.DEV ? (import.meta.env.VITE_BASE_PATH || '/') : '/'

  // 앱 시작 시 config.json 로드
  useEffect(() => {
    if (!configLoaded) {
      loadConfig().then(() => {
        setConfigLoaded(true)
      })
    }
  }, [configLoaded])

  // Config 로딩 중 표시
  if (!configLoaded) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p>설정 로딩 중...</p>
      </div>
    )
  }

  // 현재 경로에서 페이지명 추출
  const getPageNameFromPath = (path: string) => {
    // '/SamplePage.html', '/SamplePage', '/monitoring.html', '/monitoring' 등 처리
    const match = path.match(/\/(\w+)(?:\.html)?$/)
    return match ? match[1] : null
  }

  const currentPageName = getPageNameFromPath(currentPath)

  // 특정 페이지 라우팅
  if (currentPageName && pages[currentPageName]) {
    const PageComponent = createPageComponent(pages[currentPageName].path)

    return (
      <div>
        <div style={{ padding: '20px', backgroundColor: '#f0f0f0', borderBottom: '1px solid #ccc' }}>
          <h2>개발 모드: {currentPageName}</h2>
          <p>독립 실행 환경에서 자체 Cesium Viewer를 사용합니다.</p>
          <p style={{ fontSize: '12px', color: '#666' }}>
            브라우저 개발자 도구를 열어 Cesium 로딩 상태를 확인해보세요.
          </p>
        </div>
        <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center' }}>페이지 로딩 중...</div>}>
          <PageComponent />
        </Suspense>
      </div>
    )
  }

  // 기본 페이지 (페이지 목록) - 동적으로 생성
  return (
    <div style={{ padding: '40px', fontFamily: 'Arial, sans-serif' }}>
      <h1>PM Frontend - 개발 환경</h1>
      <p>마이크로 프론트엔드 자식 애플리케이션 개발 환경입니다.</p>

      <h2>사용 가능한 페이지:</h2>
      <ul>
        {Object.entries(pages).map(([pageName]) => (
          <li key={pageName} style={{ marginBottom: '8px' }}>
            <a href={`${basePath}${pageName}.html`} style={{ color: '#0066cc', textDecoration: 'none' }}>
              {pageName}.html
            </a>
          </li>
        ))}
      </ul>

      <h2>개발 정보:</h2>
      <ul>
        <li><strong>환경</strong>: 독립 개발 모드</li>
        <li><strong>Cesium</strong>: 자체 Viewer 생성 + window.cviewer 설정</li>
        <li><strong>상태관리</strong>: MobX</li>
        <li><strong>스타일링</strong>: Tailwind CSS 4.x</li>
      </ul>

      <p style={{ marginTop: '30px', color: '#666' }}>
        부모 애플리케이션에 배포 시 자동으로 통합 모드로 전환됩니다.
      </p>

      <p style={{ marginTop: '20px', padding: '15px', backgroundColor: '#e8f5e8', border: '1px solid #4caf50', borderRadius: '5px' }}>
        <strong>자동 페이지 감지 활성화</strong><br/>
        <code>node create-page.js &lt;PageName&gt;</code>으로 생성한 페이지가 자동으로 등록됩니다.
      </p>
    </div>
  )
}

export default DevRouter

createRoot(document.getElementById('root')!).render(
  <DevRouter />
)