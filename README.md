# 1915 South Order Verification

Order verification checklist for every store: Living Room, Sectional Layout, Dining Room, Bedroom, Bedding, Protection / Delivery / Finance, and Manager Sign-Off.

- The page is hosted on GitHub Pages.
- Sign-in and saved records run on the same Google Firebase project as the Smart Scheduler (`smart-scheduler-1915`).
- Drafts autosave on the device while someone is filling out the form.
- **Submit Record** saves the finished verification to the database.
- Records are saved by **order number**. The app does not collect customer names.

## Files

| File | What it is |
|---|---|
| `index.html` | The app, plus the sign-in screen and Store Records |
| `boot.js` | Sign-in, Submit and Store Records |
| `config.js` | Firebase settings (same values as the Smart Scheduler), owner email and company domain |
| `firestore.rules` | Who can read and write what. Covers the Smart Scheduler **and** Order Verification |

## Where things live

- **Live app:** https://fpina-1915south.github.io/order-verification/
- **Code:** github.com/fpina-1915South/order-verification
- **Database rules:** smart-scheduler-1915 > Firestore Database > Rules, in the "Order Verification app" block at the bottom. `firestore.rules` in this repo is a reference copy of only that block. Never paste it over the whole rules editor.
- **Saved records:** smart-scheduler-1915 > Firestore Database > `verifications` (searchable summary: store, order #, date, names, protection) and `verificationRecords` (the full frozen record, same id)

## Who can sign in

Sign-up is on (Authentication > Settings > User actions), so anyone with a @1915south.com email can sign in with the one-time email link. Nobody has to be added by hand, including new leaders.
Every rule in the project (Smart Scheduler, Store Visit, Order Verification) requires a **verified** email, so only someone who can open the sign-in email gets in.

## Who can do what

| Person | Can do |
|---|---|
| Anyone with a @1915south.com email | Sign in, fill out, submit, and look up any store in **Store Records** |
| Frank plus Orlando Cruz, Jourdain McCord, Meagan Severt, Jonathan Keene, Scott Dance, Erika Brickner, Kelsie Williams | Everything above, plus an **All stores** view in Store Records |
| Owner (fpina@1915south.com) | Everything, and the only one who can edit or delete a submitted record (from the Firebase console) |
| Anyone else | Nothing |

Submitted records can't be changed by the person who submitted them, and each one is stamped with the submitter's email and the server's time.

## Changing who gets "All stores"
Edit `viewers` in `config.js` and commit. (Any signed-in leader can already look up any single store.)

## Good to know
- **Use it in Safari (or Chrome), not a home-screen icon.** The sign-in email link opens in the browser. On an iPad, a home-screen icon keeps its own separate sign-in, so it won't pick up the link.
- **Shared store iPads stay signed in** as whoever signed in last. The record still captures the Sales Associate and Manager names from Sign-Off, and anyone can tap **Sign out**.
- **Sign-in emails:** the free (Spark) plan sends only 5 email-link sign-in emails per day for the whole project. The Blaze (pay as you go) plan raises that to 25,000 per day. Sign-in emails themselves are free, and this app's usage fits inside Blaze's no-cost allowances. Set a budget alert (for example $10).
- **Store Records:** pick a store and a time range, then type an order # to find it. Tap **Open** for the full record.
- **Seeing the raw data:** Firebase console > Firestore Database > `verifications`.

## Making changes later
- **With Claude:** ask for the change, then re-upload the changed file to the repository.
- **By hand:** edit the file on github.com and commit. GitHub Pages updates in about a minute.
