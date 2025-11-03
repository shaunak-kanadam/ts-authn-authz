// src/lib/email.ts
import { Resend } from "resend";
import { env } from "@/config/env";
import { logger } from "@/lib/logger";

const resend = new Resend(env.RESEND_API_KEY);

export async function sendVerificationEmail(email: string, token: string) {
  const verifyUrl = `${env.APP_URL}/auth/verify?token=${token}`;

  try {
    await resend.emails.send({
      from: `${env.APP_NAME} <no-reply@resend.dev>`,
      to: email,
      subject: "Verify your email",
      html: `
        <h2>Welcome to ${env.APP_NAME}</h2>
        <p>Click below to verify your account:</p>
        <a href="${verifyUrl}">Verify Account</a>
        <p>This link expires in 24 hours.</p>
      `,
    });
    logger.info("Verification email sent", { email });
  } catch (error: any) {
    logger.error("Email send failed", { error: error.message });
    throw new Error("Failed to send verification email");
  }
}
