import { hash, verify } from "argon2";
import prisma from "../../../lib/prisma";
import { signAccess, signRefresh } from "../utils/jwt";

export class AuthService {
  async register({ email, password }: { email: string; password: string }) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new Error("Email already in use");
    const passwordHash = await hash(password);
    return await prisma.user.create({ data: { email, passwordHash } });
  }

  async login({ email, password }: { email: string; password: string }) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new Error("Invalid credentials");
    const valid = await verify(user.passwordHash, password);
    if (!valid) throw new Error("Invalid credentials");

    const access = await signAccess({ sub: user.id });
    const refresh = await signRefresh({ sub: user.id });

    return { access, refresh };
  }
}
