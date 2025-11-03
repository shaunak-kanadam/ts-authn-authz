// src/modules/auth/utils/email.service.ts
import { Resend } from "resend";
import { env } from "@/config/env";
import { logger } from "@/lib/logger";

const resend = new Resend(env.RESEND_API_KEY);

/**
 * Sends a verification email with a verification link.
 */
export async function sendVerificationEmail(email: string, name?: string | null, token?: string) {
  try {
    const verifyUrl = `${env.APP_URL}/verify-email?token=${token}`;
    const subject = `Verify your ${env.APP_NAME} account`;
    const html = `
      <p>Hi ${name || "there"},</p>
      <p>Welcome to <b>${env.APP_NAME}</b>! Please verify your email by clicking the button below:</p>
      <p><a href="${verifyUrl}" style="padding:10px 16px;background:#2563eb;color:#fff;border-radius:6px;text-decoration:none">Verify Email</a></p>
      <p>If you didn’t sign up, you can ignore this message.</p>
      <p>— The ${env.APP_NAME} Team</p>
    `;

    await resend.emails.send({
      from: `${env.APP_NAME} <no-reply@${new URL(env.APP_URL).hostname}>`,
      to: email,
      subject,
      html,
    });

    logger.info("Verification email sent", { email });
  } catch (err: any) {
    logger.error("Failed to send verification email", { error: err.message });
  }
}
