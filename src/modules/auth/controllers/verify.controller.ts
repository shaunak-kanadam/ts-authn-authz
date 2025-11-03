/**
 * @fileoverview
 * Email verification controller.
 *
 * Triggered when the user clicks the verification link sent by email.
 * It validates the token, activates the user, and logs the verification event.
 */

import { Request, Response } from "express";
import { AuthService } from "../services/auth.service";
import { logger } from "@/lib/logger";

const authService = new AuthService();

/**
 * ✅ Verify Email Controller
 * - Reads token from query string
 * - Validates and activates user
 */
export async function verifyEmailController(req: Request, res: Response) {
  try {
    const { token } = req.query;
    if (!token || typeof token !== "string") {
      return res.status(400).json({ success: false, message: "Missing or invalid token" });
    }

    const result = await authService.verifyEmail(token);

    logger.info("Email verified successfully", { userId: result.userId });
    res.status(200).json({ success: true, message: "Email verified successfully" });
  } catch (err: any) {
    logger.warn("Email verification failed", { message: err.message });
    res.status(400).json({ success: false, message: err.message });
  }
}
