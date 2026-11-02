/*
 * Site settings. Load this first in every page's <head>, before
 * components/site-mode.js.
 *
 * productionMode: true for the public site. It hides everything that is not
 *   real yet, without deleting it, so it can be wired up later:
 *   - Design and test pages (data-page="dev") send visitors to the home page.
 *   - The ?fonts= and ?fontpanel testers and the Learn ?tier= preview are off.
 *   - Sample entries in the Learn reading list are left out.
 *   Set it to false to see the demo build again (only on your own machine).
 *
 * accounts: true when member accounts are open (Clerk, on Vercel: see
 *   components/auth.js). false sends Log in, the account page and the
 *   dashboards to signup/ instead. Paid plans have their own switch, on the
 *   server: PAID_PLANS_ENABLED (docs/go-live-runbook.md); the pages ask
 *   /api/config for it.
 *
 * email: the one address the site shows.
 *
 * forms: Formspree endpoints, e.g. "https://formspree.io/f/abcdwxyz".
 *   Leave one "" until it exists: that form then checks what was typed and
 *   asks the visitor to email us instead. Nothing is sent anywhere else.
 */
window.CA_SITE = {
  productionMode: true,
  accounts: true,
  email: "hello@canaryalpha.co",
  forms: {
    waitlist: "https://formspree.io/f/mzeevbkp", // waitlist/: "Join the list" (paid plans)
    contact: "https://formspree.io/f/xdeedowb"  // contact/: "Contact us"
  }
};
