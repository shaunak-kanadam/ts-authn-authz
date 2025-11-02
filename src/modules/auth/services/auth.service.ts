import { prisma } from "@/lib/prisma";
import { verifyPassword, hashPassword } from "../utils/hash";
import { TokenService } from "./token.service";
import { logger } from "@/lib/logger";

export class AuthService {
  private tokenService = new TokenService();

  /**
   * 🔐 User login (internal + external)
   */
  async login(
    data: { email: string; password: string },
    userAgent?: string,
    ip?: string
  ) {
    const { email, password } = data;

    // 1️⃣ Try internal first, then external
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

    // 2️⃣ Verify password
    const account = internal || external;
    const valid = await verifyPassword(password, account!.passwordHash!);
    if (!valid) {
      logger.warn("Login failed: invalid password", { email });
      throw new Error("Invalid email or password");
    }

    // 3️⃣ Create session for both user types
const session =
  userType === "external"
    ? await prisma.session.create({
        data: {
          userId: external!.id,
          userAgent,
          ip,
        },
      })
    : await prisma.session.create({
        data: {
          internalUserId: internal!.id,
          userAgent,
          ip,
        },
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

    // 5️⃣ Log + audit
    logger.info("User logged in", {
      email,
      userType,
      sessionId: session.id,
    });

    await prisma.auditLog.create({
      data: {
        action: "LOGIN",
        ipAddress: ip,
        userAgent,
        userId: userType === "external" ? external?.id : null,
        internalUserId: userType === "internal" ? internal?.id : null,
      },
    });

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

  /**
   * 🧾 Register new external user
   */
  async register(data: { email: string; password: string; name?: string }) {
    const { email, password, name } = data;

    const existing = await prisma.user.findFirst({
      where: { email, deletedAt: null },
    });
    if (existing) {
      throw new Error("User already exists");
    }

    const passwordHash = await hashPassword(password);
    const newUser = await prisma.user.create({
      data: { email, passwordHash, name },
    });

    logger.info("User registered", { email });

    return {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
    };
  }

  /**
   * 🚪 Logout — revoke refresh tokens and session
   */
  async logout(accessToken: string) {
    const payload = await this.tokenService.verifyAccessToken(accessToken);
    const sub = payload.sub as string;
    const type = (payload as any).type as "internal" | "external";

    if (!sub) throw new Error("Invalid access token");

    const id = sub.includes("internal:")
      ? sub.replace("internal:", "")
      : sub.replace("user:", "");

    // 1️⃣ Find active session
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

    // 2️⃣ Revoke session + refresh tokens
    await prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    await prisma.refreshToken.updateMany({
      where: { sessionId: session.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    // 3️⃣ Audit
    logger.info("User logged out", {
      id,
      type,
      sessionId: session.id,
    });

    await prisma.auditLog.create({
      data: {
        action: "LOGOUT",
        ipAddress: session.ip,
        userAgent: session.userAgent,
        userId: type === "external" ? id : null,
        internalUserId: type === "internal" ? id : null,
      },
    });

    return { sub, type };
  }
}
