import { Request, Response } from "express";
import { z } from "zod";
import { AuthService } from "../services/auth.service";

const authService = new AuthService();

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function registerController(req: Request, res: Response) {
  const data = RegisterSchema.parse(req.body);
  const user = await authService.register(data);
  res.status(201).json(user);
}

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export async function loginController(req: Request, res: Response) {
  const data = LoginSchema.parse(req.body);
  const tokens = await authService.login(data);
  res.json(tokens);
}
