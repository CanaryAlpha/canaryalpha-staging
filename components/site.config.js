/*
 * Site settings. Load this first in every page's <head>, before
 * components/site-mode.js.
 *
 * productionMode: true for the public site. It hides everything that is not
 *   real yet, without deleting it, so it can be wired up later:
 *   - Log in, Sign up and the dashboards show "Accounts open soon. Join the
 *     list" (signup/). The demo login and demo accounts are switched off.
 *   - Design and test pages (data-page="dev") send visitors to the home page.
 *   - The ?fonts= and ?fontpanel testers and the Learn ?tier= preview are off.
 *   - Sample entries in the Learn reading list are left out.
 *   Set it to false to see the demo build again (only on your own machine).
 *
 * email: the one address the site shows.
 *
 * forms: Formspree endpoints, e.g. "https://formspree.io/f/abcdwxyz".
 *   Leave one "" until it exists: that form then checks what was typed and
 *   asks the visitor to email us instead. Nothing is sent anywhere else.
 */
window.CA_SITE = {
  productionMode: true,
  email: "hello@canaryalpha.co",
  forms: {
    waitlist: "https://formspree.io/f/mzeevbkp", // signup/: "Join the list"
    contact: "https://formspree.io/f/xdeedowb"  // contact/: "Contact us"
  }
};
