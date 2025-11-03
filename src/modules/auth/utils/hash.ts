/**
 * @fileoverview
 * Password hashing utilities — provides helper functions for securely hashing
 * and verifying user passwords using bcrypt.
 *
 * Responsibilities:
 * - Generate salted password hashes for safe storage
 * - Verify plain-text passwords against stored hashes
 *
 * Security Notes:
 * - Uses bcrypt with a 10-round salt factor (adjustable for security/performance)
 * - Never store or log plain passwords
 * - Functions are asynchronous to prevent blocking I/O
 */

import bcrypt from "bcryptjs";

// -----------------------------------------------------------------------------
// 🧂 Hashing — Secure password creation
// -----------------------------------------------------------------------------
/**
 * Hashes a plain-text password with bcrypt.
 * - Adds a cryptographically strong salt
 * - Produces a one-way, irreversible hash
 *
 * @param password - Plain-text password to hash
 * @returns Promise<string> - The hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10); // 🔒 10 rounds of salt
  return bcrypt.hash(password, salt);
}

// -----------------------------------------------------------------------------
// 🔍 Verification — Password check on login
// -----------------------------------------------------------------------------
/**
 * Compares a plain-text password against a hashed value.
 * - Returns true if the hash matches
 * - Safe for constant-time comparison (mitigates timing attacks)
 *
 * @param password - Plain-text password
 * @param hash - Stored hashed password
 * @returns Promise<boolean> - Whether the password matches
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
