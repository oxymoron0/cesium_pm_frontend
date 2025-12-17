import tailwindcss from '@tailwindcss/postcss';
import prefixSelector from 'postcss-prefix-selector';
import autoprefixer from 'autoprefixer';
import postcssForceImportant from './postcss-force-important.js';

export default {
  plugins: [
    // 1. Tailwind CSS 처리
    tailwindcss({ config: './tailwind.config.js' }),

    // 2. 선택자에 .pm-frontend-scope 접두사 추가
    prefixSelector({
      prefix: '.pm-frontend-scope',
      exclude: [
        /^html/,
        /^body/,
        /^:root/,
        /^\.cesium/,           // Cesium 관련 모든 클래스
        /^\.pm-frontend-scope/ // 격리 레이어 자체 (이중 접두사 방지)
        // 참고: * 선택자는 제외하지 않음 - Tailwind preflight가 scope 내에서만 적용되도록
      ]
    }),

    // 3. 모든 CSS 속성에 !important 추가 (부모 앱 스타일 완전 무시)
    postcssForceImportant(),

    // 4. 브라우저 호환성
    autoprefixer(),
  ],
}