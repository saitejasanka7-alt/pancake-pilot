import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { FinanceDataset } from '../src/shared/types.ts';

export interface StoredUser {
  id: string;
  email: string;
  fullName: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoredMagicToken {
  tokenHash: string;
  userId: string;
  email: string;
  expiresAt: number;
  usedAt: number | null;
}

export interface StoredSession {
  id: string;
  tokenHash: string;
  userId: string;
  createdAt: number;
  expiresAt: number;
  revokedAt: number | null;
}

export interface DbSchema {
  migrationVersion: number;
  users: StoredUser[];
  magicTokens: StoredMagicToken[];
  sessions: StoredSession[];
  userDatasets: Record<string, FinanceDataset>;
}

const DATA_DIR = path.resolve(process.cwd(), '.data');
const DB_PATH = path.join(DATA_DIR, 'pancakepilot-db.json');

const EMPTY_DB: DbSchema = {
  migrationVersion: 2,
  users: [],
  magicTokens: [],
  sessions: [],
  userDatasets: {},
};

let memoryCache: DbSchema | null = null;

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function readDb(): DbSchema {
  if (memoryCache) return memoryCache;
  ensureDir();
  if (!fs.existsSync(DB_PATH)) {
    memoryCache = structuredClone(EMPTY_DB);
    fs.writeFileSync(DB_PATH, JSON.stringify(memoryCache, null, 2), 'utf-8');
    return memoryCache;
  }
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as DbSchema;
    memoryCache = {
      migrationVersion: parsed.migrationVersion ?? 2,
      users: Array.isArray(parsed.users) ? parsed.users : [],
      magicTokens: Array.isArray(parsed.magicTokens) ? parsed.magicTokens : [],
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
      userDatasets: parsed.userDatasets ?? {},
    };
    return memoryCache;
  } catch {
    memoryCache = structuredClone(EMPTY_DB);
    return memoryCache;
  }
}

export function writeDb(next: DbSchema): void {
  ensureDir();
  memoryCache = next;
  const tmpPath = `${DB_PATH}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(next, null, 2), 'utf-8');
  fs.renameSync(tmpPath, DB_PATH);
}

export function hashToken(token: string): string {
  const secret = process.env.SESSION_SECRET || 'pancakepilot-local-dev-salt';
  return crypto.createHmac('sha256', secret).update(token).digest('hex');
}

export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex');
}
