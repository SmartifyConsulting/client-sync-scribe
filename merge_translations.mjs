#!/usr/bin/env node
import { execSync } from 'child_process';
import fs from 'fs';

function getJsonFromBranch(filepath, branch) {
  try {
    const content = execSync(`git show ${branch}:${filepath}`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore']
    });
    return JSON.parse(content);
  } catch {
    return {};
  }
}

function deepMerge(base, updates) {
  for (const [key, value] of Object.entries(updates)) {
    if (!(key in base)) {
      base[key] = value;
    } else if (
      typeof base[key] === 'object' &&
      base[key] !== null &&
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(base[key])
    ) {
      deepMerge(base[key], value);
    }
  }
  return base;
}

const languages = [
  'en', 'af', 'zu', 'xh', 'sn', 'sw', 'ha', 'ig', 'ar', 'de',
  'el', 'es', 'fr', 'he', 'hi', 'it', 'ja', 'ko', 'nl', 'pl',
  'pt', 'ru', 'tr', 'yo', 'zh'
];

for (const lang of languages) {
  const filepath = `src/i18n/locales/${lang}.json`;

  const lovable = getJsonFromBranch(filepath, 'HEAD');
  const backup = getJsonFromBranch(filepath, 'backup/i18n-work');

  const merged = deepMerge({ ...lovable }, backup);

  fs.writeFileSync(filepath, JSON.stringify(merged, null, 2) + '\n');
  console.log(`✓ ${lang}.json merged`);
}

console.log('\n✓ All language files merged successfully!');
