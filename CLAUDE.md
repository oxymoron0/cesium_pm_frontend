# PM Frontend

## 프로젝트 개요
**Qiankun 마이크로 프론트엔드 자식 애플리케이션**
- **목적**: 부모 앱의 Cesium Viewer를 자식 앱의 Cesium 라이브러리로 조작
- **기술 스택**: React 19 + TypeScript + Vite + MobX + Cesium 1.115
- **아키텍처**: MSA 구조로 독립적 개발/배포 가능

## 완료된 작업 (8월 16일 기준)

### ✅ 1단계: 기술 스택 현대화 완료
- **Cesium 라이브러리 교체**: `@cesiumgs/engine` → 공식 `cesium@1.115.0`
- **빌드 도구 전환**: Webpack → Vite 7.1.2 (빌드 시간 8-10분 → 1-2초)
- **상태 관리 교체**: Redux → MobX 6.13.7
- **타입 시스템 강화**: TypeScript 5.8.3 완전 지원
- **내부 라이브러리 제거**: 문제가 있는 `@component/*`, `@packages/*` 의존성 제거

### ✅ 2단계: Qiankun 마이크로 프론트엔드 통합 완료
1. **Lifecycle 함수 구현**: `bootstrap`, `mount`, `unmount` 정상 작동
2. **UMD 빌드 설정**: Vite에서 Webpack 호환 UMD 라이브러리 생성
3. **배포 환경 구성**: Preview 서버로 빌드된 파일 정상 서빙
4. **환경변수 처리**: 프로덕션 빌드에서 환경변수 정상 주입
5. **부모 앱 통합**: `https://lx-test.astbusan.site/leorca-test/pmFrontend.html` 정상 로딩

### ✅ 3단계: 부모-자식 Cesium 상호작용 완료
- **부모 `window.cviewer` 감지**: Qiankun 환경에서 자동 감지
- **Cesium API 호환성**: 자식 앱 Cesium 1.115로 부모 Viewer 완벽 제어
- **실시간 상호작용**: 마커 추가, 카메라 이동, 지형 조작 모두 성공
- **환경별 분기**: 개발(독립 Viewer) / 프로덕션(부모 Viewer) 자동 전환

### 📊 성과 지표
- **빌드 시간**: 460초 → 5초 (99% 개선)
- **타입 안전성**: 100% TypeScript 지원
- **의존성 관리**: 문제있는 13개 의존성 제거
- **기술 부채**: 레거시 Webpack/Babel 설정 완전 제거

### ✅ 최종 해결 (8월 16일)
**Qiankun 마이크로 프론트엔드 통합 성공**

#### 핵심 문제 및 해결책
1. **Lifecycle 함수 미구현 (가장 중요한 문제)**:
   - **문제**: `main.tsx`에 `bootstrap`, `mount`, `unmount` 함수가 실제로 구현되지 않음
   - **해결**: 정상적인 lifecycle 함수 구현
   ```typescript
   export async function bootstrap() {
     console.log('[qiankun] pm-frontend bootstrap');
   }
   
   export async function mount(props: any) {
     console.log('[qiankun] pm-frontend mount', props);
     const { container } = props;
     const domElement = container ? container.querySelector('#microapp-pmFrontend') : document.getElementById('microapp-pmFrontend');
     
     if (domElement) {
       root = createRoot(domElement);
       root.render(<StrictMode><App /></StrictMode>);
     }
   }
   
   export async function unmount() {
     console.log('[qiankun] pm-frontend unmount');
     if (root) {
       root.unmount();
       root = null;
     }
   }
   ```

2. **잘못된 서버 사용**:
   - **문제**: `pnpm dev` (개발 서버)가 소스 파일을 서빙, 빌드된 파일 필요
   - **해결**: `pnpm preview --port 3333 --host 0.0.0.0` 사용으로 빌드된 UMD 파일 서빙

3. **환경변수 처리 문제**:
   - **문제**: `process is not defined` 에러, 프로덕션 빌드에서 환경변수 누락
   - **해결**: `vite.config.ts`의 `define` 섹션으로 환경변수 주입

4. **Cesium Ion 토큰 문제**:
   - **문제**: 빌드 시 토큰이 빈 문자열로 설정되어 401 Unauthorized 에러
   - **해결**: 하드코딩된 토큰으로 임시 해결

#### 성공 요인
- **올바른 진단**: 개발 서버 vs 프리뷰 서버 차이 인식
- **단계적 해결**: Lifecycle → 서버 → 환경변수 → 토큰 순서로 문제 해결
- **실제 환경 테스트**: 로컬 테스트가 아닌 실제 배포 환경에서 검증

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

