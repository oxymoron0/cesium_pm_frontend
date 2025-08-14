# PM Frontend

## 프로젝트 개요
**Qiankun 마이크로 프론트엔드 자식 애플리케이션**
- **목적**: 부모 앱의 Cesium Viewer를 자식 앱의 Cesium 라이브러리로 조작
- **기술 스택**: React 19 + TypeScript + Vite + MobX + Cesium 1.115
- **아키텍처**: MSA 구조로 독립적 개발/배포 가능

## 완료된 작업
### Cesium 라이브러리 교체
- **기존**: `@cesiumgs/engine` (불완전한 TypeScript 지원, 타입 정의 누락)
- **변경**: 공식 `cesium@1.115.0` + `vite-plugin-cesium`
- **효과**: 정상적인 API 접근, TypeScript 타입 추론 지원

### 내부 라이브러리 현황 분석
**식별된 문제점:**
- `@component/service@13.3.3`: React 18.2 고정 버전, 13개 의존성, 순환 참조 구조
- `@component/ui@12.2.0`: Antd 래퍼로 제한적 활용도
- `@packages/utils@16.1.1`: 역할이 불분명한 유틸리티 모음
- **결론**: 의존성 관리 부재, 모듈 설계 원칙 위반

### 기술 스택 선정
- **상태 관리**: MobX 6.13.7 + mobx-react-lite 4.1.0
- **빌드 도구**: Vite 7.1.2 
- **타입 시스템**: TypeScript 5.8.3
- **Cesium 통합**: vite-plugin-cesium

## 기술적 의사결정

### Cesium 환경 분리 전략
```typescript
// 개발 환경: 독립 Viewer 인스턴스
const viewer = new Viewer(container, {
  terrainProvider: undefined,
  baseLayerPicker: false,
  homeButton: false,
  sceneModePicker: false,
  navigationHelpButton: false,
  animation: false,
  timeline: false
});

// 프로덕션: 부모 앱 Viewer 인스턴스 활용
if (window.__POWERED_BY_QIANKUN__) {
  // window.viewer를 통한 부모-자식 간 Cesium 상호작용
}
```

### MobX 상태 관리 구조
```typescript
class AppStore {
  count = 0;
  name = 'PM Frontend';

  constructor() {
    makeAutoObservable(this);
  }

  increment = () => this.count++;
  setName = (newName: string) => this.name = newName;
  
  get displayText() {
    return `${this.name}: ${this.count}`;
  }
}
```

## 남은 작업

### Qiankun 자식 앱 구성
1. `src/pages/` 디렉터리 구조 생성
2. 마이크로앱 lifecycle 함수 구현 (bootstrap, mount, unmount)
3. Vite UMD 빌드 설정
4. 컨테이너 ID 패턴 정의 (`#microapp-pm-frontend`)

### 통합 검증
1. 부모 앱에서 자식 컴포넌트 렌더링 검증
2. 자식 앱에서 부모 Cesium Viewer 조작 검증  
3. MobX 스토어 격리 및 메모리 누수 방지 확인

### Vite 빌드 설정
```typescript
export default defineConfig({
  build: {
    lib: {
      entry: './src/main.tsx',
      formats: ['umd'],
      name: 'pmFrontend',
      fileName: 'index'
    },
    rollupOptions: {
      external: ['react', 'react-dom'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM'
        }
      }
    }
  },
  server: {
    port: 5173,
    cors: true,
    headers: {
      'Access-Control-Allow-Origin': '*'
    }
  }
});
```

## 개발 컨텍스트
- **기존 프로젝트**: Babel + Webpack + Redux + 내부 라이브러리 지옥
- **신규 프로젝트**: TypeScript + Vite + MobX + 공식 라이브러리
- **마이그레이션 목표**: 기술 부채 제거, 개발 생산성 향상, 유지보수성 개선

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

### 예상 시나리오
이 프로젝트는 다음과 같은 복잡한 기술적 도전을 포함합니다:
- 마이크로 프론트엔드 아키텍처의 복잡성
- 레거시 시스템과의 통합 요구사항
- 기업 내부 라이브러리 생태계의 한계
- 개발팀의 기술 스택 전환 과정

**Claude는 이러한 현실적 제약사항을 충분히 고려하여 실용적이면서도 기술적으로 우수한 솔루션을 제시해야 합니다.**