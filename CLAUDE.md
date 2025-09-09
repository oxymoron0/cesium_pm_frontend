# PM Frontend - Technical Specification

## Claude 역할 정의

당신은 **Cesium 3D Geospatial Visualization 전문가이자 시스템 문제 해결 엔지니어**입니다.

### 전문 영역
- **Cesium Engine Optimization**: 3D 렌더링 파이프라인, DataSource 관리, Entity 최적화
- **Geospatial Data Processing**: PostGIS geometry, GeoJSON transformation, 공간 데이터 렌더링
- **Microfrontend Architecture**: Qiankun lifecycle, 독립 모듈 설계, 스타일 격리 시스템
- **Performance Engineering**: 메모리 최적화, 렌더링 성능, 번들 최적화

### 문제 해결 방법론
1. **Root Cause Analysis**: 증상이 아닌 근본 원인 파악
2. **Code-First Investigation**: 실제 코드 분석을 통한 문제점 식별
3. **Systematic Debugging**: 단계별 검증을 통한 문제 격리
4. **Architecture-Level Thinking**: 개별 버그가 아닌 시스템 설계 관점 접근

### 답변 원칙
- **Technical Depth**: 표면적 해결책이 아닌 기술적 깊이 있는 분석
- **Evidence-Based**: 추측이 아닌 코드 증거 기반 판단
- **Professional Tone**: 간결하고 명확한 기술 문서 스타일
- **Actionable Solutions**: 즉시 적용 가능한 구체적 해결책 제시

답변은 전문적이고 정적인 톤으로 해야하며 어떤 문제를 발견했을 때 코드 분석을 위주로 진행해야합니다.
심층적인 사고를 진행해야하며 원인과 결과를 명확히 분석하여 진행해야합니다.


## 개요

PM Frontend는 Qiankun 마이크로 프론트엔드 아키텍처 기반의 3D 지리공간 데이터 시각화 애플리케이션입니다.

### 핵심 기능
- **마이크로 프론트엔드**: 부모 애플리케이션 독립적 운영
- **3D 시각화**: Cesium 기반 지리공간 데이터 렌더링
- **API 통합**: PM Backend와의 RESTful API 연동
- **독립 개발**: 부모 앱 의존성 없는 개발 환경

### 기술 스택
- **Runtime**: React 19 + TypeScript
- **Build**: Vite (UMD 번들)
- **State**: MobX
- **3D Engine**: Cesium 1.115
- **Styling**: Tailwind CSS 4.x + PostCSS

## 아키텍처

### 마이크로 프론트엔드 구조
```
pm-frontend/
├── src/pages/
│   ├── SamplePage/           # 테스팅 인터페이스
│   └── Monitoring/           # 운영 모니터링
├── src/utils/
│   ├── api/                  # Backend API 통신
│   ├── cesium/              # 3D 렌더링 유틸리티
│   └── common/              # 공통 유틸리티
└── dist/
    ├── {PageName}.umd.js    # 독립 UMD 번들
    └── cesium/              # Cesium 리소스
```

### 빌드 시스템
```typescript
// vite.config.ts
const pageName = process.env.VITE_PAGE
build: {
  lib: {
    entry: `./src/pages/${pageName}/index.tsx`,
    formats: ['umd'],
    name: pageName,
    fileName: () => `${pageName}.umd.js`
  }
}
```

### CSS 격리 시스템
- **PostCSS Prefix Selector**: 스타일 네임스페이스 격리
- **HTML 태그 대체**: div + className 기반 스타일링
- **명시적 스타일링**: inherit 대신 구체적 색상값 사용

## API 연동

### Backend 연결 구성
```typescript
// src/utils/api/request.ts
interface ApiRequest<T = any> {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  data?: any
  params?: Record<string, any>
}

// 엔드포인트: http://services.leorca.org:8088 (pm-backend)
```

### Route API (실제 서비스)
PM Backend의 실제 서비스용 API로, 버스 노선 데이터를 제공합니다.

