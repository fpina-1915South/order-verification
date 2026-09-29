/* 1915 South Order Verification: sign-in, central save and the records list.
   People sign in with their 1915 South Microsoft account (email link is the backup).
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
  const MS = C.microsoft || {};
  const PENDING_KEY = "ov-pending-ms";
  function msProvider(){
    const p = new firebase.auth.OAuthProvider("microsoft.com");
    const params = {prompt: "select_account"};
    if (MS.tenant) params.tenant = MS.tenant;
    p.setCustomParameters(params);
    return p;
  }
  async function signInMicrosoft(){
    const m = $("siMsg"); if (m){ m.className = "gmsg"; m.textContent = "Opening Microsoft sign-in..."; }
    try {
      await auth.signInWithPopup(msProvider());
    } catch(err){
      const code = err && err.code || "";
      if (code === "auth/popup-blocked" || code === "auth/operation-not-supported-in-this-environment"){
        try { await auth.signInWithRedirect(msProvider()); return; } catch(e2){ err = e2; }
      }
      if (code === "auth/account-exists-with-different-credential"){
        // This email already signed in by email link before. Link Microsoft to that account once.
        const cred = firebase.auth.OAuthProvider.credentialFromError ? firebase.auth.OAuthProvider.credentialFromError(err) : err.credential;
        const email = (err.customData && err.customData.email) || err.email || "";
        try { if (cred) localStorage.setItem(PENDING_KEY, JSON.stringify(cred.toJSON())); } catch(e3) {}
        try {
          await auth.sendSignInLinkToEmail(email, {url: location.origin + location.pathname, handleCodeInApp: true});
          try { localStorage.setItem(EMAIL_KEY, email); } catch(e4) {}
          gate(`<p><b>One-time step.</b> ${esc(email)} already has an account from an earlier email sign-in. We just emailed you a link. Open it on this device and Microsoft sign-in will be connected. After that, the Microsoft button is all you need.</p>`);
        } catch(e5){ showSignIn("That account already exists. Use the email link below once, then Microsoft sign-in will work.", true); }
        return;
      }
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request"){ if (m){ m.textContent = ""; } return; }
      if (m){ m.className = "gmsg err"; m.textContent = "Microsoft sign-in didn't work: " + (err && err.message || err); }
    }
  }
  function showSignIn(msg, err){
    gate(`<p>Sign in with your 1915 South Microsoft account (the one you use for Outlook and Teams).</p>
      <button class="ovbtn" type="button" id="msBtn" style="display:flex;align-items:center;justify-content:center;gap:10px"><svg width="18" height="18" viewBox="0 0 21 21" aria-hidden="true"><rect x="1" y="1" width="9" height="9" fill="#f25022"/><rect x="11" y="1" width="9" height="9" fill="#7fba00"/><rect x="1" y="11" width="9" height="9" fill="#00a4ef"/><rect x="11" y="11" width="9" height="9" fill="#ffb900"/></svg>Sign in with Microsoft</button>
      <div class="gmsg ${err ? "err" : ""}" id="siMsg">${esc(msg || "")}</div>
      <details style="margin-top:14px"><summary style="cursor:pointer;font-size:13px;color:#3F738D">Can't use Microsoft? Email me a sign-in link instead</summary>
      <form id="siForm" style="margin-top:10px"><input type="email" id="siEmail" required autocomplete="email" placeholder="you@${esc(DOMAIN || "company.com")}">
      <button class="ovbtn ghost" type="submit">Email me a sign-in link</button></form></details>`);
    $("msBtn").addEventListener("click", signInMicrosoft);
    $("siForm").addEventListener("submit", async e => {
      e.preventDefault();
      const email = $("siEmail").value.trim().toLowerCase();
      if (DOMAIN && !email.endsWith("@" + DOMAIN)){ $("siMsg").className = "gmsg err"; $("siMsg").textContent = "Use your @" + DOMAIN + " email."; return; }
      $("siMsg").className = "gmsg"; $("siMsg").textContent = "Sending...";
      try {
        await auth.sendSignInLinkToEmail(email, {url: location.origin + location.pathname, handleCodeInApp: true});
        try { localStorage.setItem(EMAIL_KEY, email); } catch(e2) {}
        gate(`<p><b>Check your email.</b> We sent a sign-in link to <b>${esc(email)}</b>. Open it on this device and you're in.</p><p>It can take a minute. Check junk mail if it doesn't show up.</p>`);
      } catch(err2){ $("siMsg").className = "gmsg err"; $("siMsg").textContent = "Couldn't send the link: " + (err2 && err2.message || err2); }
    });
  }

  async function finishLink(){
    if (!auth.isSignInWithEmailLink(location.href)) return;
    let email = ""; try { email = localStorage.getItem(EMAIL_KEY) || ""; } catch(e) {}
    if (!email){
      gate(`<p>Confirm your email to finish signing in.</p><form id="cfForm"><input type="email" id="cfEmail" required placeholder="you@${esc(DOMAIN)}"><button class="ovbtn" type="submit">Finish signing in</button></form>`);
      email = await new Promise(res => $("cfForm").addEventListener("submit", e => { e.preventDefault(); res($("cfEmail").value.trim().toLowerCase()); }));
    }
    try {
      const res = await auth.signInWithEmailLink(email, location.href);
      try { localStorage.removeItem(EMAIL_KEY); } catch(e) {}
      let pending = null; try { pending = localStorage.getItem(PENDING_KEY); } catch(e) {}
      if (pending && res && res.user){
        try { await res.user.linkWithCredential(firebase.auth.AuthCredential.fromJSON(JSON.parse(pending))); } catch(e) {}
        try { localStorage.removeItem(PENDING_KEY); } catch(e) {}
      }
    }
    catch(err){
      const code = err && err.code || "";
      if (/admin-restricted-operation|user-not-found|operation-not-allowed/.test(code)) showSignIn("Your account isn't set up for this app yet. Ask Frank Pina to add " + email + ", then try again.", true);
      else showSignIn("That sign-in link didn't work. It may have expired or already been used. Send a new one.", true);
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
      const ref = fs.collection("verifications").doc();
      const batch = fs.batch();
      batch.set(ref, summary);
      if (html) batch.set(fs.collection("verificationRecords").doc(ref.id), Object.assign({htmlRecord: html}, stamp));
      await batch.commit();
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
    const rows = ROWS.filter(r => (!onlyFlag || r.protectionFlag === "open" || r.protectionFlag === "still") && (!q || [r.order, r.store, r.associate, r.manager, r.protection].join(" ").toLowerCase().includes(q)));
    $("ovRecHead").innerHTML = `<th>Submitted</th>${all ? "<th>Store</th>" : ""}<th>Order #</th><th>Associate</th><th>Manager</th><th>Protection</th><th>Checks</th><th></th>`;
    $("ovRecBody").innerHTML = rows.map(r => `<tr><td>${esc(fmt(r.submittedAt))}</td>${all ? `<td>${esc(r.store)}</td>` : ""}<td><b>${esc(r.order)}</b></td><td>${esc(r.associate)}</td><td>${esc(r.manager)}</td><td>${protBadge(r)}</td><td>${esc(r.checksConfirmed)}/${esc(r.checksTotal)}</td><td>${(r.hasRecord || r.htmlRecord) ? `<button data-id="${esc(r.id)}">Open</button>` : ""}</td></tr>`).join("")
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

  /* ---------- start ---------- */
  let started = false;
  async function start(u){
    if (started) return; started = true;
    const email = String(u.email || "").toLowerCase();
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
    $("ovGate").hidden = true; $("ovBar").hidden = false;
  }

  (async () => {
    const b = $("submitBtn"); if (b){ b.disabled = true; b.title = "Sign in to submit"; }
    gate(`<p>Loading...</p>`);
    await finishLink();
    try { await auth.getRedirectResult(); } catch(e) { if (e && e.code === "auth/account-exists-with-different-credential") showSignIn("This email already has an account. Use the email link once, then Microsoft will work.", true); }
    auth.onAuthStateChanged(u => { if (u) start(u); else showSignIn(); });
  })();
})();
