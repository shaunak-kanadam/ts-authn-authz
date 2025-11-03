/**
 * @fileoverview
 * Authentication controllers — define HTTP endpoints for registration, login, and logout.
 *
 * These functions:
 * - Validate input using Zod schemas
 * - Call the AuthService for core business logic
 * - Send standardized JSON responses with proper HTTP codes
 *
 * Controllers should never include Prisma or low-level logic directly.
 */

import { Request, Response } from "express";
import { z } from "zod";
import { AuthService } from "../services/auth.service";
import { logger } from "@/lib/logger";

// -----------------------------------------------------------------------------
// 🧩 Service Instance
// -----------------------------------------------------------------------------
const authService = new AuthService();

// -----------------------------------------------------------------------------
// 🧾 Input Validation Schemas (Zod)
// -----------------------------------------------------------------------------
const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// -----------------------------------------------------------------------------
// 🧱 Controller: Register New User
// -----------------------------------------------------------------------------
/**
 * Handles user registration.
 * - Validates request body
 * - Creates a new external user in the database
 * - Returns sanitized user object
 */
export async function registerController(req: Request, res: Response) {
  try {
    // 1️⃣ Validate input
    const data = RegisterSchema.parse(req.body);

    // 2️⃣ Register new user via AuthService
    const user = await authService.register(data);

    // 3️⃣ Log success + return response
    logger.info("User registered", { email: data.email });
    res.status(201).json({ success: true, user });
  } catch (err: any) {
    logger.error("Registration failed", { error: err.message });
    res.status(400).json({ success: false, message: err.message });
  }
}

// -----------------------------------------------------------------------------
// 🔐 Controller: Login User
// -----------------------------------------------------------------------------
/**
 * Handles both internal and external user login.
 * - Validates credentials
 * - Generates access + refresh tokens
 * - Returns user details and tokens
 */
export async function loginController(req: Request, res: Response) {
  try {
    // 1️⃣ Validate credentials
    const data = LoginSchema.parse(req.body);

    // 2️⃣ Delegate to AuthService
    const tokens = await authService.login(
      data,
      req.headers["user-agent"],
      req.ip
    );

    // 3️⃣ Log + respond
    logger.info("Login success", { email: data.email });
    res.status(200).json({ success: true, ...tokens });
  } catch (err: any) {
    logger.warn("Login failed", { message: err.message });
    res.status(401).json({ success: false, message: err.message });
  }
}

// -----------------------------------------------------------------------------
// 🚪 Controller: Logout User
// -----------------------------------------------------------------------------
/**
 * Handles logout for both internal and external users.
 * - Extracts token from Authorization header
 * - Revokes active session and refresh tokens
 * - Returns confirmation message
 */
export async function logoutController(req: Request, res: Response) {
  try {
    // 1️⃣ Validate bearer token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ success: false, message: "Missing or invalid token" });
    }

    // 2️⃣ Extract token and revoke session
    const token = authHeader.split(" ")[1];
    const result = await authService.logout(token);

    // 3️⃣ Log + respond
    logger.info("User logged out", { sub: result.sub, type: result.type });
    res.status(200).json({ success: true, message: "Logout successful" });
  } catch (err: any) {
    logger.warn("Logout failed", { message: err.message });
    res.status(400).json({ success: false, message: err.message });
  }
}
