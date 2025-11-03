/**
 * @fileoverview
 * Authentication route definitions — binds HTTP routes to their respective
 * controllers for handling user login and logout requests.
 *
 * Responsibilities:
 * - Define REST API endpoints under `/auth`
 * - Delegate request handling to controller layer
 * - Keep routes thin and declarative (no business logic)
 *
 * Notes:
 * - Controllers handle validation, services handle business logic
 * - Route paths should remain stable; prefer versioned endpoints (e.g., `/v1/auth`)
 */

import { Router } from "express";
import {
  loginController,
  logoutController,
} from "../controllers/auth.controller";
import { refreshController } from "../controllers/refresh.controller";

// -----------------------------------------------------------------------------
// 🚏 Router Initialization
// -----------------------------------------------------------------------------
const router = Router();

// -----------------------------------------------------------------------------
// 🔐 Auth Routes
// -----------------------------------------------------------------------------

/**
 * @route POST /auth/login
 * @description Authenticate a user and return JWT tokens (access + refresh)
 * @access Public
 */
router.post("/login", loginController);

/**
 * @route POST /auth/logout
 * @description Log out a user, revoke tokens, and invalidate active session
 * @access Private (requires Bearer token)
 */
router.post("/logout", logoutController);


router.post("/refresh", refreshController); 

// -----------------------------------------------------------------------------
// 📦 Export Router
// -----------------------------------------------------------------------------
export default router;
