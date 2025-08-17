#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

// 사용법 검증
if (process.argv.length !== 3) {
  console.log('사용법: node create-page.js <PageName>');
  console.log('예시: node create-page.js ProjectDashboard');
  process.exit(1);
}

const pageName = process.argv[2];
const sourcePath = 'src/pages/SamplePage';
const targetPath = `src/pages/${pageName}`;

// 이미 존재하는지 확인
if (fs.existsSync(targetPath)) {
  console.error(`❌ 페이지 '${pageName}'이 이미 존재합니다.`);
  process.exit(1);
}

try {
  // 디렉토리 복사
  fs.cpSync(sourcePath, targetPath, { recursive: true });
  
  // index.tsx 파일 수정
  const indexTsxPath = path.join(targetPath, 'index.tsx');
  let indexContent = fs.readFileSync(indexTsxPath, 'utf8');
  indexContent = indexContent
    .replace(/SamplePage/g, pageName)
    .replace(/microapp-SamplePage/g, `microapp-${pageName}`);
  fs.writeFileSync(indexTsxPath, indexContent);
  
  // index.html 파일 수정
  const indexHtmlPath = path.join(targetPath, 'index.html');
  let htmlContent = fs.readFileSync(indexHtmlPath, 'utf8');
  htmlContent = htmlContent
    .replace(/SamplePage/g, pageName)
    .replace(/microapp-SamplePage/g, `microapp-${pageName}`);
  fs.writeFileSync(indexHtmlPath, htmlContent);
  
  // App.tsx 파일 수정 (헤더 텍스트)
  const appTsxPath = path.join(targetPath, 'App.tsx');
  let appContent = fs.readFileSync(appTsxPath, 'utf8');
  appContent = appContent
    .replace('PM Control Panel', `${pageName} Panel`)
    .replace('Microfrontend Controls', `${pageName} Controls`);
  fs.writeFileSync(appTsxPath, appContent);
  
  console.log(`새 프로젝트 '${pageName}' 생성 완료!`);
  console.log(`위치: ${targetPath}`);
  console.log(`빌드: VITE_PAGE=${pageName} pnpm build-pages`);
  
} catch (error) {
  console.error('❌ 페이지 생성 중 오류:', error.message);
  process.exit(1);
}