import Database from 'better-sqlite3'
import crypto from 'crypto'
import path from 'path'
import fs from 'fs'
import { config } from './config'

export interface User {
  id: number
  email: string
  password_hash: string
  pat_encrypted: string | null
  pat_iv: string | null
  created_at: string
  updated_at: string
}

let db: Database.Database

export function initDB(): void {
  const dataDir = path.resolve(__dirname, '..', 'data')
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }

  const dbPath = path.join(dataDir, 'ado-plus.db')
  db = new Database(dbPath)

  // WAL mode para mejor concurrencia
  db.pragma('journal_mode = WAL')

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      pat_encrypted TEXT,
      pat_iv TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `)

  console.log('[db] Base de datos inicializada en', dbPath)
}

export function getDB(): Database.Database {
  if (!db) {
    throw new Error('DB no inicializada. Llamá a initDB() primero.')
  }
  return db
}

/**
 * Encripta un PAT usando AES-256-CBC con IV aleatorio.
 * Retorna el texto encriptado en hex y el IV en hex.
 */
export function encryptPAT(plainPat: string): { encrypted: string; iv: string } {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(
    'aes-256-cbc',
    Buffer.from(config.ENCRYPTION_KEY, 'utf-8'),
    iv
  )
  let encrypted = cipher.update(plainPat, 'utf-8', 'hex')
  encrypted += cipher.final('hex')
  return { encrypted, iv: iv.toString('hex') }
}

/**
 * Desencripta un PAT previamente encriptado con encryptPAT().
 */
export function decryptPAT(encrypted: string, iv: string): string {
  const decipher = crypto.createDecipheriv(
    'aes-256-cbc',
    Buffer.from(config.ENCRYPTION_KEY, 'utf-8'),
    Buffer.from(iv, 'hex')
  )
  let decrypted = decipher.update(encrypted, 'hex', 'utf-8')
  decrypted += decipher.final('utf-8')
  return decrypted
}

/**
 * Crea un usuario y devuelve su ID.
 */
export function createUser(
  email: string,
  passwordHash: string,
  encryptedPat?: string,
  patIv?: string
): number {
  const database = getDB()
  const stmt = database.prepare(`
    INSERT INTO users (email, password_hash, pat_encrypted, pat_iv)
    VALUES (?, ?, ?, ?)
  `)
  const result = stmt.run(email, passwordHash, encryptedPat ?? null, patIv ?? null)
  return Number(result.lastInsertRowid)
}

/**
 * Busca un usuario por email.
 */
export function getUserByEmail(email: string): User | null {
  const database = getDB()
  const stmt = database.prepare('SELECT * FROM users WHERE email = ?')
  return (stmt.get(email) as User) ?? null
}

/**
 * Busca un usuario por ID.
 */
export function getUserById(id: number): User | null {
  const database = getDB()
  const stmt = database.prepare('SELECT * FROM users WHERE id = ?')
  return (stmt.get(id) as User) ?? null
}

/**
 * Actualiza el PAT encriptado de un usuario.
 */
export function updatePAT(userId: number, encrypted: string, iv: string): void {
  const database = getDB()
  const stmt = database.prepare(`
    UPDATE users
    SET pat_encrypted = ?, pat_iv = ?, updated_at = datetime('now')
    WHERE id = ?
  `)
  stmt.run(encrypted, iv, userId)
}
