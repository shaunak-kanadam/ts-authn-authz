// src/modules/auth/controllers/refresh.controller.ts
import { Request, Response } from "express";
import { AuthService } from "../services/auth.service";
import { logger } from "@/lib/logger";

const authService = new AuthService();

/**
 * 🔁 Controller: Refresh Token
 * - Validates refresh token
 * - Issues new access + refresh token pair
 */
export async function refreshController(req: Request, res: Response) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken)
      return res.status(400).json({ success: false, message: "Missing refresh token" });

    const tokens = await authService.refresh(refreshToken);
    logger.info("Token refreshed");
    res.status(200).json({ success: true, ...tokens });
  } catch (err: any) {
    logger.warn("Token refresh failed", { message: err.message });
    res.status(401).json({ success: false, message: err.message });
  }
}