### ✅ 부모-자식 Cesium 상호작용 구현 완료 (8월 16일)

#### 성공적인 구현 결과
- ✅ **부모 `window.cviewer` 감지**: Qiankun 환경에서 자동 감지
- ✅ **자식 Cesium 라이브러리로 부모 Viewer 제어**: 마커 추가, 카메라 이동 성공
- ✅ **환경별 분기 처리**: 개발/프로덕션 모드 자동 전환

#### 구현된 핵심 기능
```typescript
// 부모 Viewer 감지 및 제어
if ((window as any).__POWERED_BY_QIANKUN__ && (window as any).cviewer) {
  const parentViewer = (window as any).cviewer;
  
  // 자식 Cesium 라이브러리로 부모 Viewer에 마커 추가
  const entity = parentViewer.entities.add({
    name: 'PM Frontend Test Marker',
    position: Cartesian3.fromDegrees(129.0756, 35.1796, 50), // 부산 좌표
    point: { pixelSize: 10, color: Color.YELLOW },
    label: { text: 'PM Frontend Connected!' }
  });
  
  // 부모 Viewer 카메라 제어
  parentViewer.camera.flyTo({
    destination: Cartesian3.fromDegrees(129.0756, 35.1796, 1000)
  });
}
```

#### 검증된 사항
- **API 호환성**: 자식 앱의 Cesium 1.115와 부모 앱 Cesium 라이브러리 간 완벽 호환
- **타입 안전성**: TypeScript 타입 추론 정상 작동
- **상태 동기화**: 부모 Viewer 상태 변경이 실시간 반영
- **에러 핸들링**: 부모 Viewer 미존재 시 독립 모드로 자동 fallback

### 🎯 다음 단계: 기존 구조 호환성 확보

#### 요구사항 분석
**현재 상황**: 단일 애플리케이션 구조 (`src/main.tsx`)
**목표**: 기존 다중 페이지 구조 호환 (`src/pages/**/index.tsx`)

#### 기존 자식 애플리케이션 구조 분석
```
src/pages/
├── Building_Information_Inquiry/
│   ├── index.tsx (엔트리 포인트)
│   └── index.html (HTML 템플릿)
├── Safety_Inspection_Information_Inquiry_and_Management/
│   ├── index.tsx
│   └── index.html
└── ... (기타 페이지들)
```

#### 구현 계획
1. **Multi-entry 빌드 설정**:
   - Vite에서 여러 엔트리 포인트 처리
   - 각 페이지별 독립적인 UMD 빌드 생성
   - HTML 템플릿 자동 생성

2. **Webpack 구조 호환**:
   - `src/pages/**/index.tsx` 패턴 지원
   - 각 페이지별 lifecycle 함수 분리
   - 빌드 결과물 구조 기존과 동일하게 유지

3. **페이지별 라우팅**:
   - PM 관련 페이지들 추가 (`PM_Dashboard`, `PM_Analytics` 등)
   - 각 페이지는 독립적인 마이크로 앱으로 작동
   - 부모 Cesium Viewer 공유 활용

#### 기술적 도전사항
- **Vite Multi-entry**: 기본적으로 SPA 중심, MPA 설정 필요
- **Build 호환성**: Webpack과 동일한 출력 구조 보장
- **Lifecycle 관리**: 페이지별 독립적인 mount/unmount 처리

#### 예상 구조
```
dist/
├── PM_Dashboard.html
├── PM_Dashboard.[hash].js
├── PM_Analytics.html
├── PM_Analytics.[hash].js
└── ... (기타 페이지들)
```

### ✅ 4단계: 다중 페이지 마이크로 프론트엔드 시스템 완성 (8월 17일)

#### 해결된 문제들

**1. Vite 다중 엔트리 UMD 빌드 제한**
- **문제**: Vite는 UMD 포맷에서 다중 엔트리를 지원하지 않음
- **기존 Webpack 방식**: 각 페이지를 독립적인 UMD 번들로 빌드
- **해결**: 환경변수 기반 페이지별 순차 빌드 시스템 구현
```bash
# 각 페이지별 개별 빌드
for page in $(ls src/pages); do 
  VITE_PAGE=$page vite build
done
```

**2. 빌드 결과물 덮어쓰기 문제**
- **문제**: 각 빌드가 `dist/` 폴더를 완전히 정리하여 이전 빌드 결과 삭제
- **해결**: 임시 폴더를 통한 빌드 결과 수집 후 병합
```bash
# 임시 폴더에 각 빌드 결과 수집 후 최종 병합
mkdir temp-builds
for page in $(ls src/pages); do
  VITE_PAGE=$page vite build && cp dist/$page.umd.js temp-builds/
done
cp -r dist/* temp-builds/ && mv temp-builds dist
```

