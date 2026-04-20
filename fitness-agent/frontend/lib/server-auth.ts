import "server-only";
import { cookies } from "next/headers";

const authTokenCookieKey = "gympal-access-token";

export function getServerAuthToken() {
  return cookies().get(authTokenCookieKey)?.value;
}
