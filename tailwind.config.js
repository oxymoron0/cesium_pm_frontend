/** @type {import('tailwindcss').Config} */
export default {
  // .pm-frontend-scope 내부에서만 !important 적용
  important: '.pm-frontend-scope',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'pretendard': ['Pretendard', 'sans-serif'],
      }
    }
  },
  plugins: [],
}