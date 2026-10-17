# Dewcue · clickable demo (v1)

Single static page (HTML/CSS/vanilla JS, no build step) that simulates Chrome with the Dewcue extension:
popup (onboarding → Today), natural-language input with live parsing, real-timer Smart corner cards
(Done / Snooze / Reschedule, one card at a time with a "+N more" stack), tabs, Buckets, Timer, More/Upgrade,
docked side panel, and a "Demo controls" panel. State persists in localStorage; "Reset demo" clears it.

Run locally: `python3 -m http.server` in this folder, open http://localhost:8000/.
Assets in `assets/` are copies of `design/styles.css`, `design/icons.svg`, `design/fonts/`, `brand/logo/` and
`brand/mascot/png/128/`. A published copy lives in the previews Pages repo under `dewcue-demo-v1/`.
