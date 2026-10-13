import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { SCHEMA, CATEGORIES } from './schema';

type DB = Database.Database;
const g = globalThis as unknown as { __csc_db?: DB };

export function getDb(): DB {
  if (g.__csc_db) return g.__csc_db;
  const vol = process.env.RAILWAY_VOLUME_MOUNT_PATH;
  const file = process.env.DATABASE_PATH || (vol ? path.join(vol, 'store.db') : './data/store.db');
  if (file !== ':memory:') fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  const db = new Database(file);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA);
  const ins = db.prepare('INSERT OR IGNORE INTO categories (slug, name, blurb, sort) VALUES (?,?,?,?)');
  CATEGORIES.forEach((c, i) => ins.run(c.slug, c.name, c.blurb, i));
  g.__csc_db = db;
  return db;
}

export function resetDbForTests() {
  if (g.__csc_db) g.__csc_db.close();
  g.__csc_db = undefined;
  return getDb();
}
