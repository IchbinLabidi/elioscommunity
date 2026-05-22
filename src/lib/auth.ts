import { UserRole } from '../types/database';

export function dashboardPathForRole(role: UserRole) {
  return `/${role}/dashboard`;
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
