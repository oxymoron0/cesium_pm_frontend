# PM Frontend

Qiankun 마이크로 프론트엔드 기반 Station DataSource 관리 시스템

## 기술 스택

- **React 19** + **TypeScript 5.8.3** + **Vite 7.1.2**
- **MobX 6.13.7** (상태 관리)
- **Cesium 1.115.0** (3D 지도)
- **Qiankun** 마이크로 프론트엔드 호환
- **Station API** (61.98.41.151:8088)

## 빌드 및 배포

### 개발 환경 실행

```bash
# 의존성 설치
pnpm install

# 개발 서버 실행 (단일 페이지 개발용)
pnpm dev
```

### 프로덕션 빌드

```bash
# 모든 페이지 빌드 (권장)
pnpm build

# 특정 페이지만 빌드
VITE_PAGE=SamplePage pnpm build-pages
```

빌드 결과물:
```
dist/
├── SamplePage.umd.js       # Station DataSource 테스트 인터페이스
├── SamplePage.html         # 부모 앱 로딩용
└── cesium/                 # Cesium 리소스
```

### 배포 서버 실행

```bash
# 빌드된 파일 서빙 (프로덕션 테스트용)
pnpm preview --port 3333 --host 0.0.0.0
```

## 주요 기능

### Station DataSource 관리
- **DataSource 생성/삭제**: Cesium CustomDataSource CRUD 기능
- **Station 렌더링**: API 연동 3D 정거장 시각화
- **실시간 테스트**: Panel 기반 테스팅 인터페이스

### API 통합 시스템
```typescript
// Station API 호출
const stations = await request({
  url: '/api/station/all',
  method: 'GET'
})

// Station 렌더링
renderStation(viewer, station)
```

## 아키텍처

### 파일 구조
```
src/
├── pages/SamplePage/        # Station 테스트 인터페이스
├── utils/
│   ├── api/request.ts       # HTTP 클라이언트
│   └── cesium/
│       ├── datasources.ts   # DataSource CRUD
│       └── testRenderer.ts # Station 렌더링
└── components/basic/Panel.tsx
```

### DataSource 시스템
```typescript
// DataSource 관리 함수
createDataSource(name: string): CustomDataSource
removeDataSource(name: string): boolean
toggleDataSource(name: string): void
```

### 빌드 시스템
- **빌드 시간**: 460초 → 5초 (99% 개선)
- **환경변수 기반**: 페이지별 독립 빌드
- **UMD 포맷**: Qiankun 호환 번들 생성
