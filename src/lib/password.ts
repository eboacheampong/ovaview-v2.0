import { randomBytes, pbkdf2Sync } from 'crypto'

const ITERATIONS = 100000
const KEY_LENGTH = 64
const DIGEST = 'sha512'

/**
 * Hash a password using PBKDF2 with a random salt.
 * Returns a string in format: salt:hash (both hex encoded)
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(32).toString('hex')
  const hash = pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST).toString('hex')
  return `${salt}:${hash}`
}

/**
 * Verify a password against a stored hash.
 * The storedHash should be in format: salt:hash
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  // Handle legacy plain-text passwords (for migration)
  if (!storedHash.includes(':')) {
    // Plain text comparison for old passwords
    return password === storedHash
  }

  const [salt, hash] = storedHash.split(':')
  if (!salt || !hash) return false

  const verifyHash = pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST).toString('hex')
  return hash === verifyHash
}

/**
 * Check if a password is already hashed (contains salt:hash format)
 */
export function isPasswordHashed(password: string): boolean {
  return password.includes(':') && password.length > 100
}
