import { SignJWT, jwtVerify, JWTPayload } from "jose";
import crypto from "crypto";
import { env } from "@/config/env";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

/**
 * Utility to load PEM keys into proper CryptoKey objects.
 */
function loadKey(pem: string, type: "private" | "public") {
  return type === "private"
    ? crypto.createPrivateKey({ key: pem, format: "pem" })
    : crypto.createPublicKey({ key: pem, format: "pem" });
}

const privateKey = loadKey(env.JWT_PRIVATE_KEY_PEM, "private");
const publicKey = loadKey(env.JWT_PUBLIC_KEY_PEM, "public");

export class TokenService {
  /**
   * 🪶 Generate Access Token (RS256)
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

  /**
   * 🔁 Generate Refresh Token (supports internal + external)
   */
async generateRefreshToken(
  id: string,
  sessionId: string,
  userType: "internal" | "external"
) {
  const token = crypto.randomBytes(64).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const expiresAt = new Date(
    Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000
  );

  // 👇 Explicit conditional data creation
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

  await prisma.refreshToken.create({ data });

  logger.debug("Generated refresh token", { id, sessionId, userType });
  return token;
}


  /**
   * 🧩 Verify Access Token
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

  /**
   * 🚫 Revoke Refresh Tokens by Session
   */
  async revokeRefreshTokens(sessionId: string) {
    await prisma.refreshToken.updateMany({
      where: { sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    logger.info("Revoked refresh tokens", { sessionId });
  }
}
