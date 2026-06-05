# Running KopelAi on your Mac

Two parts run at once: the **web** app (what you see) and the **backend** (the brain).
You'll open two Terminal windows — one for each. Copy-paste the commands.

> ⚠️ Not ready to run yet: the database (Supabase) still needs to be set up and the
> keys filled into the env files. Claude does that step. Once it's done, the steps
> below will work end to end.

## One-time setup (install)

Open Terminal and run these two blocks once.

**Backend:**
```
cd ~/Documents/Claude/Projects/KopelAi/backend
npm install
```

**Web:**
```
cd ~/Documents/Claude/Projects/KopelAi
npm install
```

## Every time you want to test

**Terminal window 1 — backend:**
```
cd ~/Documents/Claude/Projects/KopelAi/backend
npm run dev
```
Leave it running. It says it's listening on port 4000.

**Terminal window 2 — web:**
```
cd ~/Documents/Claude/Projects/KopelAi
npm run dev
```
Leave it running. It says it's ready on http://localhost:3000.

Then open **http://localhost:3000** in your browser.

To stop a server: click its Terminal window and press `Ctrl + C`.

## Ports
- Web: http://localhost:3000
- Backend: http://localhost:4000 (the web app is already pointed here)
