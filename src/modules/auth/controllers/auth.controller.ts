// src/modules/auth/controllers/auth.controller.ts
import { Request, Response } from "express";
import { z } from "zod";
import { AuthService } from "../services/auth.service";
import { logger } from "@/lib/logger";

const authService = new AuthService();

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export async function registerController(req: Request, res: Response) {
  try {
    const data = RegisterSchema.parse(req.body);
    const user = await authService.register(data);
    logger.info("User registered", { email: data.email });
    res.status(201).json({ success: true, user });
  } catch (err: any) {
    logger.error("Registration failed", { error: err.message });
    res.status(400).json({ success: false, message: err.message });
  }
}

export async function loginController(req: Request, res: Response) {
  try {
    const data = LoginSchema.parse(req.body);
    const tokens = await authService.login(data, req.headers["user-agent"], req.ip);
    logger.info("Login success", { email: data.email });
    res.status(200).json({ success: true, ...tokens });
  } catch (err: any) {
    logger.warn("Login failed", { message: err.message });
    res.status(401).json({ success: false, message: err.message });
  }
}

/**
 * 🔐 Logout controller
 */
export async function logoutController(req: Request, res: Response) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Missing or invalid token" });
    }

    const token = authHeader.split(" ")[1];
    const result = await authService.logout(token);

    logger.info("User logged out", { sub: result.sub, type: result.type });
    res.status(200).json({ success: true, message: "Logout successful" });
  } catch (err: any) {
    logger.warn("Logout failed", { message: err.message });
    res.status(400).json({ success: false, message: err.message });
  }
}