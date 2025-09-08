#!/usr/bin/env node

/**
 * Auto-versioning and packaging script for AiDM Extension
 * This script increments the version number and creates a VSIX package
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('📦 AiDM Extension Packaging Script\n');

// Read current package.json
const packagePath = path.join(__dirname, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

// Parse current version
const currentVersion = packageJson.version;
const [major, minor, patch] = currentVersion.split('.').map(Number);

// Increment minor version for new features
const newVersion = `${major}.${minor + 1}.${patch}`;

console.log(`🔄 Version Update:`);
console.log(`   Current: ${currentVersion}`);
console.log(`   New:     ${newVersion}`);

// Update package.json
packageJson.version = newVersion;
packageJson._versionNotes = `Auto-packaged version ${newVersion} - ${new Date().toISOString().split('T')[0]}`;

// Write updated package.json
fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');
console.log('✅ Updated package.json');

// Update VERSION_HISTORY.md
const versionHistoryPath = path.join(__dirname, 'VERSION_HISTORY.md');
if (fs.existsSync(versionHistoryPath)) {
  let versionHistory = fs.readFileSync(versionHistoryPath, 'utf8');
  
  // Add new version entry at the top
  const newVersionEntry = `## Version ${newVersion} (Packaged)
**Date**: ${new Date().toISOString().split('T')[0]}
**Status**: Auto-packaged for testing

### 📦 Packaging Notes
- **Auto-versioned**: Incremented from ${currentVersion}
- **Build Date**: ${new Date().toISOString()}
- **Purpose**: Testing and demo packaging

---

`;
  
  // Insert after the title
  const titleIndex = versionHistory.indexOf('# AiDM VSCode Extension - Version History');
  const insertIndex = versionHistory.indexOf('## Version', titleIndex + 1);
  
  if (insertIndex !== -1) {
    versionHistory = versionHistory.slice(0, insertIndex) + newVersionEntry + versionHistory.slice(insertIndex);
  }
  
  fs.writeFileSync(versionHistoryPath, versionHistory);
  console.log('✅ Updated VERSION_HISTORY.md');
}

// Compile with Webpack
console.log('\n🔨 Compiling with Webpack...');
try {
  execSync('npm run compile', { stdio: 'inherit' });
  console.log('✅ Webpack compilation successful');
} catch (error) {
  console.error('❌ Webpack compilation failed');
  process.exit(1);
}

// Check if vsce is installed
try {
  execSync('vsce --version', { stdio: 'pipe' });
} catch (error) {
  console.log('\n📦 Installing vsce globally...');
  try {
    execSync('npm install -g @vscode/vsce', { stdio: 'inherit' });
    console.log('✅ vsce installed successfully');
  } catch (installError) {
    console.error('❌ Failed to install vsce');
    console.log('Please install manually: npm install -g @vscode/vsce');
    process.exit(1);
  }
}

// Create VSIX package
console.log('\n📦 Creating VSIX package...');
try {
  const packageName = `aidm-vscode-extension-${newVersion}.vsix`;
  execSync(`vsce package --out ${packageName}`, { stdio: 'inherit' });
  console.log(`✅ VSIX package created: ${packageName}`);
  
  // Show package info
  const stats = fs.statSync(packageName);
  console.log(`📁 Package size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
  
} catch (error) {
  console.error('❌ Failed to create VSIX package');
  process.exit(1);
}

// Final summary
console.log('\n🎉 Packaging Complete!');
console.log(`📦 Extension version: ${newVersion}`);
console.log(`📁 Package: aidm-vscode-extension-${newVersion}.vsix`);
console.log('\n🚀 Next steps:');
console.log('1. Test the new version in VS Code');
console.log('2. Use "AiDM: Show Extension Version" to verify');
console.log('3. Install the VSIX package for testing');
console.log(`4. Run: code --install-extension aidm-vscode-extension-${newVersion}.vsix`);
