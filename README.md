# Recovery Shield — Mobile Companion

A read-only mobile dashboard that mirrors your streak, trigger window, and last
setback from the extension. Not an app-store app — it's a web page you install to
your Android home screen ("Add to Home Screen" / the browser's install prompt), which
gives it its own icon and a full-screen, app-like window.

## What this honestly is and isn't

**Is:** a synced view of your data on your phone, updated whenever you generate a
fresh sync file/code in the extension and bring it here.

**Isn't:** live/automatic sync (there's no backend server — by design, this stays as
local-only as the extension itself), and it **cannot block sites on your phone**. A
web page cannot intercept traffic from other apps or browser tabs — that's a hard
platform restriction, not a missing feature. The app itself explains this and walks
through the real fix: Android's built-in Private DNS setting
(`family-filter-dns.cleanbrowsing.org`), which blocks adult content system-wide
across every app and browser on the phone, takes about two minutes, and needs no
app install at all.

## Getting it onto your phone

This needs to be served over HTTPS for "Add to Home Screen" to fully work (offline
caching, standalone app window). The simplest free way to do that for a personal,
single-user page:

1. Create a free GitHub account if you don't have one.
2. Create a new **public** repository (e.g. `recovery-shield-mobile`).
3. Upload every file in this folder to it (drag-and-drop on github.com works fine —
   keep the folder structure, including the `icons/` folder).
4. In the repo, go to **Settings → Pages**, set Source to the `main` branch, root
   folder, and save.
5. GitHub gives you a URL like `https://yourusername.github.io/recovery-shield-mobile/`
   — open that on your phone.
6. In Chrome on Android, tap the ⋮ menu → **"Add to Home screen"** (or you'll see an
   install prompt automatically). That's it — it now behaves like an installed app.

A public GitHub repo means the *code* is visible to anyone, same as any open-source
project — but your actual recovery data never touches GitHub or any server. It only
ever exists in your browser's local storage on your own phone, put there by you
pasting/uploading a sync file. If you'd rather not make the repo public, GitHub
Pages also works with a private repo on paid GitHub plans, or you can use any other
static host you already have (Netlify, Vercel, Cloudflare Pages — all have free
tiers and the same drag-and-drop-style deploy).

## Using it

1. In the extension: **Settings → Mobile sync** → "Download sync file" (or copy the
   code below it).
2. Get that file/code onto your phone however you normally move files between your
   own devices — email to yourself, Google Drive/Files, Bluetooth, USB, whatever you
   already use. There's no special transfer mechanism here on purpose; it's just a
   small JSON file.
3. Open the mobile page → **"Choose sync file"** and select it, or paste the code
   into the text box and tap **"Import code."**
4. Your streak clock, trigger window, and last setback now show on your phone,
   ticking live the same way the extension's does.
5. Repeat anytime you want to refresh it — there's no limit, and re-importing just
   overwrites the previous sync.
