"use client";

export const routeTransitionStorageKey = "gympal-route-transition";

export interface RouteTransitionPayload {
  source: "auth";
  target: string;
  at: number;
  style: "activity-ring";
}

export function storeRouteTransition(transition: RouteTransitionPayload) {
  window.sessionStorage.setItem(routeTransitionStorageKey, JSON.stringify(transition));
}

export function consumeRouteTransition(): RouteTransitionPayload | null {
  const storedValue = window.sessionStorage.getItem(routeTransitionStorageKey);

  if (!storedValue) {
    return null;
  }

  window.sessionStorage.removeItem(routeTransitionStorageKey);

  try {
    return JSON.parse(storedValue) as RouteTransitionPayload;
  } catch {
    return null;
  }
}
