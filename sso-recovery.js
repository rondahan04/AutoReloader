'use strict';

// Runs on Microsoft SSO pages and RUNI portals.
// Only fires auto-recovery when the page was reached via an SSO redirect
// from a RUNI domain — never on manual logins.

(function () {
  const RUNI_DOMAINS = [
    'runi.ac.il',
    'my.runi.ac.il',
    'moodle.runi.ac.il',
    'yedion.runi.ac.il',
  ];

  // ── Guard: only act when we arrived here from RUNI ──────────────────────────

  function isRuniRedirect() {
    // 1. HTTP Referer header (most reliable)
    try {
      if (document.referrer) {
        const ref = new URL(document.referrer);
        if (RUNI_DOMAINS.some(d => ref.hostname === d || ref.hostname.endsWith('.' + d))) {
          return true;
        }
      }
    } catch {}

    // 2. SSO redirect_uri / wreply / RelayState params pointing back to RUNI
    try {
      const p = new URLSearchParams(window.location.search);
      const targets = [
        p.get('redirect_uri'),
        p.get('wreply'),
        p.get('RelayState'),
        p.get('TARGET'),
      ];
      if (targets.some(t => t && RUNI_DOMAINS.some(d => t.includes(d)))) {
        return true;
      }
    } catch {}

    return false;
  }

  if (!isRuniRedirect()) return;

  // ── Click targets (tried in priority order) ──────────────────────────────────

  const CLICK_TARGETS = [
    // Microsoft "Stay signed in?" → Yes / Continue
    '#idSIButton9',
    // Microsoft "Sign in" primary action button
    'input[type="submit"]#idSIButton9',
    // Microsoft account-picker: first listed account tile
    '.table_row_link',
    '[data-bind*="clickTile"]',
    // Generic RUNI / Shibboleth SAML "Continue" submit
    'input[type="submit"][value="Continue"]',
    'button[type="submit"][value="Continue"]',
    // Generic sign-in submit (exclude cancel / back / no buttons by id)
    'input[type="submit"]:not([id*="Back"]):not([id*="cancel"]):not([id*="deny"])',
  ];

  let recovered = false;

  function tryRecover() {
    if (recovered) return;

    for (const selector of CLICK_TARGETS) {
      const el = document.querySelector(selector);
      if (el && !el.disabled && el.offsetParent !== null /* visible */) {
        recovered = true;
        el.click();
        return;
      }
    }
  }

  // ── Fire immediately after idle + once more as fallback ───────────────────────

  setTimeout(tryRecover, 900);
  setTimeout(tryRecover, 2800);

  // ── Watch for Microsoft's SPA transitions ─────────────────────────────────────

  const observer = new MutationObserver(() => {
    if (!recovered) setTimeout(tryRecover, 350);
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