**3. React External 의존성 오류**
- **문제**: `Cannot read properties of undefined (reading 'S')` - 부모 앱에서 React 미제공
- **원인**: 다중 엔트리 설정에서 React를 external로 설정했으나 부모 앱에서 제공하지 않음
- **해결**: React를 번들에 포함하여 완전 독립적인 마이크로 앱 구성

#### 최종 아키텍처

**페이지별 독립 번들 구조**:
```
src/pages/
├── SamplePage/
│   ├── index.tsx        # Qiankun lifecycle + 엔트리
│   ├── App.tsx          # React 컴포넌트
│   └── index.html       # HTML 템플릿
└── SecondSamplePage/
    ├── index.tsx
    ├── App.tsx
    └── index.html

dist/
├── SamplePage.umd.js       # 독립 UMD 번들 (253KB)
├── SecondSamplePage.umd.js # 독립 UMD 번들 (253KB)
├── SamplePage.html         # 부모 앱 로딩용
├── SecondSamplePage.html
└── cesium/                 # 공유 리소스
```

**빌드 시스템**:
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

#### 핵심 성과

**1. 진정한 독립성 달성**:
- 각 페이지가 React + MobX + Cesium을 내장한 완전 독립 번들
- 부모 앱 의존성 최소화 (Qiankun lifecycle만 필요)
- 개별 배포 및 버전 관리 가능

**2. 레거시 호환성 유지**:
- 기존 Webpack 다중 페이지 구조와 동일한 결과물
- 부모 앱 수정 없이 드롭인 교체 가능
- HTML + UMD 조합으로 기존 로딩 방식 그대로 지원

**3. 빌드 성능**:
- **빌드 시간**: 460초 → 5초 (99% 개선)
- **타입 안전성**: 100% TypeScript 지원
- **HMR**: 즉시 피드백

#### 확장성

**새 페이지 추가 방법**:
1. `src/pages/NewPage/` 디렉토리 생성
2. `index.tsx`, `App.tsx`, `index.html` 복사 후 수정
3. `pnpm build` 실행 → 자동으로 `NewPage.umd.js` 생성

**템플릿 구조**:
```typescript
// 표준 lifecycle 구조
export async function bootstrap() { ... }
export async function mount(props: any) { ... }
export async function unmount() { ... }

// Qiankun 함수 노출
(window as any)[pageName] = { bootstrap, mount, unmount }
```

## 기술 스택 변경사항
- **기존**: Babel + Webpack + Redux + 내부 라이브러리
- **현재**: TypeScript + Vite + MobX + 공식 라이브러리
- **결과**: 빌드 시간 99% 단축, 타입 안전성 확보, 레거시 의존성 제거

### Webpack vs Vite UMD 처리 차이점
- **Webpack**: named export를 자동으로 전역 함수로 노출 (`AppName.bootstrap` 형태)
- **Vite**: ES 모듈 중심으로 UMD에서 named export 자동 노출 안됨
- **해결**: 수동으로 `window[AppName]` 객체에 lifecycle 함수 할당

```tsconfig.json
{
  "compilerOptions": {
    "typeRoots": [ "src/@types"],
    "allowSyntheticDefaultImports": true,
    "resolveJsonModule": true,
   // "suppressImplicitAnyIndexErrors": true,
    "noImplicitAny": true,
    "module": "es6",
    "target": "es5",
    "allowJs": true,
    "baseUrl": "./",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "paths": {
      "@/*":["./src/*"]
    },
    "strict": false,
    "jsx": "react-jsx",
  },
  "include": ["src/**/*","typings.d.ts","css.d.ts"]
}
```

```webpack.config.js
// Generated using webpack-cli https://github.com/webpack/webpack-cli

const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const WorkboxWebpackPlugin = require('workbox-webpack-plugin')
const ESLintPlugin = require('eslint-webpack-plugin')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const SplitChunksPlugin = require('webpack/lib/optimize/SplitChunksPlugin')
const pkg = require('./package.json')
const { glob } = require('glob')


const ENTRY_ROOT_DIR = './src/pages'
const isProduction = process.env.NODE_ENV == 'production'

let entries = Object.assign({})
let htmlwebpackPlugin = []
let matches = glob.sync(`${ENTRY_ROOT_DIR}/*/index.tsx`)
matches.map(f => {
  let name = f.match(/.\/src\/pages\/(\S*)\/index.tsx/)[1]
  entries[name] = f
})
let extrnals = {
  '@cesiumgs/cesium-analytics': 'Cesium',
}
if (isProduction) {
  extrnals = {
    '@cesiumgs/cesium-analytics': 'Cesium',
    /**for production, It is recommended to set the following dependencies as external dependencies */
    react: 'React',
    'react-dom': 'ReactDOM',
    moment: 'moment',
    '@turf/turf': 'turf',
    echarts: 'echarts',
    proj4: 'proj4',
    wellknown: 'wellknown',
  }
}
Object.entries(entries).map(v => {
  let htmlTemplte = `${v[1].match(/(.\/src\/pages\/(\S*)\/)index.tsx/)[1]}index.html`
  htmlwebpackPlugin.push(
    new HtmlWebpackPlugin({
      template: path.join(__dirname, htmlTemplte),
      filename: `${v[0]}.html`,
      hash: true,
      chunks: [v[0]],
      inject: true,
      minify: false,
    })
  )
})

