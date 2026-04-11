export type AuthMode = "login" | "register";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  goal: string;
  trainingDays: string;
  createdAt: string;
  avatarUrl?: string;
}

export interface AuthSession {
  token: string;
  user: AuthUser;
  source: "api";
}

export interface LoginPayload {
  email: string;
  password: string;
  remember?: boolean;
}

export interface RegisterPayload extends LoginPayload {
  name: string;
  goal: string;
  trainingDays: string;
  avatarUrl?: string;
}

export interface AuthResult {
  ok: boolean;
  message: string;
  session?: AuthSession;
}

interface AuthAdapter {
  implementation: "api";
  login(payload: LoginPayload): Promise<AuthResult>;
  register(payload: RegisterPayload): Promise<AuthResult>;
  logout(): Promise<void>;
  getSession(): AuthSession | null;
}

const backendBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";
const authSessionStorageKey = "gympal-auth-session";
const authChangeEvent = "gympal-auth-changed";

export const AUTH_ENDPOINTS = {
  login: "/auth/login",
  register: "/auth/register",
  logout: "/auth/logout"
} as const;

function canUseDom() {
  return typeof window !== "undefined";
}

function parseJson<T>(value: string | null, fallback: T): T {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function emitAuthChange() {
  if (!canUseDom()) {
    return;
  }

  window.dispatchEvent(new Event(authChangeEvent));
}

function buildUserName(email: string, preferredName?: string) {
  if (preferredName && preferredName.trim().length > 0) {
    return preferredName.trim();
  }

  const localPart = email.split("@")[0] ?? "GymPal Member";
  return localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function createSession(user: AuthUser, token?: string): AuthSession {
  return {
    token: token ?? `auth-${user.id}`,
    user,
    source: "api"
  };
}

function storeSession(session: AuthSession) {
  if (!canUseDom()) {
    return;
  }

  window.localStorage.setItem(authSessionStorageKey, JSON.stringify(session));
  emitAuthChange();
}

export function readAuthSession(): AuthSession | null {
  if (!canUseDom()) {
    return null;
  }

  return parseJson<AuthSession | null>(
    window.localStorage.getItem(authSessionStorageKey),
    null
  );
}

export function clearAuthSession() {
  if (!canUseDom()) {
    return;
  }

  window.localStorage.removeItem(authSessionStorageKey);
  emitAuthChange();
}

export function subscribeAuthChange(listener: () => void) {
  if (!canUseDom()) {
    return () => undefined;
  }

  const handleStorage = (event: StorageEvent) => {
    if (!event.key || event.key === authSessionStorageKey) {
      listener();
    }
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(authChangeEvent, listener);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(authChangeEvent, listener);
  };
}

async function requestAuth(
  path: string,
  payload: LoginPayload | RegisterPayload
): Promise<AuthResult> {
  const response = await fetch(`${backendBaseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store"
  });

  let result: {
    ok?: boolean;
    message?: string;
    userId?: string;
    email?: string;
    token?: string;
    name?: string;
    goal?: string;
    trainingDays?: string;
    avatarUrl?: string;
  } | null = null;

  try {
    result = (await response.json()) as typeof result;
  } catch {
    result = null;
  }

  if (!response.ok || result?.ok === false) {
    return {
      ok: false,
      message:
        result?.message ??
        (response.ok
          ? "Authentication failed."
          : `Authentication request failed with status ${response.status}.`)
    };
  }

  const profilePayload = payload as Partial<RegisterPayload>;
  const user: AuthUser = {
    id: result?.userId ?? "unknown-user",
    name: buildUserName(result?.email ?? payload.email, result?.name ?? profilePayload.name),
    email: result?.email ?? payload.email,
    goal: result?.goal ?? profilePayload.goal ?? "fat_loss",
    trainingDays: result?.trainingDays ?? profilePayload.trainingDays ?? "3",
    createdAt: new Date().toISOString(),
    avatarUrl: result?.avatarUrl ?? profilePayload.avatarUrl ?? ""
  };

  const session = createSession(user, result?.token);
  storeSession(session);

  return {
    ok: true,
    message: result?.message ?? "Authentication succeeded.",
    session
  };
}

export const authAdapter: AuthAdapter = {
  implementation: "api",
  async login(payload) {
    try {
      return await requestAuth(AUTH_ENDPOINTS.login, payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Authentication failed.";
      return {
        ok: false,
        message
      };
    }
  },
  async register(payload) {
    try {
      return await requestAuth(AUTH_ENDPOINTS.register, payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Authentication failed.";
      return {
        ok: false,
        message
      };
    }
  },
  async logout() {
    try {
      await fetch(`${backendBaseUrl}${AUTH_ENDPOINTS.logout}`, {
        method: "POST",
        cache: "no-store"
      });
    } catch {
      // The local session should still be cleared even if the backend is unavailable.
    }

    clearAuthSession();
  },
  getSession() {
    return readAuthSession();
  }
};
