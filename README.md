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
| `index.html` | The app, plus the sign-in screen and the Records list |
| `boot.js` | Sign-in, Submit and the Records list |
| `config.js` | Firebase settings (same values as the Smart Scheduler), owner email and company domain |
| `firestore.rules` | Who can read and write what. Covers the Smart Scheduler **and** Order Verification |

## One-time setup (about 10 minutes)

Firebase sign-in is already set up from the Smart Scheduler, so only two steps are left.

### 1. Update the database rules
1. Open console.firebase.google.com and go to the **smart-scheduler-1915** project.
2. Go to **Firestore Database > Rules**.
3. Replace everything with the contents of `firestore.rules` from this folder and click **Publish**.
   This file keeps every Smart Scheduler rule exactly as it was and adds the `verifications` rules at the bottom.

### 2. Put it on GitHub Pages
1. On github.com, create a new repository named `order-verification`. Public is fine, because no order data lives in these files.
2. Click **Add file > Upload files**, drag in `index.html`, `boot.js`, `config.js` and `README.md`, and click **Commit**. (`firestore.rules` can go in too. It's only for reference.)
3. Go to **Settings > Pages**. Set the source to **Deploy from a branch**, branch `main`, folder `/ (root)`, then **Save**.
4. After a minute the app is live at `https://YOUR-GITHUB-USERNAME.github.io/order-verification/`.

Your `github.io` address should already be on Firebase's authorized list from the Smart Scheduler. If sign-in says the domain isn't authorized, add `YOUR-GITHUB-USERNAME.github.io` under **Authentication > Settings > Authorized domains**.

### 3. Test it, then send the link
1. Open the link, sign in with `fpina@1915south.com`, fill in a test order and click **Submit Record**.
2. Click **Records** in the gray bar. Your test should be there. Click **Open** to see the full record.
3. Send the link to the stores.

## Who can do what

| Person | Can do |
|---|---|
| Anyone with a @1915south.com email | Sign in, fill out, submit. Can read only their own submissions |
| Admins (the Admins list in the Smart Scheduler's **Access** button) | Everything above, plus see every store's records in **Records** |
| Owner (fpina@1915south.com) | Everything, and the only one who can edit or delete a submitted record (from the Firebase console) |
| Anyone else | Nothing |

Submitted records can't be changed by the person who submitted them, and each one is stamped with the submitter's email and the server's time.

## Good to know
- **Use it in Safari (or Chrome), not a home-screen icon.** The sign-in email link opens in the browser. On an iPad, a home-screen icon keeps its own separate sign-in, so it won't pick up the link.
- **Shared store iPads stay signed in** as whoever signed in last. The record still captures the Sales Associate and Manager names from Sign-Off, and anyone can tap **Sign out**.
- **Sign-in emails:** on the free Firebase plan, sign-in emails are capped at a small number per day (the Smart Scheduler setup notes put it at 5). Rolling this out to 41 stores will need more than that, so switch the project to the **Blaze (pay as you go)** plan first and set a budget alert (for example $10). At this size the cost should be close to nothing.
- **Seeing the raw data:** Firebase console > Firestore Database > `verifications`.

## Making changes later
- **With Claude:** ask for the change, then re-upload the changed file to the repository.
- **By hand:** edit the file on github.com and commit. GitHub Pages updates in about a minute.
