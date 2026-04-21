const fs = require('fs');
const path = require('path');
const { defineConfig } = require('vite');

const ROOT = __dirname;
const STATIC_FILE_NAMES = new Set(['quiz-ai-config.js']);
const EXCLUDED_DIRS = new Set([
  '.git',
  'canvasReQuiz',
  'dist',
  'node_modules',
  'src',
  'public',
]);

function copyRootStaticFiles() {
  return {
    name: 'copy-root-static-files',
    closeBundle() {
      const distDir = path.join(ROOT, 'dist');
      const entries = fs.readdirSync(ROOT, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          if (EXCLUDED_DIRS.has(entry.name)) {
            continue;
          }

          const sourceDir = path.join(ROOT, entry.name);
          const targetDir = path.join(distDir, entry.name);
          fs.cpSync(sourceDir, targetDir, { recursive: true });
          continue;
        }

        if (!STATIC_FILE_NAMES.has(entry.name)) {
          continue;
        }

        const sourceFile = path.join(ROOT, entry.name);
        const targetFile = path.join(distDir, entry.name);
        fs.copyFileSync(sourceFile, targetFile);
      }
    },
  };
}

module.exports = defineConfig({
  plugins: [copyRootStaticFiles()],
});
