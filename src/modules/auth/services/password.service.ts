/**
 * @fileoverview
 * Handles password reset requests and validations.
 * Generates secure tokens and sends password reset emails.
 */

import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { hashPassword } from "../utils/hash";
import { sendPasswordResetEmail,  } from "../utils/email.service";

export class PasswordService {
  /**
   * 📩 Forgot Password — request password reset
   */
  async requestReset(email: string) {
    const user = await prisma.user.findFirst({
      where: { email, deletedAt: null },
    });

    // 🔒 Security: Do not reveal if user exists
    if (!user) {
      logger.warn("Password reset requested for non-existing email", { email });
      return;
    }

    if (!user.isActive) {
      throw new Error("User account is not active");
    }

    // 1️⃣ Generate secure token
    const token = crypto.randomBytes(48).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    // 2️⃣ Store hashed token
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 min
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    // 3️⃣ Send email
    const resetUrl = `${process.env.APP_URL}/reset-password?token=${token}`;
    await sendPasswordResetEmail(user.email, user.name ?? "", resetUrl);

    // 4️⃣ Log
    logger.info("Password reset email sent", { email });
    return { message: "If an account exists, password reset instructions were sent." };
  }

  /**
   * 🔁 Reset Password — using token
   */
  async resetPassword(token: string, newPassword: string) {
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const stored = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!stored || stored.usedAt) throw new Error("Invalid or used token");
    if (stored.expiresAt < new Date()) throw new Error("Token expired");

    const user = stored.user;
    if (!user) throw new Error("User not found");

    // 1️⃣ Hash new password
    const passwordHash = await hashPassword(newPassword);

    // 2️⃣ Update user password
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    // 3️⃣ Mark token as used
    await prisma.passwordResetToken.update({
      where: { id: stored.id },
      data: { usedAt: new Date() },
    });

    // 4️⃣ Revoke all sessions (security)
    await prisma.session.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    // 5️⃣ Log
    logger.info("Password successfully reset", { userId: user.id });

    return { message: "Password has been reset successfully." };
  }
}
