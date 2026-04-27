// ============================================================
// File-based persistence
// ============================================================
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'storage');

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function filePath(key) {
  return path.join(DATA_DIR, `${key}.json`);
}

export function save(key, data) {
  ensureDir();
  fs.writeFileSync(filePath(key), JSON.stringify(data, null, 2), 'utf-8');
}

export function load(key, defaultVal = null) {
  ensureDir();
  try {
    if (fs.existsSync(filePath(key))) {
      return JSON.parse(fs.readFileSync(filePath(key), 'utf-8'));
    }
  } catch (_) {}
  return defaultVal;
}

export function getSaveList() {
  ensureDir();
  try {
    return fs.readdirSync(DATA_DIR)
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace('.json', ''));
  } catch (_) { return []; }
}

export function remove(key) {
  const fp = filePath(key);
  if (fs.existsSync(fp)) fs.unlinkSync(fp);
}
