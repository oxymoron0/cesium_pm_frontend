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
- **결론**: 의존성 관리 부재, 모듈 설계 원칙 위반 -> 사용하지 않음

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

## Qiankun 마이그레이션 진행 상황

### ✅ 완료된 작업
1. **Lifecycle 함수 구현**: `bootstrap`, `mount`, `unmount` 함수 구현 완료
2. **Vite UMD 빌드 설정**: Webpack과 동일한 UMD 라이브러리 방식 구성
3. **CORS 및 네트워크 문제 해결**: 모든 origin 허용, 동적 경로 설정
4. **React 의존성 문제 해결**: External 제거하여 React/ReactDOM 번들에 포함
5. **테스트 HTML 구성**: `/leorca-test/test.html` 경로로 부모 앱 연동

### 🔄 현재 진행 중인 작업
**Qiankun Lifecycle 함수 인식 문제**
- **현상**: `[qiankun]: You need to export lifecycle functions in pmFrontend entry`
- **원인 분석**: Qiankun의 `Ce()` 함수가 lifecycle 함수를 제대로 인식하지 못함
- **시도된 해결책**:
  - ES Module → Plain Object 변환
  - 전역 함수 직접 등록
  - UMD vs IIFE 빌드 방식 변경
  - `exports: 'named'` 설정

### 🔍 기술적 분석 결과

#### Qiankun Lifecycle 검색 로직 (역공학 분석)
```javascript
function an(e, t, n, r) {
    if (Ce(e)) return e;           // 1. 직접 전달된 함수
    if (r) {                       // 2. r이 있으면 n[r] 체크
        var i = n[r];
        if (Ce(i)) return i
    }
    var o = n[t];                  // 3. n[t] 체크 (window[appName])
    if (Ce(o)) return o;
    throw new B("You need to export lifecycle functions in ".concat(t, " entry"))
}
```

- `t` = `"pmFrontend"` (앱 이름)
- `n` = `window` (전역 객체)
- `Ce(x)` = lifecycle 함수 검증 함수 (미확인)

#### 현재 Vite UMD 빌드 구조
```javascript
(function(bl,ya){
  typeof exports=="object"&&typeof module<"u"?ya(exports):
  typeof define=="function"&&define.amd?define(["exports"],ya):
  (bl=typeof globalThis<"u"?globalThis:bl||self,ya(bl.pmFrontend={}))
})(this,(function(bl){"use strict";
  // ... lifecycle 함수들이 bl 객체에 할당됨
}));
```

### 🔧 현재 설정

#### Vite Config
```typescript
build: {
  lib: {
    entry: './src/main.tsx',
    formats: ['umd'],
    name: 'pmFrontend',
    fileName: 'pmFrontend'
  },
  rollupOptions: {
    output: {
      exports: 'named'
    }
  }
}
```

#### Lifecycle 함수 등록 (main.tsx)
```typescript
// 직접 전역에 함수들 등록
(window as any).bootstrap = bootstrap;
(window as any).mount = mount;
(window as any).unmount = unmount;

// pmFrontend 객체도 등록
(window as any).pmFrontend = {
  bootstrap: bootstrap,
  mount: mount,
  unmount: unmount
};
```

### 🚧 미해결 문제
1. **Ce() 함수 정확한 검증 로직 불명**: Qiankun의 lifecycle 함수 유효성 검사 조건 미파악
2. **Webpack vs Vite UMD 차이점**: 동일한 구조임에도 인식되지 않는 근본 원인
3. **부모 앱의 Qiankun 설정**: 정확한 등록 방식 및 설정 불명

### 📋 남은 작업
1. **Ce() 함수 분석**: Qiankun 소스코드 또는 디버깅을 통한 정확한 검증 로직 파악
2. **기존 Webpack 빌드와 비교**: 실제 작동하는 webpack 결과물과 구조적 차이점 분석  
3. **대안적 접근**: 부모 앱 측 설정 변경 또는 다른 lifecycle 등록 방식 검토

### 🔄 다음 시도 방향
1. **Webpack 프로젝트 정확한 모방**: 기존 `Aerial_Photography_Inquiry` 구조 완전 복제
2. **부모 앱 Qiankun 설정 확인**: 등록 방식 및 expected format 파악
3. **런타임 디버깅**: 브라우저에서 Ce() 함수 동작 직접 분석

## 개발 컨텍스트
- **기존 프로젝트**: Babel + Webpack + Redux + 내부 라이브러리 지옥
- **신규 프로젝트**: TypeScript + Vite + MobX + 공식 라이브러리
- **마이그레이션 목표**: 기술 부채 제거, 개발 생산성 향상, 유지보수성 개선

### UMD
- webpack은 이 export된 함수들을 Building_Information_Inquiry.bootstrap, Building_Information_Inquiry.mount 등으로 전역에서 접근 가능하게 만듭니다.

#### Vite의 문제점:
- Vite는 기본적으로 ES 모듈 중심이라 UMD 빌드 시 이런 named export들이 자동으로 전역에 노출되지 않습니다. 
- 특히 Qiankun이 필요로 하는 lifecycle 함수들이 번들 내부에만 있고 외부에서 접근할 수 없게 됩니다.
- webpack은 library 옵션으로 이를 자동 처리하지만, Vite는 추가 설정이 필요합니다.

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