#!/usr/bin/env node

/**
 * Quick test script to verify extension commands
 * Run this to check if the extension is properly built
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Testing AiDM Extension Commands...\n');

// Check if out/extension.js exists
const extensionPath = path.join(__dirname, 'out', 'extension.js');
if (fs.existsSync(extensionPath)) {
  console.log('✅ Extension file exists:', extensionPath);
  
  // Check file size
  const stats = fs.statSync(extensionPath);
  console.log('📁 File size:', (stats.size / 1024).toFixed(2), 'KB');
  
  // Check if it's recent
  const age = Date.now() - stats.mtime.getTime();
  const ageMinutes = Math.floor(age / (1000 * 60));
  console.log('⏰ Last modified:', ageMinutes, 'minutes ago');
  
} else {
  console.log('❌ Extension file missing:', extensionPath);
}

// Check package.json commands
const packagePath = path.join(__dirname, 'package.json');
if (fs.existsSync(packagePath)) {
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const commands = packageJson.contributes?.commands || [];
  
  console.log('\n📋 Registered Commands:');
  commands.forEach((cmd, i) => {
    console.log(`  ${i + 1}. ${cmd.command} - ${cmd.title}`);
  });
  
  console.log('\n🎯 Activation Events:');
  const activationEvents = packageJson.activationEvents || [];
  activationEvents.forEach((event, i) => {
    console.log(`  ${i + 1}. ${event}`);
  });
}

// Check if .aidm directory exists
const aidmPath = path.join(__dirname, '.aidm');
if (fs.existsSync(aidmPath)) {
  console.log('\n✅ .aidm directory exists');
  
  const mockCachePath = path.join(aidmPath, 'mock-cache.json');
  if (fs.existsSync(mockCachePath)) {
    const stats = fs.statSync(mockCachePath);
    console.log('📄 Mock cache exists, size:', (stats.size / 1024).toFixed(2), 'KB');
  }
} else {
  console.log('\n❌ .aidm directory missing');
}

console.log('\n🚀 Ready for testing!');
console.log('Try these commands in VS Code:');
console.log('  1. AiDM: Force Test Command');
console.log('  2. AiDM: Startup Test');
console.log('  3. AiDM: Hello (Test Command)');
console.log('  4. AiDM: Test Extension Activation');
