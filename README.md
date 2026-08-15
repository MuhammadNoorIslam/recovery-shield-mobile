# Recovery Shield — Mobile Companion

A read-only mobile dashboard that mirrors your streak, triggers, progress, and
history from the extension, plus a self-contained urge-support flow. Installed to
your Android home screen as a PWA — its own icon, full-screen, works offline once
loaded.

## What's in this version

- **Full navigation** — Recovery, Triggers, Progress, History, and Settings tabs,
  opened via the hamburger menu (top-left), mirroring the extension's structure.
- **A real urge button** — both a floating button on every screen and one in the
  menu — leading to a self-contained breathing/grounding flow (ported from the
  extension's own urge-support page). Works fully offline; no server involved.
- **Theme sync** — the extension's chosen theme applies automatically on import.
  You can also override it locally on the phone (Settings → Appearance) between
  syncs without affecting the extension's own setting.
- **12-hour time everywhere**, explicitly — not dependent on your phone's system
  locale, which is what caused the earlier mismatch with the extension.
- Import UI collapses to a small "Update sync" button after a successful sync,
  instead of staying open and cluttering the screen.

## What this honestly still can't do, and why

- **No live notifications.** That needs a background server this design
  intentionally doesn't have — see the extension's own README for why sync stays
  local-only. Notifications only come from the extension on your computer.
- **No site blocking from this app.** A web page cannot intercept traffic from
  other apps — see the in-app "Blocking on your phone" card for the real fix
  (Android's built-in Private DNS setting).
- **No two-way sync.** Nothing on the phone writes back to the extension —
  logging a setback or daily check-in still has to happen in the extension, then
  re-sync here to see it reflected.
- **No note text.** Full written relapse notes stay encrypted in the extension
  only; the mobile History tab shows structured tags (trigger, emotion, device)
  but never the note itself.

## Getting it onto your phone

See the hosting steps (GitHub Pages) from the previous version of this README —
unchanged. Once hosted, re-run it through PWABuilder to get an updated APK, or
just reload the page if you're using it as a browser bookmark/PWA install rather
than a packaged APK.

## Using it

1. In the extension: **Settings → Mobile sync** → download the file (full
   history) or copy the code (most recent 20 setbacks — enough to fit
   comfortably in a paste).
2. Move it to your phone however you already do that.
3. Open the mobile page/app → menu → **Settings** → **"Choose sync file"** or
   paste the code → **Import**.
4. Everything — clock, triggers, progress, history, trigger profile — updates
   immediately. Re-sync anytime the same way; each import fully replaces the
   previous one.
