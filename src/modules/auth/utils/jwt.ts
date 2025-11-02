import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { env } from "../../../config/env";

const privateKey = Buffer.from(env.JWT_PRIVATE_KEY_PEM, "utf-8");
const publicKey = Buffer.from(env.JWT_PUBLIC_KEY_PEM, "utf-8");

export async function signAccess(payload: JWTPayload) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "RS256" })
    .setIssuedAt()
    .setExpirationTime(env.ACCESS_TOKEN_TTL)
    .sign(privateKey);
}

export async function signRefresh(payload: JWTPayload) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "RS256" })
    .setIssuedAt()
    .setExpirationTime(`${env.REFRESH_TOKEN_TTL_DAYS}d`)
    .sign(privateKey);
}

export async function verifyAccess(token: string) {
  const { payload } = await jwtVerify(token, publicKey);
  return payload;
}
