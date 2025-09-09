#!/usr/bin/env node

/**
 * Simple packaging script for AiDM Extension
 * Creates a VSIX package using vsce
 */

const fs = require('fs');
const { execSync } = require('child_process');

console.log('📦 AiDM Extension Packaging Script\n');

// Read current version from package.json
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const version = packageJson.version;

console.log(`📦 Packaging version: ${version}`);

// Compile with Webpack
console.log('\n🔨 Compiling...');
try {
  execSync('npm run compile', { stdio: 'inherit' });
  console.log('✅ Compilation successful');
} catch (error) {
  console.error('❌ Compilation failed');
  process.exit(1);
}

// Check if vsce is available
try {
  execSync('vsce --version', { stdio: 'pipe' });
} catch (error) {
  console.log('\n📦 Installing vsce...');
  try {
    execSync('npm install -g @vscode/vsce', { stdio: 'inherit' });
  } catch (installError) {
    console.error('❌ Failed to install vsce. Please install manually: npm install -g @vscode/vsce');
    process.exit(1);
  }
}

// Create VSIX package
console.log('\n📦 Creating VSIX...');
try {
  const packageName = `aidm-vscode-extension-${version}.vsix`;
  execSync(`vsce package --out ${packageName}`, { stdio: 'inherit' });
  
  const stats = fs.statSync(packageName);
  console.log(`\n✅ Package created: ${packageName}`);
  console.log(`📁 Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
  
} catch (error) {
  console.error('❌ Failed to create package');
  process.exit(1);
}
