#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

/**
 * PM Frontend Page Generator
 * Creates new microfrontend pages based on minimal Template structure
 */

const SOURCE_TEMPLATE = 'src/pages/Template';
const PAGES_DIRECTORY = 'src/pages';

function validatePageName(name) {
  if (!name || typeof name !== 'string') {
    throw new Error('Page name is required');
  }

  if (!/^[A-Z][a-zA-Z0-9]*$/.test(name)) {
    throw new Error('Page name must be PascalCase (e.g., ProjectDashboard, UserSettings)');
  }

  return name;
}

function checkTemplateExists() {
  if (!fs.existsSync(SOURCE_TEMPLATE)) {
    throw new Error(`Template source not found: ${SOURCE_TEMPLATE}`);
  }
}

function checkPageExists(pageName) {
  const targetPath = path.join(PAGES_DIRECTORY, pageName);
  if (fs.existsSync(targetPath)) {
    throw new Error(`Page already exists: ${targetPath}`);
  }
  return targetPath;
}

function copyTemplateFiles(sourcePath, targetPath) {
  fs.cpSync(sourcePath, targetPath, { recursive: true });
}

function updateFileContent(filePath, replacements) {
  if (!fs.existsSync(filePath)) return;

  let content = fs.readFileSync(filePath, 'utf8');

  for (const [pattern, replacement] of replacements) {
    content = content.replace(pattern, replacement);
  }

  fs.writeFileSync(filePath, content);
}

function generatePage(pageName) {
  try {
    console.log(`Creating page: ${pageName}`);

    validatePageName(pageName);
    checkTemplateExists();
    const targetPath = checkPageExists(pageName);

    // Copy template structure
    copyTemplateFiles(SOURCE_TEMPLATE, targetPath);

    // Define replacement patterns
    const replacements = [
      [/Template/g, pageName],
      [/microapp-Template/g, `microapp-${pageName}`]
    ];

    // Update TypeScript entry point
    updateFileContent(
      path.join(targetPath, 'index.tsx'),
      replacements
    );

    // Update HTML template
    updateFileContent(
      path.join(targetPath, 'index.html'),
      replacements
    );

    // Update React component
    updateFileContent(
      path.join(targetPath, 'App.tsx'),
      [
        [/Template Page/g, `${pageName} Page`],
        [/\[Template\]/g, `[${pageName}]`]
      ]
    );

    console.log(`Page created successfully: ${targetPath}`);
    console.log(`Build command: VITE_PAGE=${pageName} pnpm build`);
    console.log(`Development: pnpm dev (navigate to /${pageName})`);

  } catch (error) {
    console.error(`Error creating page: ${error.message}`);
    process.exit(1);
  }
}

// CLI Interface
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('PM Frontend Page Generator');
    console.log('Usage: pnpm create-page <PageName>');
    console.log('Example: pnpm create-page ProjectDashboard');
    console.log('');
    console.log('Requirements:');
    console.log('- Page name must be PascalCase');
    console.log('- Creates minimal Cesium-enabled microfrontend');
    console.log('- Based on Template page structure');
    process.exit(0);
  }

  if (args.length > 1) {
    console.error('Error: Only one page name allowed');
    process.exit(1);
  }

  generatePage(args[0]);
}

main();