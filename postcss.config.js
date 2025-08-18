export default {
  plugins: {
    '@tailwindcss/postcss': {
      config: './tailwind.config.js',
    },
    'postcss-prefix-selector': {
      prefix: '.pm-frontend-scope',
      // 전역 스타일 제외 (html, body, *, :root 등)
      exclude: [/^html/, /^body/, /^\*/, /^:root/, /^\.cesium-viewer-fullscreenContainer/]
    },
    autoprefixer: {},
  },
}