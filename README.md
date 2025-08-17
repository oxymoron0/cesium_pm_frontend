# PM Frontend - Multi-Page Microfrontend Template

Qiankun 마이크로 프론트엔드 기반의 다중 페이지 템플릿입니다.

## 기술 스택

- **React 19** + **TypeScript 5.8.3** + **Vite 7.1.2**
- **MobX 6.13.7** (상태 관리)
- **Cesium 1.115.0** (3D 지도)
- **Qiankun** 마이크로 프론트엔드 호환

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
├── SamplePage.umd.js       # 독립 UMD 번들
├── SecondSamplePage.umd.js
├── ThirdSamplePage.umd.js
├── SamplePage.html         # 부모 앱 로딩용
├── SecondSamplePage.html
├── ThirdSamplePage.html
└── cesium/                 # Cesium 리소스
```

### 배포 서버 실행

```bash
# 빌드된 파일 서빙 (프로덕션 테스트용)
pnpm preview --port 3333 --host 0.0.0.0
```

### 새 페이지 추가 방법

1. **페이지 디렉토리 생성**:
   ```bash
   mkdir src/pages/NewPageName
   ```

2. **템플릿 파일 복사**:
   ```bash
   # SamplePage를 템플릿으로 사용
   cp src/pages/SamplePage/* src/pages/NewPageName/
   ```

3. **파일 내용 수정**:
   - `index.tsx`: 페이지명을 NewPageName으로 변경
   - `App.tsx`: 컴포넌트 내용 수정
   - `index.html`: title과 div id 수정

4. **빌드 실행**:
   ```bash
   pnpm build
   ```

자동으로 `NewPageName.umd.js`와 `NewPageName.html`이 생성됩니다.

## 아키텍처

### 페이지별 독립 번들
- 각 페이지는 React + MobX + Cesium을 포함한 완전 독립 UMD 번들
- 부모 앱 의존성 최소화 (Qiankun lifecycle만 필요)
- 개별 배포 및 버전 관리 가능

### Qiankun 라이프사이클
```typescript
// 표준 lifecycle 구조
export async function bootstrap() { ... }
export async function mount(props: any) { ... }
export async function unmount() { ... }

// Qiankun 함수 노출
(window as any)[pageName] = { bootstrap, mount, unmount }
```

### 빌드 최적화
- **빌드 시간**: 460초 → 5초 (99% 개선)
- **환경변수 기반**: 페이지별 순차 빌드로 Vite 제한 우회
- **임시 폴더 전략**: 빌드 결과 덮어쓰기 방지