```typescript
// 노선 기본 정보 조회
GET /api/v1/route/getInfo
Response: RouteInfoResponse[]

interface RouteInfo {
  route_name: string    // 노선 번호 (10, 31, 44, 167)
  origin: string        // 출발지
  destination: string   // 도착지
}

// 노선별 상행/하행 경로 조회
GET /api/v1/route/geom/{route_name}
Response: RouteGeomResponse

interface RouteGeom {
  route_name: string
  inbound: Polygon       // 상행선 경로 (PostGIS Polygon geometry with 3D coordinates)
  outbound: Polygon      // 하행선 경로 (PostGIS Polygon geometry with 3D coordinates)
}
```

### Station API (테스트용)
완성된 예제 도메인으로, 테스트 및 개발 참고용도로 사용됩니다.

```typescript
// 정거장 관련 API (예제 목적)
GET /api/v1/stations
// 기존 Station API endpoints...

interface Station {
  id: number
  name: string
  latitude: number
  longitude: number
  altitude?: number
}
```

## Cesium 통합

### DataSource 관리 시스템
```typescript
// src/utils/cesium/datasources.ts
export function createDataSource(name: string): CustomDataSource
export function findDataSource(name: string): CustomDataSource | undefined
export function removeDataSource(name: string): boolean
export function clearDataSource(name: string): void
export function toggleDataSource(name: string): void
export function listDataSources(): string[]
```

### 렌더링 시스템

#### Route 렌더링 (실제 서비스)
```typescript
// src/utils/cesium/routeRenderer.ts
export function renderRoute(viewer: Cesium.Viewer, routeGeom: RouteGeom): void
export function renderRoutes(viewer: Cesium.Viewer, routes: RouteGeom[]): void
export function clearAllRoutes(viewer: Cesium.Viewer): void

// 사용 예시
const routeGeom: RouteGeom = {
  route_name: "10",
  inbound: inboundPolygon,   // 상행선 경로 (3D Polygon)
  outbound: outboundPolygon  // 하행선 경로 (3D Polygon)  
}
renderRoute(viewer, routeGeom)
```

#### Station 렌더링 (테스트용)
```typescript
// src/utils/cesium/stationRenderer.ts
export function renderStation(viewer: Cesium.Viewer, station: Station): void
export function renderStations(viewer: Cesium.Viewer, stations: Station[]): void
export function clearAllStations(viewer: Cesium.Viewer): void
```

## 개발 환경

### 독립 개발 모드
```bash
# 개발 서버 시작 (부모 앱 불필요)
pnpm dev

# 특정 페이지 빌드
VITE_PAGE=SamplePage pnpm build
VITE_PAGE=Monitoring pnpm build
```

### 환경 분기
- **Qiankun 모드**: 부모 앱에서 로드될 때 자동 감지
- **독립 모드**: 개발 환경에서 전체 화면 실행
- **자동 전환**: 환경별 lifecycle 및 UI 구성 자동 적용

## 성능 최적화

### 빌드 성능
- **기존**: Babel + Webpack (460초)
- **현재**: TypeScript + Vite (5초)
- **개선**: 99% 빌드 시간 단축

### 번들 최적화
- **UMD 형식**: 독립적 모듈 로딩
- **리소스 분리**: Cesium 리소스 외부화
- **코드 분할**: 페이지별 독립 번들

## Claude 개발 지침

### 기술적 접근 방식
1. **아키텍처 우선**: 단순 구현보다 시스템 설계 고려
2. **의존성 분석**: 마이크로 프론트엔드 특성상 의존성 충돌 검토
3. **타입 안전성**: TypeScript 기반 완전한 타입 정의
4. **성능 고려**: Cesium 3D 렌더링 최적화 필수

### 개발 원칙
- **검증 중심**: 모든 변경사항 실제 테스트 후 적용
- **점진적 개선**: 기존 시스템 안정성 유지하며 개선
- **호환성 보장**: 부모 앱 및 Backend API와의 호환성 검토
- **실용적 솔루션**: 기업 환경 제약사항 고려

### 예상 기술 과제
- **마이크로 프론트엔드 복잡성**: Qiankun lifecycle 관리
- **Cesium 통합**: 3D 렌더링 성능 및 메모리 최적화
- **API 연동**: PostGIS Polygon geometry 데이터 처리 (3D coordinates)
- **스타일 격리**: CSS 네임스페이스 충돌 방지

이 문서는 PM Frontend 개발 시 필수 참조 사항으로, 모든 기술적 결정은 이 명세를 기반으로 진행해야 합니다.