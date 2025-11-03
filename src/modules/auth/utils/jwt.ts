/**
 * @fileoverview
 * JWT signing and verification utilities — lightweight helpers for generating
 * and validating access and refresh tokens using RS256 asymmetric encryption.
 *
 * Responsibilities:
 * - Create signed access and refresh tokens with expiration times
 * - Verify incoming JWTs using the public key
 *
 * Security Notes:
 * - Uses RSA (RS256) for asymmetric signing — tokens are verifiable without private key
 * - Private/Public keys are read from environment variables
 * - Access tokens are short-lived; refresh tokens use `REFRESH_TOKEN_TTL_DAYS`
 */

import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { env } from "../../../config/env";

// -----------------------------------------------------------------------------
// 🔐 Key Setup — Load RSA keys from environment
// -----------------------------------------------------------------------------
const privateKey = Buffer.from(env.JWT_PRIVATE_KEY_PEM, "utf-8");
const publicKey = Buffer.from(env.JWT_PUBLIC_KEY_PEM, "utf-8");

// -----------------------------------------------------------------------------
// 🪶 Access Token — Short-lived (minutes to hours)
// -----------------------------------------------------------------------------
/**
 * Generates a signed RS256 access token.
 *
 * @param payload - The claims/payload to include in the JWT
 * @returns Promise<string> - A signed access token string
 */
export async function signAccess(payload: JWTPayload): Promise<string> {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "RS256" })
    .setIssuedAt()
    .setExpirationTime(env.ACCESS_TOKEN_TTL)
    .sign(privateKey);
}

// -----------------------------------------------------------------------------
// 🔁 Refresh Token — Long-lived (days)
// -----------------------------------------------------------------------------
/**
 * Generates a signed RS256 refresh token.
 *
 * @param payload - The claims/payload to include in the JWT
 * @returns Promise<string> - A signed refresh token string
 */
export async function signRefresh(payload: JWTPayload): Promise<string> {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "RS256" })
    .setIssuedAt()
    .setExpirationTime(`${env.REFRESH_TOKEN_TTL_DAYS}d`)
    .sign(privateKey);
}

// -----------------------------------------------------------------------------
// 🧩 Verification — Decode and validate RS256 signature
// -----------------------------------------------------------------------------
/**
 * Verifies an access token using the public RSA key.
 *
 * @param token - JWT string to verify
 * @returns Promise<JWTPayload> - Decoded and verified payload
 * @throws Error if the token is invalid or expired
 */
export async function verifyAccess(token: string): Promise<JWTPayload> {
  const { payload } = await jwtVerify(token, publicKey);
  return payload;
}
