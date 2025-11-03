/**
 * @fileoverview
 * Authentication service — handles user registration, login, and logout logic.
 *
 * Responsibilities:
 * - Verify credentials and issue access + refresh tokens
 * - Manage session lifecycle for both internal and external users
 * - Record audit logs for login/logout events
 *
 * This is a pure business logic layer (no direct HTTP handling).
 * It is consumed exclusively by the controller layer.
 */

import { prisma } from "@/lib/prisma";
import { verifyPassword, hashPassword } from "../utils/hash";
import { TokenService } from "./token.service";
import { logger } from "@/lib/logger";

// -----------------------------------------------------------------------------
// 🧩 Service Class Definition
// -----------------------------------------------------------------------------
export class AuthService {
  private tokenService = new TokenService();

  // ---------------------------------------------------------------------------
  // 🔐 LOGIN — Handles both internal and external users
  // ---------------------------------------------------------------------------
  async login(
    data: { email: string; password: string },
    userAgent?: string,
    ip?: string
  ) {
    const { email, password } = data;

    // 1️⃣ Try to find internal or external user
    const internal = await prisma.internalUser.findUnique({ where: { email } });
    const external = !internal
      ? await prisma.user.findFirst({ where: { email, deletedAt: null } })
      : null;

    const userType: "internal" | "external" | null = internal
      ? "internal"
      : external
      ? "external"
      : null;

    if (!internal && !external) {
      logger.warn("Login failed: user not found", { email });
      throw new Error("Invalid email or password");
    }

    // 2️⃣ Verify password validity
    const account = internal || external;
    const valid = await verifyPassword(password, account!.passwordHash!);
    if (!valid) {
      logger.warn("Login failed: invalid password", { email });
      throw new Error("Invalid email or password");
    }

    // 3️⃣ Create session for the correct user type
    const session =
      userType === "external"
        ? await prisma.session.create({
            data: { userId: external!.id, userAgent, ip },
          })
        : await prisma.session.create({
            data: { internalUserId: internal!.id, userAgent, ip },
          });

    // 4️⃣ Generate access + refresh tokens
    const subPrefix = userType === "internal" ? "internal:" : "user:";
    const sub = `${subPrefix}${account!.id}`;

    const accessToken = await this.tokenService.generateAccessToken({
      sub,
      email,
      type: userType,
    });

    const refreshToken = await this.tokenService.generateRefreshToken(
      account!.id,
      session.id,
      userType!
    );

    // 5️⃣ Log + audit event
    logger.info("User logged in", { email, userType, sessionId: session.id });

    await prisma.auditLog.create({
      data: {
        action: "LOGIN",
        ipAddress: ip,
        userAgent,
        userId: userType === "external" ? external?.id : null,
        internalUserId: userType === "internal" ? internal?.id : null,
      },
    });

    // 6️⃣ Return structured response
    return {
      userType,
      accessToken,
      refreshToken,
      user: {
        id: account!.id,
        email: account!.email,
        name: account!.name,
      },
    };
  }

  // ---------------------------------------------------------------------------
  // 🧾 REGISTER — Create new external user accounts
  // ---------------------------------------------------------------------------
  async register(data: { email: string; password: string; name?: string }) {
    const { email, password, name } = data;

    // 1️⃣ Check for existing user
    const existing = await prisma.user.findFirst({
      where: { email, deletedAt: null },
    });
    if (existing) throw new Error("User already exists");

    // 2️⃣ Hash password securely
    const passwordHash = await hashPassword(password);

    // 3️⃣ Create user record
    const newUser = await prisma.user.create({
      data: { email, passwordHash, name },
    });

    // 4️⃣ Log event
    logger.info("User registered", { email });

    // 5️⃣ Return created user info
    return {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
    };
  }

  // ---------------------------------------------------------------------------
  // 🚪 LOGOUT — Revoke session & refresh tokens
  // ---------------------------------------------------------------------------
  async logout(accessToken: string) {
    // 1️⃣ Verify token validity
    const payload = await this.tokenService.verifyAccessToken(accessToken);
    const sub = payload.sub as string;
    const type = (payload as any).type as "internal" | "external";
    if (!sub) throw new Error("Invalid access token");

    const id = sub.includes("internal:")
      ? sub.replace("internal:", "")
      : sub.replace("user:", "");

    // 2️⃣ Find active session
    const session = await prisma.session.findFirst({
      where:
        type === "external"
          ? { userId: id, revokedAt: null }
          : { internalUserId: id, revokedAt: null },
      orderBy: { createdAt: "desc" },
    });

    if (!session) {
      logger.warn("Logout requested but no active session", { id, type });
      return { sub, type, message: "No active session" };
    }

    // 3️⃣ Revoke session + refresh tokens
    await prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    await prisma.refreshToken.updateMany({
      where: { sessionId: session.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    // 4️⃣ Record audit log
    logger.info("User logged out", { id, type, sessionId: session.id });
    await prisma.auditLog.create({
      data: {
        action: "LOGOUT",
        ipAddress: session.ip,
        userAgent: session.userAgent,
        userId: type === "external" ? id : null,
        internalUserId: type === "internal" ? id : null,
      },
    });

    // 5️⃣ Return confirmation
    return { sub, type };
  }

// ---------------------------------------------------------------------------
// 🔁 REFRESH — Issue new access + refresh tokens
// ---------------------------------------------------------------------------
async refresh(refreshToken: string) {
  if (!refreshToken) throw new Error("Missing refresh token");

  // 1️⃣ Hash and find stored token
  const crypto = await import("crypto");
  const tokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");

  const storedToken = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { session: true },
  });

  if (!storedToken || storedToken.revokedAt)
    throw new Error("Invalid or revoked refresh token");

  if (storedToken.expiresAt < new Date())
    throw new Error("Refresh token expired");

  const userType = storedToken.userId ? "external" : "internal";
  const userId = storedToken.userId || storedToken.internalUserId;

  // 2️⃣ Generate new access token
  const accessToken = await this.tokenService.generateAccessToken({
    sub: `${userType}:${userId}`,
    type: userType,
  });

  // 3️⃣ Rotate refresh token for security
  const newRefreshToken = await this.tokenService.generateRefreshToken(
    userId!,
    storedToken.sessionId,
    userType
  );

  await prisma.refreshToken.update({
    where: { id: storedToken.id },
    data: { revokedAt: new Date() },
  });

  // 4️⃣ (Optional) Add audit logging
  await prisma.auditLog.create({
    data: {
      action: "TOKEN_REFRESH", // reuse LOGIN for token renewal
      ipAddress: storedToken.session?.ip,
      userAgent: storedToken.session?.userAgent,
      userId: userType === "external" ? userId : null,
      internalUserId: userType === "internal" ? userId : null,
    },
  });

  // 5️⃣ Return new token pair
  return {
    accessToken,
    refreshToken: newRefreshToken,
  };
}

}