//let htmlwebpackPlugin=

const stylesHandler = isProduction ? MiniCssExtractPlugin.loader : 'style-loader'

const config = {
  entry: entries,
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'static/[name].[chunkhash].js',
    library: `[name]`,
    libraryTarget: 'umd',
  },
  devServer: {
    open: true,
    static: {
      directory: path.join(__dirname, 'dist'),
    },
    compress: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
    // historyApiFallback: true,
    hot: true,
    port: 8080,
  },
  externals: extrnals,
  optimization: {
    splitChunks: {
      chunks: 'all',
    },
  },
  plugins: [
    new CleanWebpackPlugin({
      root: path.resolve(__dirname, '..'),
      verbose: true,
      cleanStaleWebpackAssets: true,
    }),
    ...htmlwebpackPlugin,
    new ESLintPlugin({
      emitError: true,
      emitWarning: true,
      failOnError: true,
    }),
    new SplitChunksPlugin({
      chunks: 'async',
      minSize: 1000,
      minChunks: 1,
      maxAsyncRequests: 30,
      maxInitialRequests: 30,
      cacheGroups: {
        defaultVendors: {
          test: /[\\/]node_modules[\\/]]/,
          priorityh: -10,
          reuseExistingChunk: true,
        },
        default: {
          minChunks: 2,
          priority: -20,
          reuseExistingChunk: true,
        },
      },
    }),
    // Add your plugins here
    // Learn more about plugins from https://webpack.js.org/configuration/plugins/
  ],
  module: {
    unknownContextCritical: false,
    rules: [
      {
        test: /\.(ts|tsx|js|jsx)$/i,
        use: ['babel-loader'],
        exclude: ['/node_modules/'],
      },
      {
        test: /\.(css|less)$/i,
        include: /src/,
        oneOf: [
          {
            // 1. 파일 이름이 'overide-'으로 시작하는 경우
            test: /override-.*\.(css|less)$/i,
            use: [
              stylesHandler,
              {
                loader: 'css-loader',
                options: {
                  modules: {
                    localIdentName: `[local]`,
                  },
                },
              },
              {
                loader: 'less-loader',
                options: {
                  lessOptions: {
                    javascriptEnabled: true,
                    modifyVars: {
                      '@ant-prefix': pkg.name,
                    },
                  },
                },
              },
            ],
          },
          {
            use: [
              stylesHandler,
              {
                loader: 'css-loader',
                options: {
                  modules: {
                    localIdentName: `${pkg.name}-[name]-[local]-[hash:base64:20]'`,
                  },
                },
              },
              {
                loader: 'less-loader',
                options: {
                  lessOptions: {
                    javascriptEnabled: true,
                    modifyVars: {
                      '@ant-prefix': pkg.name,
                    },
                  },
                },
              },
            ],
          },
        ],
      },
      {
        test: /\.(less|css)$/,
        include: [/node_modules/, /uicomponents/],
        use: [
          {
            loader: 'style-loader',
          },
          {
            loader: 'css-loader',
          },
          {
            loader: 'less-loader',
            options: {
              lessOptions: {
                javascriptEnabled: true,
                modifyVars: {
                  '@ant-prefix': pkg.name,
                },
              },
            },
          },
        ],
      },
      {
        test: /\.(eot|svg|ttf|woff|woff2|png|jpg|gif|xlsx)$/i,
        type: 'asset',
      },

      // Add your rules for custom modules here
      // Learn more about loaders from https://webpack.js.org/loaders/
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    mainFiles: ['index', 'main'],
    extensions: ['.tsx', '.ts', '.jsx', '.js', '...'],
  },
}

module.exports = () => {
  if (isProduction) {
    config.mode = 'production'
    config.plugins.push(new MiniCssExtractPlugin())
    config.plugins.push(new WorkboxWebpackPlugin.GenerateSW())
  } else {
    config.mode = 'development'
  }
  return config
}
```

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
- to memorize