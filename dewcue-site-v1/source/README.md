# DewCue GitHub Pages source

This folder contains the repeatable source for the DewCue website at:
https://raja-projects.github.io/ratdeck-previews/dewcue-site-v1/

From the `dewcue-site-v1` folder, run:

```sh
python source/build.py
python source/verify.py
node --check assets/site.js
```

Python 3 with only its standard library is needed to build and verify. Node is needed only for the optional JavaScript syntax check. Static assets are kept in the sibling `assets/` folder. Edit reviewed copy in `content.json`, templates in `build.py`, styles in `../assets/site.css`, and browser interactions in `../assets/site.js`. Public settings live in `site-config.json`. Do not put credentials in this folder.

`basePath` must match the path portion of `siteUrl`. Internal HTML URLs are mounted once during rendering; metadata, JSON-LD and sitemaps use the complete site URL. USD is the default currency; INR remains selectable.

The three `.txt` files in `source-reference/` contain the original published legal HTML snapshots used by the generator. Their text extension prevents duplicate standalone HTML pages. Their policy text is preserved; internal links are updated to the new routes.

This public preview deliberately uses `noindex` and has no verified Chrome Web Store link connected. The preview/install disclosure remains visible. This is a static marketing site and interactive demonstration, not the extension itself.

The site has 25 content pages, one direct 404 page and four legacy HTML redirects. The sitemap contains 25 canonical content URLs. Previous `#faq` and `#how` homepage links remain supported.

GitHub Pages limitations: this subtree's robots.txt is informational; only the host-root robots.txt controls crawlers. The nested 404.html is available directly, but repository-level routing decides which 404 page is served for an unknown URL. No repository-root routing or security headers are changed here. GitHub Pages does not consume `_headers`, so it is excluded.

This export is independent of the private ChatGPT Site build. Rebuilding here does not change that Site.
