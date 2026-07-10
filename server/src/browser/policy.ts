import type { Page } from "playwright";

import { browserAllowHosts, browserStrictAllowlist } from "../env.js";



/**

 * Safety policy for the Computer Use browser agent.

 * - Deny navigation to sensitive domains (banking, payment, auth providers).

 * - Optional strict allowlist for marketing/research hosts only.

 * - Block typing into password/credential fields.

 */



const DENY_HOST_PATTERNS = [

  /(^|\.)paypal\.com$/i,

  /(^|\.)stripe\.com$/i,

  /(^|\.)checkout\./i,

  /(^|\.)bank/i,

  /(^|\.)chase\.com$/i,

  /(^|\.)wellsfargo\.com$/i,

  /(^|\.)coinbase\.com$/i,

  /(^|\.)binance\.com$/i,

  /accounts\.google\.com$/i,

  /login\.microsoftonline\.com$/i,

  /(^|\.)okta\.com$/i,

];



export function isDeniedUrl(url: string): boolean {

  try {

    const host = new URL(url).hostname;

    return DENY_HOST_PATTERNS.some((re) => re.test(host));

  } catch {

    return false;

  }

}



/** When BROWSER_STRICT_ALLOWLIST=1, only these host suffixes may load (deny list still applies). */

export function isAllowedUrl(url: string): boolean {

  if (!browserStrictAllowlist) return true;

  if (url === "about:blank" || url.startsWith("chrome:")) return true;

  try {

    const host = new URL(url).hostname.toLowerCase();

    return browserAllowHosts.some((suffix) => host === suffix || host.endsWith(`.${suffix}`));

  } catch {

    return false;

  }

}



export function isBlockedUrl(url: string): boolean {

  return isDeniedUrl(url) || !isAllowedUrl(url);

}



/** True if the element currently focused looks like a credential/payment input. */

export async function isCredentialFieldFocused(page: Page): Promise<boolean> {

  try {

    // Runs in the browser context (DOM available there, not in Node typecheck).

    const fn = `() => {

      var el = document.activeElement;

      if (!el || el.tagName !== 'INPUT') return false;

      var type = (el.getAttribute('type') || '').toLowerCase();

      var name = (el.getAttribute('name') || '').toLowerCase();

      var auto = (el.getAttribute('autocomplete') || '').toLowerCase();

      if (type === 'password') return true;

      var sensitive = ['cc-number','cc-csc','current-password','new-password'];

      if (sensitive.some(function(s){ return auto.indexOf(s) >= 0; })) return true;

      return /pass|card|cvc|cvv|ssn|secret/.test(name);

    }`;

    return (await page.evaluate(fn)) as boolean;

  } catch {

    return false;

  }

}



/** Install a guard that blocks navigations to denied or disallowed hosts. */

export function installNavigationGuard(page: Page, onBlock: (url: string) => void): void {

  page.on("framenavigated", (frame) => {

    if (frame !== page.mainFrame()) return;

    const url = frame.url();

    if (isBlockedUrl(url)) {

      onBlock(url);

      page.goto("about:blank").catch(() => undefined);

    }

  });

}

