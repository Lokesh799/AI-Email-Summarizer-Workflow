#!/usr/bin/env node
// Post-install script to create ajv shim files
// Run this after npm install to ensure shims exist

const fs = require('fs');
const path = require('path');

const shims = [
  {
    file: 'ajv/dist/jtd.js',
    content: `// Shim for ajv/dist/jtd to fix Fastify compatibility
function jtd() {
  return {
    compile: () => () => true,
    validate: () => true,
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = jtd;
  module.exports.default = jtd;
}

export default jtd;
export { jtd };
`,
  },
  {
    file: 'ajv/dist/jtd.cjs',
    content: `// CommonJS shim for ajv/dist/jtd
function jtd() {
  return {
    compile: () => () => true,
    validate: () => true,
  };
}

module.exports = jtd;
module.exports.default = jtd;
module.exports.compile = () => () => true;
module.exports.validate = () => true;
`,
  },
  {
    file: 'ajv/dist/standalone.js',
    content: `// Shim for ajv/dist/standalone to fix Fastify compatibility
function standalone() {
  return {
    compile: () => () => true,
    validate: () => true,
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = standalone;
  module.exports.default = standalone;
}

export default standalone;
export { standalone };
`,
  },
  {
    file: 'ajv/dist/standalone.cjs',
    content: `// CommonJS shim for ajv/dist/standalone
function standalone() {
  return {
    compile: () => () => true,
    validate: () => true,
  };
}

module.exports = standalone;
module.exports.default = standalone;
module.exports.compile = () => () => true;
module.exports.validate = () => true;
`,
  },
];

function createShims(baseDir) {
  const nodeModulesPath = path.join(baseDir, 'node_modules');
  
  // Only create if node_modules exists
  if (!fs.existsSync(nodeModulesPath)) {
    console.log(`⚠️  Skipping ${baseDir} - node_modules not found`);
    return;
  }
  
  shims.forEach(({ file, content }) => {
    const filePath = path.join(nodeModulesPath, file);
    const dirPath = path.dirname(filePath);
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    
    // Write shim file
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Created: ${filePath}`);
  });
}

// Create shims in backend and root
const backendDir = path.join(__dirname, '..');
const rootDir = path.join(backendDir, '..');

console.log('Creating ajv shim files...');
createShims(backendDir);
createShims(rootDir);
console.log('✅ All shim files created!');
