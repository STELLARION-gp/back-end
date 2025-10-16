// services/user.service.ts
import { prisma } from "../lib/prisma";
import { user_role } from "../prisma/generated/client";

export interface ParsedName {
  firstName?: string;
  lastName?: string;
}

export function parseName(fullName?: string): ParsedName {
  if (!fullName) return {};
  const parts = fullName.trim().split(/\s+/);
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" ") || undefined,
  };
}

export async function findUserByFirebaseUid(uid: string) {
  return prisma.users.findUnique({ where: { firebase_uid: uid } });
}

export async function touchLastLogin(uid: string) {
  return prisma.users.update({
    where: { firebase_uid: uid },
    data: { last_login: new Date() },
  });
}

export async function createUser(params: {
  uid: string;
  email: string;
  role?: user_role;
  first_name?: string;
  last_name?: string;
  display_name?: string;
}) {
  const {
    uid,
    email,
    role = user_role.learner,
    first_name,
    last_name,
    display_name,
  } = params;
  return prisma.$transaction(async (tx) => {
    // Create the main user record
    const newUser = await tx.users.create({
      data: {
        firebase_uid: uid,
        email,
        first_name: first_name,
        last_name: last_name,
        display_name:
          display_name ||
          `${first_name || ""} ${last_name || ""}`.trim() ||
          email.split("@")[0],
        role: role || user_role.learner,
        created_at: new Date(),
      },
    });

    // Create default user settings (no .catch() to ensure transaction rollback on error)
    await tx.user_settings.create({
      data: {
        user_id: newUser.id,
      },
    });

    console.log(
      `✅ User created successfully: ${newUser.email} (ID: ${newUser.id})`
    );

    return newUser;
  });
}
