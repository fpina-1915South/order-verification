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

- **Sign in with Microsoft (main way):** leaders tap the button and pick their 1915 South work account (the one they use for Outlook and Teams). No email, no password. The Microsoft app is "1915 South Field Apps" in Microsoft Entra (App registrations). It's single tenant, so only accounts in the 1915 South directory can use it.
  - Application (client) ID: d9824bad-54c5-4dee-9f96-c446d6b910fb
  - Directory (tenant) ID: e9214a5c-ed31-4de7-974b-a65564179f04
  - The client secret lives only in Firebase (Authentication > Sign-in method > Microsoft). **It expires 9/28/2028.** Before then, create a new secret in Entra (Certificates & secrets) and paste it into Firebase.
- **Email link (backup):** "Can't use Microsoft? Email me a sign-in link instead" on the sign-in screen.
- Sign-up is on, so new leaders need nothing set up. The rules accept a verified email link or a Microsoft sign-in, plus a @1915south.com email.
- Anyone who first signed in by email link gets a one-time "connect your account" email the first time they use Microsoft.

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
- **Sign-in emails:** only the backup email link sends email. The free (Spark) plan allows 5 of those per day for the whole project. Microsoft sign-in sends no email, so it isn't limited.
- **Store Records:** pick a store and a time range, then type an order # to find it. Tap **Open** for the full record.
- **Seeing the raw data:** Firebase console > Firestore Database > `verifications`.

## Making changes later
- **With Claude:** ask for the change, then re-upload the changed file to the repository.
- **By hand:** edit the file on github.com and commit. GitHub Pages updates in about a minute.
