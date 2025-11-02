/**
 * --------------------------------------------------------------
 * JMeter SaaS Platform — Prisma Seed Script
 * --------------------------------------------------------------
 * Seeds:
 *  - Permissions / Roles / Role Mappings
 *  - Internal users (SuperAdmin, Support)
 *  - External test user for login testing
 * --------------------------------------------------------------
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { logger } from "../src/lib/logger";

const prisma = new PrismaClient();

async function main() {
  logger.info("🚀 Starting Prisma seed...");

  // ------------------------------------------------------------
  // 1️⃣ Permissions
  // ------------------------------------------------------------
  const permissions = [
    { name: "user.create", description: "Create a new user" },
    { name: "user.read", description: "View user information" },
    { name: "user.update", description: "Update user details" },
    { name: "user.delete", description: "Delete user accounts" },
    { name: "org.create", description: "Create new organizations" },
    { name: "org.manage", description: "Manage organization settings" },
    { name: "apikey.generate", description: "Generate API keys" },
    { name: "apikey.revoke", description: "Revoke API keys" },
    { name: "audit.view", description: "View audit logs" },
  ];

  for (const p of permissions) {
    const exists = await prisma.permission.findUnique({ where: { name: p.name } });
    if (!exists) {
      await prisma.permission.create({ data: p });
      logger.info(`✅ Created permission: ${p.name}`);
    }
  }

  // ------------------------------------------------------------
  // 2️⃣ Roles
  // ------------------------------------------------------------
  const roles = [
    { name: "SuperAdmin", description: "Full platform access", isInternal: true },
    { name: "PlatformAdmin", description: "Manage orgs and users", isInternal: true },
    { name: "Support", description: "Support-level access", isInternal: true },
    { name: "OrgAdmin", description: "Admin within an organization", isInternal: false },
    { name: "OrgViewer", description: "Read-only access within an organization", isInternal: false },
  ];

  for (const r of roles) {
    const exists = await prisma.role.findUnique({ where: { name: r.name } });
    if (!exists) {
      await prisma.role.create({ data: r });
      logger.info(`✅ Created role: ${r.name}`);
    }
  }

  // ------------------------------------------------------------
  // 3️⃣ Role → Permission Mappings
  // ------------------------------------------------------------
  const roleMap: Record<string, string[]> = {
    SuperAdmin: permissions.map((p) => p.name),
    PlatformAdmin: ["user.create", "user.read", "user.update", "org.create", "org.manage", "audit.view"],
    Support: ["user.read", "audit.view"],
    OrgAdmin: ["user.read", "org.manage", "apikey.generate", "apikey.revoke"],
    OrgViewer: ["user.read", "audit.view"],
  };

  for (const [roleName, permNames] of Object.entries(roleMap)) {
    const role = await prisma.role.findUnique({ where: { name: roleName } });
    if (!role) continue;

    for (const permName of permNames) {
      const perm = await prisma.permission.findUnique({ where: { name: permName } });
      if (!perm) continue;

      const existing = await prisma.rolePermission.findFirst({
        where: { roleId: role.id, permissionId: perm.id },
      });
      if (!existing) {
        await prisma.rolePermission.create({
          data: { roleId: role.id, permissionId: perm.id },
        });
        logger.info(`🔗 Linked ${roleName} → ${permName}`);
      }
    }
  }

  // ------------------------------------------------------------
  // 4️⃣ Internal Users
  // ------------------------------------------------------------
  const internalUsers = [
    {
      email: "admin@platform.local",
      name: "Super Admin",
      password: "Admin@123",
      role: "SUPERADMIN",
    },
    {
      email: "support@platform.local",
      name: "Support Agent",
      password: "Support@123",
      role: "SUPPORT",
    },
  ];

  for (const u of internalUsers) {
    const exists = await prisma.internalUser.findUnique({ where: { email: u.email } });
    if (!exists) {
      const hash = await bcrypt.hash(u.password, 10);
      await prisma.internalUser.create({
        data: {
          email: u.email,
          name: u.name,
          passwordHash: hash,
          role: u.role as any,
          isActive: true,
        },
      });
      logger.info(`👤 Created internal user: ${u.email}`);
    } else {
      logger.info(`↩️ Skipped existing internal user: ${u.email}`);
    }
  }

  // ------------------------------------------------------------
  // 5️⃣ External Test User (for /auth/login)
  // ------------------------------------------------------------
  const testUserEmail = "user@test.com";
  const testPassword = "User@123";

  const existingTestUser = await prisma.user.findFirst({
    where: { email: testUserEmail, deletedAt: null },
  });

  if (!existingTestUser) {
    const hashed = await bcrypt.hash(testPassword, 10);
    await prisma.user.create({
      data: {
        email: testUserEmail,
        name: "Test User",
        passwordHash: hashed,
      },
    });
    logger.info(`🧪 Created test user: ${testUserEmail} / ${testPassword}`);
  } else {
    logger.info(`↩️ Skipped existing test user: ${testUserEmail}`);
  }

  logger.info("🎉 Seed completed successfully.");
}

// ------------------------------------------------------------
// Error handling
// ------------------------------------------------------------
main()
  .catch((err) => {
    logger.error("❌ Seed failed", { message: err.message, stack: err.stack });
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
