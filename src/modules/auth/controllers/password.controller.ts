import { Request, Response } from "express";
import { z } from "zod";
import { PasswordService } from "../services/password.service";
import { logger } from "@/lib/logger";

const passwordService = new PasswordService();

const ForgotPasswordSchema = z.object({
  email: z.string().email(),
});

const ResetPasswordSchema = z.object({
  token: z.string().min(10),
  newPassword: z.string().min(8),
});

/**
 * 📩 Forgot Password Controller
 */
export async function forgotPasswordController(req: Request, res: Response) {
  try {
    const { email } = ForgotPasswordSchema.parse(req.body);
    await passwordService.requestReset(email);
    res.status(200).json({
      success: true,
      message: "If that email exists, reset instructions were sent.",
    });
  } catch (err: any) {
    logger.warn("Forgot password failed", { message: err.message });
    res.status(400).json({ success: false, message: err.message });
  }
}

/**
 * 🔁 Reset Password Controller
 */
export async function resetPasswordController(req: Request, res: Response) {
  try {
    const { token, newPassword } = ResetPasswordSchema.parse(req.body);
    const result = await passwordService.resetPassword(token, newPassword);
    res.status(200).json({ success: true, ...result });
  } catch (err: any) {
    logger.warn("Reset password failed", { message: err.message });
    res.status(400).json({ success: false, message: err.message });
  }
}
