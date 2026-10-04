# 1915 South Order Verification

Order verification checklist for every store: Living Room, Sectional Layout, Dining Room, Bedroom, Bedding, Protection / Delivery / Finance, and Manager Sign-Off.

- The page is hosted on GitHub Pages.
- Sign-in and saved records run on the same Google Firebase project as the Smart Scheduler (`smart-scheduler-1915`).
- Drafts autosave on the device while someone is filling out the form.
- **Submit Record** saves the finished verification to the database.
- **Pre-purchase / Post-purchase toggle** in the header. Pre-purchase (before the sale is written) asks for the **guest name**. Post-purchase (after the ticket is written) asks for the **ticket #**. Store Records shows which one with a PRE or POST tag.

## Files

| File | What it is |
|---|---|
| `index.html` | The app, plus the sign-in screen and Store Records |
| `boot.js` | Sign-in, Submit and Store Records |
| `sku.js` | The SKU book: every bed and dining set configuration and the SKUs it needs, built from Ashley's Casegoods price list (prices removed). Currently the 5/13/2026 list. |
| `config.js` | Firebase settings (same values as the Smart Scheduler), owner email and company domain |
| `firestore.rules` | Who can read and write what. Covers the Smart Scheduler **and** Order Verification |

## Where things live

- **Live app:** https://fpina-1915south.github.io/order-verification/
- **Code:** github.com/fpina-1915South/order-verification
- **Database rules:** smart-scheduler-1915 > Firestore Database > Rules, in the "Order Verification app" block at the bottom. `firestore.rules` in this repo is a reference copy of only that block. Never paste it over the whole rules editor.
- **Saved records:** smart-scheduler-1915 > Firestore Database > `verifications` (searchable summary: store, order #, date, names, protection) and `verificationRecords` (the full frozen record, same id)

## Who can sign in

- **Email + password.** First time, a leader taps **Create your account**, enters their @1915south.com email and a password, and confirms their email once from the message Firebase sends. After that they just sign in, and the device remembers them.
- **Forgot password** on the sign-in screen emails a reset link. People who first signed in by the old email link use this once to set a password.
- **Approved list (no email needed).** Leaders on Frank's approved list create an account and go straight in, with no confirmation email. Frank manages it with the **Approved list** button (only he sees it): paste emails to add, tap Remove to take someone off. Stored in Firestore `ovApproved` (one document per email).
- Leaders not on the list can still sign up; they get one confirmation email. The rules require a @1915south.com email that is either confirmed or on the approved list.
- **Email limit:** the project can only send a few emails a day, so the app saves them. It sends no email to approved leaders, sends a confirmation at most once a day per device, and never sends one from Submit. Forgot password still sends an email.
- Microsoft sign-in was tried and turned off (it needs a Microsoft admin approval). The Microsoft provider is disabled in Firebase. The "1915 South Field Apps" registration still exists in Microsoft Entra but does nothing; delete it there anytime.

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
- **Store Records:** pick a store and a time range, then type an order # to find it. Tap **Open** for the full record.
- **Seeing the raw data:** Firebase console > Firestore Database > `verifications`.

## Making changes later
- **With Claude:** ask for the change, then re-upload the changed file to the repository.
- **By hand:** edit the file on github.com and commit. GitHub Pages updates in about a minute.

## Updating the SKU book
After each market (winter and summer), get the new Ashley Casegoods price list PDF (Kris Johnson keeps it current) and ask Claude to regenerate `sku.js` from it. Only bed configurations and SKU descriptions go into the app. Prices are never included.
