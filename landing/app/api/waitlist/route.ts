import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_DIR = process.env.DB_DIR ?? path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'waitlist.db');

function getDb() {
  if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
  const db = new Database(DB_PATH);
  db.exec(`
    CREATE TABLE IF NOT EXISTS waitlist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  return db;
}

export async function POST(req: NextRequest) {
  const { email } = await req.json().catch(() => ({}));

  if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
  }

  const db = getDb();
  try {
    db.prepare('INSERT INTO waitlist (email) VALUES (?)').run(email.toLowerCase().trim());
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes('UNIQUE')) {
      return NextResponse.json({ ok: true, duplicate: true });
    }
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  } finally {
    db.close();
  }
}
