/**
 * @fileoverview
 * Token service — responsible for JWT generation, verification,
 * and refresh token persistence.
 *
 * Responsibilities:
 * - Securely generate and verify RS256-signed access tokens
 * - Create random, hashed refresh tokens and persist them in DB
 * - Revoke refresh tokens on logout or session invalidation
 *
 * Security Notes:
 * - Uses RSA private/public PEM keys loaded via Node's crypto APIs
 * - Refresh tokens are hashed before storage (never stored in plaintext)
 * - Access tokens are stateless and verified via jose’s RS256 signature
 */

import { SignJWT, jwtVerify, JWTPayload } from "jose";
import crypto from "crypto";
import { env } from "@/config/env";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

// -----------------------------------------------------------------------------
// 🔐 PEM Key Loader — Converts RSA PEMs into CryptoKey objects
// -----------------------------------------------------------------------------
function loadKey(pem: string, type: "private" | "public") {
  return type === "private"
    ? crypto.createPrivateKey({ key: pem, format: "pem" })
    : crypto.createPublicKey({ key: pem, format: "pem" });
}

const privateKey = loadKey(env.JWT_PRIVATE_KEY_PEM, "private");
const publicKey = loadKey(env.JWT_PUBLIC_KEY_PEM, "public");

// -----------------------------------------------------------------------------
// 🧩 TokenService Class Definition
// -----------------------------------------------------------------------------
export class TokenService {
  // ---------------------------------------------------------------------------
  // 🪶 Generate Access Token (RS256)
  // ---------------------------------------------------------------------------
  /**
   * Creates a signed JWT access token.
   * - Uses RS256 asymmetric encryption for verification safety
   * - Contains minimal payload (sub, email, type)
   * - Short-lived, stateless, never stored in DB
   */
  async generateAccessToken(payload: JWTPayload) {
    const token = await new SignJWT(payload)
      .setProtectedHeader({ alg: "RS256" })
      .setIssuedAt()
      .setExpirationTime(env.ACCESS_TOKEN_TTL)
      .sign(privateKey);

    logger.debug("Generated access token", { sub: payload.sub });
    return token;
  }

  // ---------------------------------------------------------------------------
  // 🔁 Generate Refresh Token (DB-persisted)
  // ---------------------------------------------------------------------------
  /**
   * Generates a long-lived refresh token tied to a session.
   * - Random 512-bit token → hashed with SHA256 before storage
   * - Each token belongs to one session (user ↔ session ↔ token)
   * - Supports both internal and external users
   */
  async generateRefreshToken(
    id: string,
    sessionId: string,
    userType: "internal" | "external"
  ) {
    // 1️⃣ Generate random token + hash
    const token = crypto.randomBytes(64).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    // 2️⃣ Calculate expiration timestamp
    const expiresAt = new Date(
      Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000
    );

    // 3️⃣ Prepare DB insert payload based on user type
    const data =
      userType === "external"
        ? {
            sessionId,
            tokenHash,
            expiresAt,
            userId: id,
            internalUserId: null,
          }
        : {
            sessionId,
            tokenHash,
            expiresAt,
            userId: null,
            internalUserId: id,
          };

    // 4️⃣ Persist to DB
    await prisma.refreshToken.create({ data });

    logger.debug("Generated refresh token", { id, sessionId, userType });
    return token;
  }

  // ---------------------------------------------------------------------------
  // 🧩 Verify Access Token
  // ---------------------------------------------------------------------------
  /**
   * Verifies and decodes the provided access token.
   * - Uses RS256 public key verification
   * - Throws on invalid or expired tokens
   * - Returns decoded JWT payload
   */
  async verifyAccessToken(token: string) {
    try {
      const { payload } = await jwtVerify(token, publicKey);
      return payload;
    } catch (err: any) {
      logger.warn("Access token verification failed", { message: err.message });
      throw new Error("Invalid or expired token");
    }
  }

  // ---------------------------------------------------------------------------
  // 🚫 Revoke Refresh Tokens by Session
  // ---------------------------------------------------------------------------
  /**
   * Marks all refresh tokens linked to a session as revoked.
   * - Called on logout or session invalidation
   * - Does not delete tokens (keeps audit trail)
   */
  async revokeRefreshTokens(sessionId: string) {
    await prisma.refreshToken.updateMany({
      where: { sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    logger.info("Revoked refresh tokens", { sessionId });
  }
}
