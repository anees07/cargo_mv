import type { UserRole } from "../types";

export type ActionType = 
  | "create_trip" 
  | "manage_trip" 
  | "manage_ops" 
  | "create_bill" 
  | "alter_bill" 
  | "manage_payment" 
  | "manage_master" 
  | "manage_admin";

export function hasPermission(role: UserRole, action: ActionType): boolean {
  const permissions: Record<ActionType, UserRole[]> = {
    create_trip: ["owner", "admin", "manager"],
    manage_trip: ["owner", "admin", "manager", "loading_staff", "offloading_staff"],
    manage_ops: ["owner", "admin", "manager", "loading_staff", "offloading_staff"],
    create_bill: ["owner", "admin", "manager", "cashier"],
    alter_bill: ["owner", "admin"],
    manage_payment: ["owner", "admin", "cashier"],
    manage_master: ["owner", "admin", "manager"],
    manage_admin: ["owner", "admin"],
  };
  return permissions[action].includes(role);
}
