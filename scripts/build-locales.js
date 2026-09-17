import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const localesDir = path.resolve(__dirname, '../src/locales');
const moduleDir = path.resolve(localesDir, 'module');
const languages = ['en', 'zh-TW'];

// Create a placeholder in each module file for different languages
const moduleFiles = fs.readdirSync(moduleDir).filter((file) => file.endsWith('.json'));

moduleFiles.forEach((file) => {
  const filePath = path.resolve(moduleDir, file);
  const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  languages.forEach((lang) => {
    if (!content[lang]) {
      content[lang] = {}; // Add placeholder if not exists
    }
  });

  fs.writeFileSync(filePath, JSON.stringify(content, null, 2));
});

// Merge files
languages.forEach((lang) => {
  const merged = {};
  const moduleFiles = fs.readdirSync(moduleDir).filter((file) => file.endsWith('.json'));

  moduleFiles.forEach((file) => {
    const filePath = path.resolve(moduleDir, file);
    const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    if (content[lang]) {
      Object.assign(merged, content[lang]);
    }
  });

  const outputPath = path.resolve(localesDir, `${lang}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(merged, null, 2));
  console.log(`Successfully generated ${outputPath}`);
});
