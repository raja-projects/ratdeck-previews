/** The only Chrome Web Store link. Swap this when the listing is live. */
const DEWCUE_STORE_URL = 'https://chromewebstore.google.com/detail/dewcue';

document.querySelectorAll('[data-store]').forEach((node) => {
  node.setAttribute('href', DEWCUE_STORE_URL);
});
