import fs from 'fs';
import path from 'path';
import { CaseFile, emptyCase } from './types';

/**
 * Hackathon-grade persistence: JSON files on disk when the FS is writable
 * (local dev), in-process Map otherwise (Vercel). No DB, no auth, no setup.
 */
const DIR = path.join(process.cwd(), '.rentproof-data');
const mem = new Map<string, CaseFile>();

let diskOk = true;
try {
  fs.mkdirSync(DIR, { recursive: true });
} catch {
  diskOk = false;
}

const file = (id: string) => path.join(DIR, `${id.replace(/[^a-zA-Z0-9_-]/g, '')}.json`);

export function getCase(id: string): CaseFile {
  if (mem.has(id)) return mem.get(id)!;
  if (diskOk) {
    try {
      const raw = fs.readFileSync(file(id), 'utf8');
      const parsed = JSON.parse(raw) as CaseFile;
      mem.set(id, parsed);
      return parsed;
    } catch {
      /* fall through */
    }
  }
  const fresh = emptyCase(id);
  mem.set(id, fresh);
  return fresh;
}

export function saveCase(c: CaseFile): CaseFile {
  c.updatedAt = new Date().toISOString();
  mem.set(c.id, c);
  if (diskOk) {
    try {
      fs.writeFileSync(file(c.id), JSON.stringify(c, null, 2));
    } catch {
      /* memory only */
    }
  }
  return c;
}

export function patchCase(id: string, patch: Partial<CaseFile>): CaseFile {
  return saveCase({ ...getCase(id), ...patch, id });
}
