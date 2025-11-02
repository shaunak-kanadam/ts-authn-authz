
---

```markdown
# 🔐 AuthN & AuthZ Module — Node.js + TypeScript

**Enterprise-grade authentication and authorization module**  
for the JMeter SaaS backend, built with **Node.js**, **TypeScript**, and **Prisma**.

This module handles secure login, registration, role-based access, token rotation, and audit logging —  
the foundation of multi-tenant SaaS authentication.

---

## 🧩 Overview

This module provides:
- **Authentication (AuthN):** Login, signup, refresh tokens, MFA, and session tracking  
- **Authorization (AuthZ):** RBAC with role → permission mapping, org-scoped access, and guards

The system uses **JWT (RS256)** for stateless access tokens, **refresh token rotation**,  
and **multi-tenant org-based roles**.

---

## ⚙️ Tech Stack

| Component | Technology |
|------------|-------------|
| Runtime | Node.js 20+ |
| Language | TypeScript |
| Framework | Express.js |
| ORM | Prisma + MySQL |
| Validation | Zod |
| Tokens | JWT (RS256) + Refresh rotation |
| Password Hashing | Argon2id |
| MFA | TOTP (otplib) |
| Rate Limiting | express-rate-limit |
| Logging | Winston |
| Testing | Jest + Supertest |
| Observability | Prometheus metrics |

---

## 📁 Folder Structure

```

src/modules/auth/
┣ controllers/
┃ ┗ auth.controller.ts
┣ services/
┃ ┗ auth.service.ts
┣ middlewares/
┃ ┣ requireAuth.ts
┃ ┣ requireRole.ts
┃ ┗ requirePermissions.ts
┣ validators/
┃ ┗ auth.zod.ts
┣ utils/
┃ ┣ jwt.ts
┃ ┣ password.ts
┃ ┗ totp.ts
┗ index.ts

````

---

## 🔐 Authentication Features (AuthN)

| Feature | Description |
|----------|--------------|
| **User registration** | Create new user with email + password |
| **Email verification** | Token link (15m TTL) for new accounts |
| **Login** | Verify credentials → issue JWT + refresh token |
| **Refresh rotation** | Rotate refresh token on every use (stored as hash) |
| **Logout** | Revoke session + tokens |
| **Session tracking** | IP, user-agent, device, timestamps |
| **Forgot/Reset password** | Email-based secure reset |
| **MFA (TOTP)** | Google Authenticator / Authy support |
| **Account lockout** | Protects against brute-force attempts |
| **Audit logging** | Records all key actions (login, logout, MFA setup) |

---

## 🧱 Authorization Features (AuthZ)

| Feature | Description |
|----------|-------------|
| **RBAC** | Role-based access per org |
| **Org-based scoping** | Each request tied to org ID in JWT |
| **Permissions** | Role → permission mapping |
| **Guards/Middleware** | Protect routes by role or permission |
| **Custom roles (future)** | Extend for enterprise orgs |
| **API keys (future)** | Service accounts for CI/CD |

---

## 🔑 JWT Token Model

### Access Token (RS256)
- Short-lived (15m)
- Contains:
  ```json
  {
    "sub": "user_123",
    "sid": "session_456",
    "org": "org_789",
    "role": "ADMIN",
    "perms": ["project:read", "project:write"],
    "iat": 1730500000,
    "exp": 1730500900
  }
````

### Refresh Token

* Long-lived (7–30 days)
* Opaque UUID pair (hashed in DB)
* Rotated every refresh request
* Stored in **HttpOnly, Secure, SameSite=Lax cookie**

---

## 🧠 RBAC Example

| Role        | Permissions                     |
| ----------- | ------------------------------- |
| `ORG_OWNER` | All permissions for that org    |
| `ADMIN`     | `user:invite`, `project:*`      |
| `DEVELOPER` | `project:read`, `project:write` |
| `VIEWER`    | `project:read`                  |

Seed these using a Prisma seed script:

```bash
npx prisma db seed
```

---

## 🧰 Middleware Guards

| Guard                                   | Purpose                                  |
| --------------------------------------- | ---------------------------------------- |
| `requireAuth`                           | Verify JWT and attach user to `req.user` |
| `requireOrg`                            | Validate active org context              |
| `requireRole(["ADMIN"])`                | Restrict route to allowed roles          |
| `requirePermissions(["project:write"])` | Fine-grained control                     |

### Example:

```ts
app.post(
  "/projects",
  requireAuth,
  requireOrg,
  requirePermissions(["project:write"]),
  createProjectHandler
);
```

---

## 🔒 Security Design

* Passwords → Argon2id hashing
* JWT → RS256 asymmetric keys (rotatable)
* Refresh tokens → hashed + stored with session ID
* Rate limiting on login/signup
* Zod validation for all request bodies
* Helmet + CORS middleware
* MFA (TOTP) optional
* Full audit event logs per auth action

---

## 🧪 Testing Checklist

| Test Type       | Example                                     |
| --------------- | ------------------------------------------- |
| **Unit**        | Password hashing, token signing, validation |
| **Integration** | Login → Refresh → Logout                    |
| **AuthZ**       | Viewer cannot POST `/projects`              |
| **Security**    | Invalid JWTs, rate limit enforcement        |

Run all tests:

```bash
npm run test
```

---

## 📜 Example .env

```bash
DATABASE_URL="mysql://user:password@localhost:3306/jmeter_saas"
JWT_PRIVATE_KEY_PEM="-----BEGIN PRIVATE KEY-----..."
JWT_PUBLIC_KEY_PEM="-----BEGIN PUBLIC KEY-----..."
ACCESS_TOKEN_TTL="15m"
REFRESH_TOKEN_TTL_DAYS=14
REDIS_URL="redis://localhost:6379"
CORS_ORIGIN="http://localhost:3000"
```

---

## 🚀 Example Workflow

1. User registers with email & password
2. Email verification link sent → user activates account
3. Login → access + refresh JWTs issued
4. Refresh token rotates every 15m
5. All actions logged in `AuditEvent`
6. API calls authorized via JWT role/permissions
7. MFA optional for added security

---

## 🧱 CI/CD Integration

* ✅ Run Jest tests before deploy
* ✅ Check types (`tsc --noEmit`)
* ✅ Build Docker image
* ✅ Push to registry
* ✅ Deploy to ECS/Fly.io

---

## 🧠 Roadmap

| Phase   | Features                         |
| ------- | -------------------------------- |
| **MVP** | JWT Auth, RBAC, refresh rotation |
| **v2**  | MFA (TOTP), session management   |
| **v3**  | SSO (OIDC, SAML), API keys       |
| **v4**  | Custom roles, delegated access   |

---

## 📜 License

MIT License © 2025 — Designed by **[Your Startup Name]**

---

## 📧 Contact

For enterprise integration or partnerships:
**adding email here **
[https://shaunak.com](https://shaunak.com)

```

---
```
