import { DEV_USER_ID, devNoAuth } from "../env.js";
import { persistenceEnabled } from "../db/client.js";

/**
 * Local dev auth bypass (fixed dev user, no JWT). Disabled when Supabase
 * persistence is on — the dev user id is not in auth.users and profile inserts fail.
 */
export function devAuthBypass(): boolean {
  return devNoAuth && !persistenceEnabled;
}

export { DEV_USER_ID };
