// scripts/compile-templates.js
const fs = require('fs');
const path = require('path');

function compileTemplates() {
  const templatesDir = path.join(__dirname, '..', 'src', 'tasks', 'templates');
  const outputFile = path.join(__dirname, '..', 'src', 'tasks', 'providers', 'CompiledTemplates.ts');
  
  const templateFiles = fs.readdirSync(templatesDir)
    .filter(file => file.endsWith('.html'));
  
  let output = `// Auto-generated template functions\n// Generated from: ${templateFiles.join(', ')}\n\n`;
  
  templateFiles.forEach(file => {
    const templateName = path.basename(file, '.html');
    const templateContent = fs.readFileSync(path.join(templatesDir, file), 'utf8');
    
    // Convert to TypeScript template function
    const functionName = templateName.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
    
    output += `export function ${functionName}Template(data: any): string {\n`;
    output += `  return \`${templateContent.replace(/\{\{(.*?)\}\}/g, '${data.$1}').replace(/`/g, '\\`')}\`;\n`;
    output += `}\n\n`;
  });
  
  fs.writeFileSync(outputFile, output);
  console.log(`Compiled ${templateFiles.length} templates to ${outputFile}`);
}

if (require.main === module) {
  compileTemplates();
}

module.exports = { compileTemplates };