# Putting Bidding Wars online, free, today

GitHub Pages hosts it for nothing and gives you a link you can send to anyone.
On a phone it installs to the home screen and then runs with no connection.

---

## 1. Make the repository

Go to github.com → **New repository** → name it `bidding-wars` → **Public** → Create.

You need Public for free Pages hosting. Public means the code is visible; that is
normal for a game like this and does not let anyone publish it as theirs.

## 2. Upload the files

On the empty repo page, click **uploading an existing file**. Drag in everything
from the unzipped folder: `www/`, `package.json`, `capacitor.config.json`,
`README.md`, `docs/`, `resources/`, `PrivacyInfo.xcprivacy`, `.gitignore`.

Then make the deploy workflow. Click **Add file → Create new file**, name it

    .github/workflows/pages.yml

and paste the contents of `.github-pages-workflow.yml` from this folder.
(GitHub will not let you upload a file into a hidden `.github` folder by drag and
drop, which is why it has a plain name in the zip.) Commit.

## 3. Switch Pages on

**Settings → Pages → Build and deployment → Source: GitHub Actions.**

That is the whole setup. Every push now rebuilds and redeploys. The first run
takes about a minute; watch it under the **Actions** tab.

Your link:

    https://<your-username>.github.io/bidding-wars/

The workflow downloads three.js and the border data during the build, so you do
not have to commit them.

---

## 4. Install it on the phone

**iPhone** — open the link in **Safari** (this does not work in Chrome on iOS),
tap Share, then **Add to Home Screen**. You get the icon, full screen, no browser
bar.

**Android** — Chrome shows an "Install app" prompt by itself, or use the menu →
Add to Home screen.

After the first load everything is cached. Airplane mode, underground, on a plane
— the game runs.

---

## Updating it later

Edit a file on GitHub or push a change; the site redeploys automatically.

One catch worth knowing: the service worker serves from cache first, so people who
already installed it will keep the old version until the cache name changes. When
you ship an update, bump the version in `www/sw.js`:

```js
const CACHE = 'bidding-wars-v2';   // was v1
```

Without that bump, your changes will not reach anyone who already has it.

---

## Your own domain

If you buy something like `biddingwars.app`, add a file called `CNAME` inside
`www/` containing just the domain, then point a CNAME record at
`<your-username>.github.io`. HTTPS comes free.

---

## What this is not

This is not the App Store. It does not appear in search, you cannot charge for it
through Apple, and iOS gives home-screen web apps a smaller storage budget. It is
the fastest way to have something real that people can play — and everything here
carries straight over to the native build in `docs/APPSTORE.md`.
