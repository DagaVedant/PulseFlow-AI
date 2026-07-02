export type Role = "viewer" | "operator";

const TOKEN_KEY = "pulseflow_token";
const ROLE_KEY = "pulseflow_role";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getRole(): Role | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(ROLE_KEY) as Role | null;
  } catch {
    return null;
  }
}

export function setAuth(token: string, role: Role): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(TOKEN_KEY, token);
    sessionStorage.setItem(ROLE_KEY, role);
  } catch {}
}

export function clearAuth(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(ROLE_KEY);
  } catch {}
}

export function isAuthenticated(): boolean {
  return getToken() !== null;
}
