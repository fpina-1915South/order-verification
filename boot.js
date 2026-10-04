/* 1915 South Order Verification: sign-in, central save and the records list.
   People sign in with their 1915 South email + password. The first time, they confirm their email once.
   Drafts autosave on the device. "Submit Record" saves the finished verification to Firestore.
   firestore.rules decides who can submit and who can read. */
(function(){
  const C = window.OV_CONFIG || {};
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const OWNER = String(C.ownerEmail || "").toLowerCase();
  const DOMAIN = String(C.allowedDomain || "").toLowerCase();
  const EMAIL_KEY = "ov-signin-email";

  function gate(html){ $("ovGate").hidden = false; $("ovBar").hidden = true; $("ovGateBody").innerHTML = html; }

  if (!window.firebase || !C.firebase || !C.firebase.apiKey || /PASTE/.test(C.firebase.apiKey)){
    gate(`<p><b>Almost set up.</b> Paste your Firebase settings into <code>config.js</code> in the GitHub repository, then reload this page.</p>`);
    return;
  }
  firebase.initializeApp(C.firebase);
  const auth = firebase.auth();
  const fs = firebase.firestore();

  /* ---------- sign in with a one-time email link ---------- */
  /* ---------- sign in with email + password ----------
     First time: create an account, confirm the email once (proves they own the 1915 South address).
     After that: email + password, and the device remembers them. */
  const APP_URL = () => location.origin + location.pathname;
  const okDomain = e => !DOMAIN || e.endsWith("@" + DOMAIN);
  const msgEl = () => $("siMsg");
  function say(text, err){ const m = msgEl(); if (m){ m.className = "gmsg" + (err ? " err" : ""); m.textContent = text || ""; } }
  function friendly(err){
    const c = err && err.code || "";
    if (/invalid-credential|wrong-password|user-not-found|invalid-login/.test(c)) return "That email and password don't match. Try again, or tap Forgot password.";
    if (/too-many-requests/.test(c)) return "Too many tries. Wait a few minutes, or tap Forgot password.";
    if (/weak-password/.test(c)) return "Pick a longer password (at least 8 characters).";
    if (/invalid-email/.test(c)) return "That doesn't look like an email address.";
    if (/network/.test(c)) return "No internet connection. Check Wi-Fi and try again.";
    return (err && err.message) || String(err);
  }
  /* Frank's approved list: people on it skip the confirmation email (Firebase free plan only sends a few emails a day). */
  async function isApproved(u){
    try { const d = await fs.doc("ovApproved/" + String(u.email || "").toLowerCase()).get(); return d.exists; } catch(e){ return false; }
  }
  /* Send a confirmation email at most once a day from this device, to save the daily email limit. */
  const SENT_KEY = "ov-confirm-sent";
  async function sendConfirmOnce(u, force){
    let last = 0; try { last = +localStorage.getItem(SENT_KEY + ":" + u.email) || 0; } catch(e) {}
    if (!force && Date.now() - last < 864e5) return "skipped";
    if (force && Date.now() - last < 864e5) return "wait";
    await u.sendEmailVerification({url: APP_URL()});
    try { localStorage.setItem(SENT_KEY + ":" + u.email, String(Date.now())); } catch(e) {}
    return "sent";
  }
  const field = (id, type, ph, ac) => `<input type="${type}" id="${id}" required autocomplete="${ac}" placeholder="${ph}" style="margin-bottom:10px">`;
  const link = (id, text) => `<a href="#" id="${id}" style="color:#3F738D;font-size:13px;font-weight:600;text-decoration:none">${text}</a>`;

  function showSignIn(msg, err, email){
    gate(`<p>Sign in with your 1915 South email and password.</p>
      <form id="siForm">${field("siEmail", "email", "you@" + esc(DOMAIN || "company.com"), "username")}${field("siPass", "password", "Password", "current-password")}
      <button class="ovbtn" type="submit">Sign in</button></form>
      <div class="gmsg" id="siMsg"></div>
      <div style="text-align:right;margin-top:10px">${link("goForgot", "Forgot password?")}</div>
      <div style="display:flex;align-items:center;gap:10px;margin:16px 0 12px;color:#595959;font-size:13px;font-weight:600"><span style="flex:1;height:1px;background:#CBD5E1"></span>First time here?<span style="flex:1;height:1px;background:#CBD5E1"></span></div>
      <button class="ovbtn" type="button" id="goCreate" style="background:#F68C2C;border-color:#F68C2C;color:#fff">Create your account</button>`);
    if (email) $("siEmail").value = email;
    say(msg, err);
    $("goCreate").onclick = e => { e.preventDefault(); showCreate("", false, $("siEmail").value.trim()); };
    $("goForgot").onclick = e => { e.preventDefault(); showForgot($("siEmail").value.trim()); };
    $("siForm").addEventListener("submit", async e => {
      e.preventDefault();
      const email = $("siEmail").value.trim().toLowerCase(), pass = $("siPass").value;
      if (!okDomain(email)){ say("Use your @" + DOMAIN + " email.", true); return; }
      say("Signing in...");
      try { await auth.signInWithEmailAndPassword(email, pass); }
      catch(err){ say(friendly(err), true); }
    });
  }

  function showCreate(msg, err, email){
    gate(`<p><b>Create your account.</b> Use your 1915 South email and pick a password (at least 8 characters). We'll send one email to confirm it's you. After that, you just sign in.</p>
      <form id="crForm">${field("crEmail", "email", "you@" + esc(DOMAIN || "company.com"), "username")}${field("crPass", "password", "Create a password", "new-password")}${field("crPass2", "password", "Type it again", "new-password")}
      <button class="ovbtn" type="submit">Create account</button></form>
      <div class="gmsg" id="siMsg"></div>
      <div style="margin-top:14px">${link("goSignIn", "Already have an account? Sign in")}</div>`);
    if (email) $("crEmail").value = email;
    say(msg, err);
    $("goSignIn").onclick = e => { e.preventDefault(); showSignIn("", false, $("crEmail").value.trim()); };
    $("crForm").addEventListener("submit", async e => {
      e.preventDefault();
      const email = $("crEmail").value.trim().toLowerCase(), p1 = $("crPass").value, p2 = $("crPass2").value;
      if (!okDomain(email)){ say("Use your @" + DOMAIN + " email.", true); return; }
      if (p1.length < 8){ say("Pick a password with at least 8 characters.", true); return; }
      if (p1 !== p2){ say("The two passwords don't match.", true); return; }
      say("Creating your account...");
      try {
        const res = await auth.createUserWithEmailAndPassword(email, p1);
        // Approved leaders need no email. Everyone else gets one confirmation email.
        if (!(await isApproved(res.user))){ try { await sendConfirmOnce(res.user); } catch(e2) {} }
        // onAuthStateChanged takes it from here and shows the "confirm your email" screen
      } catch(err){
        if (err && err.code === "auth/email-already-in-use"){
          showForgot(email, "You already have an account (maybe from an earlier email sign-in). Tap the button below and we'll email you a link to set your password.");
        } else say(friendly(err), true);
      }
    });
  }

  function showForgot(email, note){
    gate(`<p>${esc(note || "Enter your 1915 South email and we'll send a link to set a new password.")}</p>
      <form id="fgForm">${field("fgEmail", "email", "you@" + esc(DOMAIN || "company.com"), "username")}
      <button class="ovbtn" type="submit">Email me a password link</button></form>
      <div class="gmsg" id="siMsg"></div>
      <div style="margin-top:14px">${link("goSignIn2", "Back to sign in")}</div>`);
    if (email) $("fgEmail").value = email;
    $("goSignIn2").onclick = e => { e.preventDefault(); showSignIn("", false, $("fgEmail").value.trim()); };
    $("fgForm").addEventListener("submit", async e => {
      e.preventDefault();
      const email = $("fgEmail").value.trim().toLowerCase();
      if (!okDomain(email)){ say("Use your @" + DOMAIN + " email.", true); return; }
      say("Sending...");
      try { await auth.sendPasswordResetEmail(email, {url: APP_URL()}); } catch(err){ if (!/user-not-found/.test(err && err.code || "")){ say(friendly(err), true); return; } }
      showSignIn("If that email has an account, a password link is on its way. Set your password, then sign in here. Check junk mail if you don't see it.", false, email);
    });
  }

  function showVerify(u, msg, err){
    gate(`<p><b>One last step.</b> We sent an email to <b>${esc(u.email)}</b>. Open it and tap the link to confirm it's you, then come back and tap the button below.</p>
      <button class="ovbtn" type="button" id="vfDone">I've confirmed my email</button>
      <div class="gmsg" id="siMsg"></div>
      <div style="display:flex;justify-content:space-between;margin-top:14px">${link("vfResend", "Send it again")}${link("vfOut", "Use a different email")}</div>
      <p style="font-size:12px;margin-top:12px">Check junk mail if you don't see it. No email? Ask Frank to add you to the approved list, then tap the button above.</p>`);
    say(msg, err);
    $("vfDone").onclick = async () => {
      say("Checking...");
      try {
        await u.reload();
        if (auth.currentUser && (auth.currentUser.emailVerified || await isApproved(auth.currentUser))){
          await auth.currentUser.getIdToken(true);   // refresh so the database sees the confirmed email
          start(auth.currentUser);
        } else say("Not confirmed yet. Tap the link in the email first (it can take a minute to arrive).", true);
      } catch(e){ say(friendly(e), true); }
    };
    $("vfResend").onclick = async e => { e.preventDefault();
      try {
        const r = await sendConfirmOnce(u, true);
        if (r === "wait") say("We already sent one in the last 24 hours. Check junk mail, or ask Frank to add you to the approved list.", true);
        else say("Sent. Check your email (and junk mail).");
      } catch(err){ say(/too-many|quota|exceeded/i.test((err && err.code || "") + (err && err.message || "")) ? "Today's email limit is used up. Try tomorrow, or ask Frank to add you to the approved list." : friendly(err), true); } };
    $("vfOut").onclick = e => { e.preventDefault(); auth.signOut().then(() => location.reload()); };
  }

  async function finishLink(){
    if (!auth.isSignInWithEmailLink(location.href)) return;
    let email = ""; try { email = localStorage.getItem(EMAIL_KEY) || ""; } catch(e) {}
    if (!email){
      gate(`<p>Confirm your email to finish signing in.</p><form id="cfForm"><input type="email" id="cfEmail" required placeholder="you@${esc(DOMAIN)}"><button class="ovbtn" type="submit">Finish signing in</button></form>`);
      email = await new Promise(res => $("cfForm").addEventListener("submit", e => { e.preventDefault(); res($("cfEmail").value.trim().toLowerCase()); }));
    }
    try { await auth.signInWithEmailLink(email, location.href); try { localStorage.removeItem(EMAIL_KEY); } catch(e) {} }
    catch(err){
      const code = err && err.code || "";
      showSignIn("That old sign-in link didn't work. Sign in with your email and password instead (first time? tap Create your account).", true, email);
    }
    history.replaceState(null, "", location.origin + location.pathname);
  }

  /* ---------- who gets the "All stores" view: Frank plus the viewers list in config.js ---------- */
  function isViewer(email){
    const e = String(email || "").toLowerCase();
    return (!!OWNER && e === OWNER) || (C.viewers || []).map(x => String(x).toLowerCase()).includes(e);
  }

  /* ---------- central save ----------
     Each verification is two documents with the same id:
       verifications/{id}        the searchable summary (store, order #, date, names, protection, checks)
       verificationRecords/{id}  the full frozen record, loaded only when someone taps Open  */
  function wireSubmit(u){
    window.OV_SUBMIT = async record => {
      const stamp = {
        submittedBy: u.uid,
        submittedByEmail: String(u.email || "").toLowerCase(),
        submittedAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      const html = record.htmlRecord || "";
      const summary = Object.assign({}, record, stamp, {hasRecord: !!html});
      delete summary.htmlRecord;
      // Always send a fresh sign-in token, so a just-confirmed email is seen by the database
      const me = auth.currentUser || u;
      try { await me.reload(); } catch(e) {}
      try { await me.getIdToken(true); } catch(e) {}
      if (!me.emailVerified && !(await isApproved(me))){
        const x = new Error("Your email isn't confirmed yet and you're not on the approved list. Tap the link in the confirmation email, or ask Frank to add " + me.email + " to the approved list. Then tap Submit again. Your work is saved on this device.");
        x.code = "ov/unverified"; throw x;
      }
      const ref = fs.collection("verifications").doc();
      const batch = fs.batch();
      batch.set(ref, summary);
      if (html) batch.set(fs.collection("verificationRecords").doc(ref.id), Object.assign({htmlRecord: html}, stamp));
      try { await batch.commit(); }
      catch(e){
        if (e && e.code === "permission-denied"){
          const x = new Error("The database didn't accept this save for " + me.email + ". Tap Sign out, sign back in, and submit again. Your work is saved on this device. If it keeps happening, send Frank a screenshot.");
          x.code = "ov/denied"; throw x;
        }
        throw e;
      }
    };
    const b = $("submitBtn"); if (b){ b.disabled = false; b.title = ""; }
  }

  /* ---------- Store Records: any signed-in leader can look up any store; Frank and the viewers also get All stores ---------- */
  let ROWS = [], ADMIN = false;   // ADMIN = can see Store Records (all stores)
  const STORE_KEY = "ov-records-store";
  const fmt = ts => { try { const d = ts && ts.toDate ? ts.toDate() : null; return d ? d.toLocaleString([], {month:"numeric", day:"numeric", year:"2-digit", hour:"numeric", minute:"2-digit"}) : ""; } catch(e){ return ""; } };
  const protBadge = r => {
    const f = r.protectionFlag, b = (bg, t) => `<span style="display:inline-block;background:${bg};color:#fff;border-radius:10px;padding:2px 8px;font-size:11px;font-weight:700;white-space:nowrap">${t}</span>`;
    if (f === "open") return b("#802020", "Declined, no follow-up");
    if (f === "still") return b("#F68C2C", "Declined after rebuild");
    if (f === "saved") return b("#2E9E6A", "Saved by leader");
    return esc(r.protection || "");
  };
  const idCell = r => r.mode === "pre"
    ? `<span style="font-size:10px;font-weight:800;color:#F68C2C">PRE</span> <b>${esc(r.guestName || "")}</b>${r.guestSigned ? ' <span title="Guest signed" style="font-size:10px;font-weight:800;color:#2E9E6A">✓ SIGNED</span>' : ""}`
    : `${r.mode === "post" ? '<span style="font-size:10px;font-weight:800;color:#3F738D">POST</span> ' : ""}<b>${esc(r.order || "")}</b>`;
  function storeList(){ try { return Array.isArray(STORES) ? STORES : []; } catch(e){ return []; } }
  function fillStorePicker(){
    const sel = $("ovRecStore"); if (!sel || sel.options.length) return;
    const opts = (ADMIN ? [["__all", "All stores"]] : []).concat(storeList().map(x => [x, x]));
    sel.innerHTML = `<option value="">Pick a store…</option>` + opts.map(([v, t]) => `<option value="${esc(v)}">${esc(t)}</option>`).join("");
  }
  function drawRows(){
    const q = $("ovFilter").value.trim().toLowerCase();
    const onlyFlag = $("ovFlagOnly") && $("ovFlagOnly").checked;
    const all = $("ovRecStore").value === "__all";
    const rows = ROWS.filter(r => (!onlyFlag || r.protectionFlag === "open" || r.protectionFlag === "still") && (!q || [r.order, r.guestName, r.store, r.associate, r.manager, r.protection].join(" ").toLowerCase().includes(q)));
    $("ovRecHead").innerHTML = `<th>Submitted</th>${all ? "<th>Store</th>" : ""}<th>Guest / Ticket #</th><th>Associate</th><th>Manager</th><th>Protection</th><th>Checks</th><th></th>`;
    $("ovRecBody").innerHTML = rows.map(r => `<tr><td>${esc(fmt(r.submittedAt))}</td>${all ? `<td>${esc(r.store)}</td>` : ""}<td>${idCell(r)}</td><td>${esc(r.associate)}</td><td>${esc(r.manager)}</td><td>${protBadge(r)}</td><td>${esc(r.checksConfirmed)}/${esc(r.checksTotal)}</td><td>${(r.hasRecord || r.htmlRecord) ? `<button data-id="${esc(r.id)}">Open</button>` : ""}</td></tr>`).join("")
      || `<tr><td colspan="8">${$("ovRecStore").value ? ("No verifications" + (q || onlyFlag ? " match that filter" : " for this store in this time range") + ".") : "Pick a store to see its verifications."}</td></tr>`;
  }
  async function loadRows(){
    const store = $("ovRecStore").value, days = +$("ovRecRange").value || 0;
    ROWS = []; drawRows();
    if (!store) return;
    try { localStorage.setItem(STORE_KEY, store); } catch(e) {}
    $("ovRecMsg").className = "gmsg"; $("ovRecMsg").textContent = "Loading...";
    const since = days ? firebase.firestore.Timestamp.fromDate(new Date(Date.now() - days * 864e5)) : null;
    const LIMIT = 500;
    let q = fs.collection("verifications");
    if (store !== "__all") q = q.where("store", "==", store);
    if (since) q = q.where("submittedAt", ">=", since);
    try {
      const snap = await q.orderBy("submittedAt", "desc").limit(LIMIT).get();
      ROWS = snap.docs.map(d => Object.assign({id:d.id}, d.data()));
    } catch(e){
      // Store + date needs a database index. Until it exists, load the store and sort here.
      try {
        const snap = await (store === "__all" ? fs.collection("verifications").limit(LIMIT) : fs.collection("verifications").where("store", "==", store).limit(LIMIT)).get();
        const cut = since ? since.toMillis() : 0;
        ROWS = snap.docs.map(d => Object.assign({id:d.id}, d.data()))
          .filter(r => !cut || (r.submittedAt && r.submittedAt.toMillis && r.submittedAt.toMillis() >= cut))
          .sort((a, b) => (b.submittedAt && b.submittedAt.toMillis ? b.submittedAt.toMillis() : 0) - (a.submittedAt && a.submittedAt.toMillis ? a.submittedAt.toMillis() : 0));
      } catch(e2){ $("ovRecMsg").className = "gmsg err"; $("ovRecMsg").textContent = "Couldn't load records: " + e2.message; return; }
    }
    $("ovRecMsg").textContent = ROWS.length >= LIMIT ? `Showing the latest ${LIMIT}. Shorten the time range to see older ones.` : (ROWS.length + " verification" + (ROWS.length === 1 ? "" : "s"));
    drawRows();
  }
  function openRecords(){
    fillStorePicker();
    const sel = $("ovRecStore");
    if (!sel.value){
      let pick = ""; try { pick = localStorage.getItem(STORE_KEY) || ""; } catch(e) {}
      const formStore = $("storeSelect") && $("storeSelect").value;
      if (formStore && formStore !== "__other") pick = formStore;
      if (pick && Array.from(sel.options).some(o => o.value === pick)) sel.value = pick;
    }
    $("ovRec").showModal();
    loadRows();
  }
  async function openOne(id){
    const r = ROWS.find(x => x.id === id); if (!r) return;
    let html = r.htmlRecord || "";
    if (!html){
      try { const d = await fs.doc("verificationRecords/" + id).get(); html = d.exists ? (d.data().htmlRecord || "") : ""; }
      catch(e){ $("ovRecMsg").className = "gmsg err"; $("ovRecMsg").textContent = "Couldn't open that record: " + e.message; return; }
    }
    if (!html) return;
    const url = URL.createObjectURL(new Blob([html], {type:"text/html"}));
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
  function wireRecords(){
    $("ovRecords").hidden = false;
    $("ovRecords").onclick = openRecords;
    $("ovRecClose").onclick = () => $("ovRec").close();
    $("ovFilter").oninput = drawRows;
    $("ovFlagOnly").onchange = drawRows;
    $("ovRecStore").onchange = loadRows;
    $("ovRecRange").onchange = loadRows;
    $("ovRecBody").onclick = e => { const id = e.target && e.target.getAttribute("data-id"); if (id) openOne(id); };
  }

  /* ---------- Approved list (Frank only): who can skip the confirmation email ---------- */
  let APPROVED = [];
  async function loadApproved(){
    $("ovAppMsg").className = "gmsg"; $("ovAppMsg").textContent = "Loading...";
    try { const snap = await fs.collection("ovApproved").get(); APPROVED = snap.docs.map(d => d.id).sort(); $("ovAppMsg").textContent = APPROVED.length + " approved"; }
    catch(e){ $("ovAppMsg").className = "gmsg err"; $("ovAppMsg").textContent = "Couldn't load the list: " + e.message; }
    drawApproved();
  }
  function drawApproved(){
    const q = $("ovAppFilter").value.trim().toLowerCase();
    $("ovAppList").innerHTML = APPROVED.filter(x => !q || x.includes(q)).map(x => `<div><span>${esc(x)}</span><button data-em="${esc(x)}">Remove</button></div>`).join("") || `<div>No one yet.</div>`;
  }
  function wireApproved(){
    $("ovApprove").hidden = false;
    $("ovApprove").onclick = () => { $("ovApp").showModal(); loadApproved(); };
    $("ovAppClose").onclick = () => $("ovApp").close();
    $("ovAppFilter").oninput = drawApproved;
    $("ovAppSave").onclick = async () => {
      const list = Array.from(new Set(($("ovAppAdd").value.toLowerCase().match(/[a-z0-9._%+-]+@[a-z0-9.-]+/g) || [])));
      const bad = list.filter(x => !okDomain(x)), good = list.filter(x => okDomain(x));
      if (!good.length){ $("ovAppMsg").className = "gmsg err"; $("ovAppMsg").textContent = bad.length ? "Only @" + DOMAIN + " emails can be added." : "Paste at least one email."; return; }
      try {
        for (let i = 0; i < good.length; i += 400){
          const b = fs.batch();
          good.slice(i, i + 400).forEach(x => b.set(fs.doc("ovApproved/" + x), {addedBy: auth.currentUser.email, addedAt: firebase.firestore.FieldValue.serverTimestamp()}));
          await b.commit();
        }
        $("ovAppAdd").value = "";
        await loadApproved();
        $("ovAppMsg").textContent = "Added " + good.length + (bad.length ? " (skipped " + bad.length + " non-1915 South)" : "") + ". " + APPROVED.length + " approved.";
      } catch(e){ $("ovAppMsg").className = "gmsg err"; $("ovAppMsg").textContent = "Couldn't save: " + e.message; }
    };
    $("ovAppList").onclick = async e => {
      const em = e.target && e.target.getAttribute("data-em"); if (!em) return;
      try { await fs.doc("ovApproved/" + em).delete(); APPROVED = APPROVED.filter(x => x !== em); drawApproved(); $("ovAppMsg").textContent = "Removed " + em + ". " + APPROVED.length + " approved."; }
      catch(err){ $("ovAppMsg").className = "gmsg err"; $("ovAppMsg").textContent = "Couldn't remove: " + err.message; }
    };
  }

  /* ---------- start ---------- */
  let started = false;
  async function start(u){
    if (started) return;
    const email = String(u.email || "").toLowerCase();
    const viaPassword = (u.providerData || []).some(p => p.providerId === "password");
    if (!u.emailVerified && viaPassword){
      // They may have just tapped the confirm link: refresh once before asking
      try { await u.reload(); } catch(e) {}
      const cur = auth.currentUser || u;
      if (!cur.emailVerified && !(await isApproved(cur))){ showVerify(cur); return; }
      try { await cur.getIdToken(true); } catch(e) {}
      u = cur;
    }
    started = true;
    if (DOMAIN && !email.endsWith("@" + DOMAIN)){
      gate(`<p><b>${esc(email)}</b> isn't a 1915 South email. Sign out and use your @${esc(DOMAIN)} email.</p><button class="ovbtn ghost" id="soBtn">Sign out</button>`);
      $("soBtn").onclick = () => auth.signOut().then(() => location.reload());
      return;
    }
    $("ovWho").textContent = "Signed in as " + email;
    $("ovOut").onclick = () => auth.signOut().then(() => location.reload());
    wireSubmit(u);
    ADMIN = isViewer(email);   // viewers also get "All stores"
    wireRecords();          // every signed-in leader can look up any store
    if (OWNER && email === OWNER) wireApproved();   // only Frank manages the approved list
    $("ovGate").hidden = true; $("ovBar").hidden = false;
  }

  (async () => {
    const b = $("submitBtn"); if (b){ b.disabled = true; b.title = "Sign in to submit"; }
    gate(`<p>Loading...</p>`);
    await finishLink();
    auth.onAuthStateChanged(u => { if (u) start(u); else showSignIn(); });
  })();
})();
