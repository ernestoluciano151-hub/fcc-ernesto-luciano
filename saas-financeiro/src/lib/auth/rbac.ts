import type { Role } from "@prisma/client";

// ============================================================================
// RBAC — permissões por papel. Operações financeiras críticas exigem papel
// mínimo FINANCE; leitura é permitida a partir de VIEWER.
// ============================================================================

export const ROLE_RANK: Record<Role, number> = {
  VIEWER: 0,
  OPERATOR: 1,
  MANAGER: 2,
  FINANCE: 3,
  ADMIN: 4,
  SUPER_ADMIN: 5,
};

export function hasAtLeast(role: Role, minimum: Role): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}

export const PERMISSIONS = {
  VIEW_DASHBOARD: "VIEWER" as Role,
  CREATE_OPERATION: "OPERATOR" as Role,
  APPROVE_OPERATION: "FINANCE" as Role,
  EDIT_EXPENSE: "OPERATOR" as Role,
  DELETE_OR_REVERSE_TRANSACTION: "FINANCE" as Role,
  MANAGE_COMPANIES: "ADMIN" as Role,
  MANAGE_USERS: "ADMIN" as Role,
  SYSTEM_CONFIG: "SUPER_ADMIN" as Role,
};

export function can(role: Role, permission: keyof typeof PERMISSIONS): boolean {
  return hasAtLeast(role, PERMISSIONS[permission]);
}
