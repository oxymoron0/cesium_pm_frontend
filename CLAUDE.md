# PM Frontend

## 프로젝트 개요
**Qiankun 마이크로 프론트엔드 자식 애플리케이션**
- **목적**: 부모 앱의 Cesium Viewer를 자식 앱의 Cesium 라이브러리로 조작
- **기술 스택**: React 19 + TypeScript + Vite + MobX + Cesium 1.115
- **아키텍처**: MSA 구조로 독립적 개발/배포 가능

## 완료된 작업

### ✅ 1-3단계: 마이크로 프론트엔드 기반 구축 (8월 16일)
- **기술 스택 현대화**: Webpack → Vite (빌드 시간 99% 단축), Redux → MobX
- **Qiankun 통합**: Lifecycle 함수, UMD 빌드, 부모 앱 연동 완료
- **Cesium 상호작용**: 부모-자식 간 `window.cviewer` 기반 완벽 제어

### ✅ 4-5단계: 멀티 페이지 및 스타일링 시스템 (8월 17일)
- **다중 페이지 빌드**: 환경변수 기반 페이지별 독립 UMD 번들 생성
- **Tailwind CSS 4.x**: UMD 빌드에서 `@source` 지시어로 클래스 누락 해결

### ✅ 6단계: 독립 개발 환경 및 아키텍처 분리 (8월 17일)

#### 핵심 성과
- **독립 개발 환경**: 부모 앱 없이 `pnpm dev`로 즉시 테스트 가능
- **환경별 자동 분기**: Qiankun/독립 모드 자동 감지 및 전환
- **전체 화면 Cesium**: 메인 화면 + 오버레이 제어패널 구조  
- **아키텍처 분리**: CesiumViewer(생성) + cesiumControls(제어) + UI(상태관리)

#### 구현 결과
```typescript
// 환경 자동 감지 및 분기
const isQiankun = (window as any).__POWERED_BY_QIANKUN__
// 독립: 자체 Viewer 생성 + window.cviewer 설정
// Qiankun: 부모 window.cviewer 사용
```

**개발자 경험 개선**:
- 개발 모드: 전체 화면 독립 Cesium + 제어패널
- 프로덕션: 부모 Viewer 제어 + 제어패널만 표시  
- 제어 함수: `window.cviewer` 인자로 받아 양쪽 환경 동일 API

## 🎯 다음 단계 (8월 18일 예정)

### 7단계: Token 관리 및 부모-자식 Props 통신 시스템

#### 해결해야 할 문제
- **Cesium Ion Token 하드코딩**: 현재 CesiumViewer.tsx에 토큰 하드코딩됨
- **부모 앱 Props 통신 부재**: 부모 앱에서 자식 앱으로 데이터 전달 방법 없음

#### 구현 목표
- Token을 환경변수 또는 부모 props로 동적 주입
- Qiankun mount props를 통한 양방향 통신 시스템 구축
- Props 타입 안전성 확보 및 독립 개발 환경에서 mock 처리

## 📊 성과 지표
- **빌드 시간**: 460초 → 5초 (99% 개선)
- **타입 안전성**: 100% TypeScript 지원
- **기술 부채**: 레거시 Webpack/Babel 설정 완전 제거
- **개발 환경**: 부모 앱 의존성 제거로 독립 개발 가능

## 현재 아키텍처

### 페이지별 독립 번들 구조
```
src/pages/
├── SamplePage/
│   ├── index.tsx        # Qiankun lifecycle + 엔트리
│   ├── App.tsx          # React 컴포넌트
│   └── index.html       # HTML 템플릿

dist/
├── SamplePage.umd.js    # 독립 UMD 번들 (253KB)
├── SamplePage.html      # 부모 앱 로딩용
└── cesium/              # 공유 리소스
```

### 빌드 시스템
```typescript
// vite.config.ts - 환경변수 기반 단일 페이지 빌드
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

## 기술 스택 변경사항
- **기존**: Babel + Webpack + Redux + 내부 라이브러리
- **현재**: TypeScript + Vite + MobX + 공식 라이브러리
- **결과**: 빌드 시간 99% 단축, 타입 안전성 확보, 레거시 의존성 제거

## Claude 협업 가이드라인

### 요구사항
**이 프로젝트에서 Claude는 반드시 다음 접근 방식을 사용해야 합니다:**

1. **Deep Technical Analysis (깊이 있는 기술 분석)**
   - 단순한 구현을 넘어서 아키텍처 수준에서 분석
   - 의존성 간의 상호작용과 잠재적 충돌 검토
   - 성능, 보안, 유지보수성 관점에서 다각도 검토

2. **Critical Thinking (비판적 사고)**
   - 기존 기술 선택의 문제점과 개선점 명확히 식별
   - 대안 솔루션의 장단점 비교 분석
   - 기업 환경의 제약사항과 기술적 이상 사이의 균형점 모색

3. **Systematic Problem Solving (체계적 문제 해결)**
   - 문제의 근본 원인 분석 (root cause analysis)
   - 단계별 해결 방안 수립 및 검증 방법 제시
   - 예상되는 부작용과 리스크 미리 식별

4. **Professional Standards (전문성 유지)**
   - 산업 표준과 베스트 프랙티스 적용
   - 코드 품질, 타입 안전성, 테스트 가능성 고려
   - 장기적 확장성과 팀 협업을 고려한 설계

### 금지사항
- 표면적이거나 일회성 해결책 제안
- 충분한 분석 없이 라이브러리나 도구 추천
- 기업 환경의 복잡성을 무시한 이상적 솔루션만 제시
- 기존 코드베이스와의 호환성을 고려하지 않은 접근
- 검증 없는 성공 주장 (예: "완벽한 구현 완료", "정확히 렌더링됩니다")

### 개발 워크플로우
- **필수 순서**: 구현 → 테스트 → 실패 시 롤백 → 새로운 방법 시도
- **검증 원칙**: 모든 변경사항은 실제 테스트 후 결과 보고
- **실패 처리**: 즉시 이전 상태로 롤백하여 코드베이스 안정성 유지

### 예상 시나리오
이 프로젝트는 다음과 같은 복잡한 기술적 도전을 포함합니다:
- 마이크로 프론트엔드 아키텍처의 복잡성
- 레거시 시스템과의 통합 요구사항
- 기업 내부 라이브러리 생태계의 한계
- 개발팀의 기술 스택 전환 과정

**Claude는 이러한 현실적 제약사항을 충분히 고려하여 실용적이면서도 기술적으로 우수한 솔루션을 제시해야 합니다.**
- to memorize