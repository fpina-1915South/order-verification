/* 1915 South Order Verification: sign-in, central save and the records list.
   People sign in with a one-time email link (same sign-in as the Smart Scheduler).
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
  function showSignIn(msg, err){
    gate(`<p>Sign in with your work email. We'll send you a one-time link. No password needed.</p>
      <form id="siForm"><input type="email" id="siEmail" required autocomplete="email" placeholder="you@${esc(DOMAIN || "company.com")}">
      <button class="ovbtn" type="submit">Email me a sign-in link</button></form>
      <div class="gmsg ${err ? "err" : ""}" id="siMsg">${esc(msg || "")}</div>`);
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
    try { await auth.signInWithEmailLink(email, location.href); try { localStorage.removeItem(EMAIL_KEY); } catch(e) {} }
    catch(err){
      const code = err && err.code || "";
      if (/admin-restricted-operation|user-not-found|operation-not-allowed/.test(code)) showSignIn("Your account isn't set up for this app yet. Ask Frank Pina to add " + email + ", then try again.", true);
      else showSignIn("That sign-in link didn't work. It may have expired or already been used. Send a new one.", true);
    }
    history.replaceState(null, "", location.origin + location.pathname);
  }

  /* ---------- who can see the Records list: owner, plus admins from the Smart Scheduler's Access list ---------- */
  async function isAdmin(email){
    const e = String(email || "").toLowerCase();
    if (OWNER && e === OWNER) return true;
    try {
      const s = await fs.doc("config/access").get();
      const a = s.exists ? s.data() : {};
      return (a.admins || []).map(x => String(x).toLowerCase()).includes(e);
    } catch(err){ return false; }
  }

  /* ---------- central save ---------- */
  function wireSubmit(u){
    window.OV_SUBMIT = async record => {
      const body = Object.assign({}, record, {
        submittedBy: u.uid,
        submittedByEmail: String(u.email || "").toLowerCase(),
        submittedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      await fs.collection("verifications").add(body);
    };
    const b = $("submitBtn"); if (b){ b.disabled = false; b.title = ""; }
  }

  /* ---------- records list (owner and admins) ---------- */
  let ROWS = [];
  const fmt = ts => { try { const d = ts && ts.toDate ? ts.toDate() : null; return d ? d.toLocaleString([], {month:"numeric", day:"numeric", year:"2-digit", hour:"numeric", minute:"2-digit"}) : ""; } catch(e){ return ""; } };
  const protBadge = r => {
    const f = r.protectionFlag, b = (bg, t) => `<span style="display:inline-block;background:${bg};color:#fff;border-radius:10px;padding:2px 8px;font-size:11px;font-weight:700;white-space:nowrap">${t}</span>`;
    if (f === "open") return b("#802020", "Declined, no follow-up");
    if (f === "still") return b("#F68C2C", "Declined after rebuild");
    if (f === "saved") return b("#2E9E6A", "Saved by leader");
    return esc(r.protection || "");
  };
  function drawRows(){
    const q = $("ovFilter").value.trim().toLowerCase();
    const onlyFlag = $("ovFlagOnly") && $("ovFlagOnly").checked;
    const rows = ROWS.filter(r => (!onlyFlag || r.protectionFlag === "open" || r.protectionFlag === "still") && (!q || [r.order, r.store, r.associate, r.manager, r.protection].join(" ").toLowerCase().includes(q)));
    $("ovRecBody").innerHTML = rows.map(r => `<tr><td>${esc(fmt(r.submittedAt))}</td><td>${esc(r.store)}</td><td>${esc(r.order)}</td><td>${esc(r.associate)}</td><td>${protBadge(r)}</td><td>${esc(r.checksConfirmed)}/${esc(r.checksTotal)}</td><td>${r.htmlRecord ? `<button data-id="${esc(r.id)}">Open</button>` : ""}</td></tr>`).join("")
      || `<tr><td colspan="7">No records${q ? " match that filter" : " yet"}.</td></tr>`;
  }
  async function openRecords(){
    $("ovRec").showModal(); $("ovRecMsg").className = "gmsg"; $("ovRecMsg").textContent = "Loading...";
    try {
      const snap = await fs.collection("verifications").orderBy("submittedAt", "desc").limit(300).get();
      ROWS = snap.docs.map(d => Object.assign({id:d.id}, d.data()));
      $("ovRecMsg").textContent = ROWS.length >= 300 ? "Showing the latest 300." : "";
      drawRows();
    } catch(e){ $("ovRecMsg").className = "gmsg err"; $("ovRecMsg").textContent = "Couldn't load records: " + e.message; }
  }
  function wireRecords(){
    $("ovRecords").hidden = false;
    $("ovRecords").onclick = openRecords;
    $("ovRecClose").onclick = () => $("ovRec").close();
    $("ovFilter").oninput = drawRows;
    $("ovFlagOnly").onchange = drawRows;
    $("ovRecBody").onclick = e => {
      const id = e.target && e.target.getAttribute("data-id"); if (!id) return;
      const r = ROWS.find(x => x.id === id); if (!r || !r.htmlRecord) return;
      const url = URL.createObjectURL(new Blob([r.htmlRecord], {type:"text/html"}));
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    };
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
    if (await isAdmin(email)) wireRecords();
    $("ovGate").hidden = true; $("ovBar").hidden = false;
  }

  (async () => {
    const b = $("submitBtn"); if (b){ b.disabled = true; b.title = "Sign in to submit"; }
    gate(`<p>Loading...</p>`);
    await finishLink();
    auth.onAuthStateChanged(u => { if (u) start(u); else showSignIn(); });
  })();
})();
