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


/**
 * 📨 Send Password Reset Email
 */
export async function sendPasswordResetEmail(
  email: string,
  name: string,
  resetUrl: string
) {
  try {
    const subject = "Reset Your Password";
    const html = `
      <h2>Hello ${name || "there"},</h2>
      <p>We received a request to reset your password. Click the button below to set a new one:</p>
      <p><a href="${resetUrl}" style="display:inline-block;padding:10px 16px;background:#007bff;color:white;text-decoration:none;border-radius:4px;">Reset Password</a></p>
      <p>This link will expire in 30 minutes.</p>
      <br/>
      <p>If you didn’t request this, you can safely ignore this email.</p>
      <br/>
      <p>– The ${env.APP_NAME || "Support"} Team</p>
    `;

    await resend.emails.send({
      from: `${env.APP_NAME} <no-reply@${new URL(env.APP_URL).hostname}>`,
      to: email,
      subject,
      html,
    });

    logger.info("Password reset email sent via Resend", { email });
  } catch (err: any) {
    logger.error("Failed to send password reset email", { error: err.message });
    throw new Error("Could not send password reset email");
  }
}