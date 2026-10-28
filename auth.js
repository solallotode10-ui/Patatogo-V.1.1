(function () {
  var C = window.PT_CONFIG, MODE = window.MODE || "player";
  var $ = function (s) { return document.querySelector(s); };
  if (!C || !C.url || C.url.indexOf("COLLE") === 0) {
    document.body.innerHTML = '<p style="padding:24px;font:600 16px sans-serif">Renseigne config.js avec l’URL et la clé de ton projet Supabase (voir LISEZMOI.md).</p>';
    return;
  }
  var useLocal = localStorage.getItem("pt-rem") !== "0";
  var storage = {
    getItem: function (k) { var a = localStorage.getItem(k); return a !== null ? a : sessionStorage.getItem(k); },
    setItem: function (k, v) { var a = useLocal ? localStorage : sessionStorage, b = useLocal ? sessionStorage : localStorage; b.removeItem(k); a.setItem(k, v); },
    removeItem: function (k) { localStorage.removeItem(k); sessionStorage.removeItem(k); }
  };
  var sb = supabase.createClient(C.url, C.key, { auth: { storage: storage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } });

  /* ---- adaptateur de base de données (même API que le jeu) ---- */
  function makeDB() {
    var rows = async function (prefix) {
      var r = await sb.from("docs").select("path,data").like("path", prefix + "/%");
      if (r.error) throw r.error;
      return r.data.filter(function (x) { return x.path.slice(prefix.length + 1).indexOf("/") < 0; })
        .map(function (x) { return { id: x.path.slice(prefix.length + 1), data: function () { return x.data; } }; });
    };
    return {
      doc: function (p) {
        return {
          set: async function (d) { var r = await sb.from("docs").upsert({ path: p, data: d, updated_at: new Date().toISOString() }); if (r.error) throw r.error; },
          get: async function () { var r = await sb.from("docs").select("data").eq("path", p).maybeSingle(); if (r.error) throw r.error; var v = r.data ? r.data.data : null; return { exists: !!r.data, data: function () { return v; } }; },
          delete: async function () { var r = await sb.from("docs").delete().eq("path", p); if (r.error) throw r.error; },
          onSnapshot: function (cb, er) {
            var on = true, self = this;
            var tick = async function () { try { var x = await self.get(); if (on) cb(x); } catch (e) { if (er) er(e); } };
            tick(); var iv = setInterval(tick, 30000);
            return function () { on = false; clearInterval(iv); };
          }
        };
      },
      collection: function (p) {
        return {
          onSnapshot: function (cb, er) {
            var on = true, prev = {};
            var ms = p.indexOf("ev/") === 0 ? 6000 : p.indexOf("/market") > 0 ? 8000 : p === "cards" ? 600000 : 10000;
            var tick = async function () {
              try {
                var docs = await rows(p); if (!on) return;
                var ch = []; var now = {};
                docs.forEach(function (d) { now[d.id] = 1; if (!prev[d.id]) ch.push({ type: "added", doc: d }); });
                prev = now;
                cb({ docs: docs, empty: docs.length === 0, size: docs.length, docChanges: function () { return ch; } });
              } catch (e) { if (er) er(e); }
            };
            tick(); var iv = setInterval(tick, ms);
            return function () { on = false; clearInterval(iv); };
          }
        };
      }
    };
  }

  /* ---- écran de connexion ---- */
  function showLogin(msg) {
    var el = $("#auth");
    if (!el) { el = document.createElement("div"); el.id = "auth"; document.body.appendChild(el); }
    el.hidden = false;
    var mode = "in", note = msg || "";
    function draw() {
      el.innerHTML =
        '<form class="acard" id="af"><h1>Patatogo' + (MODE === "admin" ? " Admin" : "") + '</h1>' +
        '<p class="sub">' + (MODE === "admin" ? "Espace administrateur" : "Collectionne les chips et joue aux tables.") + '</p>' +
        (MODE === "admin" ? "" : '<div class="tabs"><button type="button" data-m="in" class="' + (mode === "in" ? "on" : "") + '">Connexion</button><button type="button" data-m="up" class="' + (mode === "up" ? "on" : "") + '">Créer un compte</button></div>') +
        (mode === "up" ? '<label for="an">Pseudo</label><input id="an" maxlength="16" required autocomplete="nickname">' : "") +
        '<label for="ae">Email</label><input id="ae" type="email" required autocomplete="email">' +
        '<label for="ap">Mot de passe</label><input id="ap" type="password" minlength="6" required autocomplete="' + (mode === "up" ? "new-password" : "current-password") + '">' +
        '<label class="chk"><input type="checkbox" id="ar"' + (useLocal ? " checked" : "") + '> Se souvenir de moi</label>' +
        '<p class="err" id="am" role="alert"></p>' +
        '<button class="btn" type="submit">' + (mode === "up" ? "Créer mon compte" : "Se connecter") + '</button></form>';
      $("#am").textContent = note; note = "";
      el.querySelectorAll("[data-m]").forEach(function (b) { b.onclick = function () { mode = b.dataset.m; draw(); }; });
      $("#af").onsubmit = async function (e) {
        e.preventDefault();
        var email = $("#ae").value.trim(), pw = $("#ap").value, rem = $("#ar").checked;
        useLocal = rem; localStorage.setItem("pt-rem", rem ? "1" : "0");
        var btn = el.querySelector("button[type=submit]"); btn.disabled = true;
        try {
          var r;
          if (mode === "up") {
            var nick = $("#an").value.trim();
            r = await sb.auth.signUp({ email: email, password: pw, options: { data: { nick: nick } } });
            if (r.error) throw r.error;
            if (!r.data.session) { mode = "in"; note = "Compte créé. Confirme ton email puis connecte-toi."; draw(); return; }
            begin(r.data.session, nick);
          } else {
            r = await sb.auth.signInWithPassword({ email: email, password: pw });
            if (r.error) throw r.error;
            begin(r.data.session);
          }
        } catch (err) {
          var m = String(err.message || err);
          if (/invalid login/i.test(m)) m = "Email ou mot de passe incorrect.";
          else if (/already registered/i.test(m)) m = "Un compte existe déjà avec cet email.";
          else if (/password/i.test(m)) m = "Mot de passe trop court (6 caractères minimum).";
          $("#am").textContent = m; btn.disabled = false;
        }
      };
    }
    draw();
  }

  /* ---- démarrage ---- */
  async function begin(session, nick) {
    window.UID = session.user.id;
    nick = nick || (session.user.user_metadata && session.user.user_metadata.nick);
    if (MODE === "admin") {
      var a = await sb.from("admins").select("user_id").eq("user_id", UID).maybeSingle();
      if (!a.data) { await sb.auth.signOut(); showLogin("Ce compte n’est pas administrateur."); return; }
    }
    var db = makeDB(); window.SBDB = db;
    window.claude = { use: async function (n) { return n === "user" ? { id: async function () { return UID; } } : db; } };
    var key = "patatogo-" + UID, st = null;
    try { var g = await db.doc("saves/" + UID).get(); if (g.exists) st = g.data(); } catch (e) {}
    if (!st) { try { st = JSON.parse(localStorage.getItem(key)); } catch (e) {} }
    st = st || {}; st.set = st.set || {};
    try {
      var res = await Promise.all([db.doc("cfg/main").get(), sb.from("docs").select("data").like("path", "cards/%")]);
      if (res[0].exists) { var v = res[0].data(); if (v.rarities) st.rarities = v.rarities; if (v.packs) st.packs = v.packs; st.shop = v.shop || []; st.set = Object.assign(st.set, v.set || {}); }
      if (res[1].data && res[1].data.length) st.cards = res[1].data.map(function (r) { return r.data; });
    } catch (e) {}
    if (nick) st.nick = nick;
    try { localStorage.setItem(key, JSON.stringify(st)); } catch (e) {}
    var au = $("#auth"); if (au) au.hidden = true;
    var s = document.createElement("script"); s.src = "app.js?v=" + (C.v || "1");
    s.onload = function () { if (MODE === "player") installUI(); };
    document.body.appendChild(s);
    $("#out").onclick = async function () { await sb.auth.signOut(); location.reload(); };
  }

  /* ---- installation de l'app ---- */
  var ua = navigator.userAgent;
  var isIOS = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  var isAndroid = /android/i.test(ua);
  var standalone = function () { return (window.matchMedia && matchMedia("(display-mode: standalone)").matches) || navigator.standalone; };
  function installUI() {
    var b = $("#inst"); if (!b || standalone()) return;
    b.hidden = false; b.onclick = askInstall;
    if (!localStorage.getItem("pt-inst-seen")) { localStorage.setItem("pt-inst-seen", "1"); askInstall(); }
  }
  function askInstall() {
    var d = $("#ins"); if (d) d.remove();
    d = document.createElement("div"); d.id = "ins"; d.className = "modal"; d.style.zIndex = 40;
    var canNative = !!window.PT_INSTALL, h;
    var shareIcon = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><path d="M12 15V3M8 7l4-4 4 4M5 11v9h14v-9"/></svg>';
    if (canNative) {
      h = '<p class="sub">Installe Patatogo sur ton téléphone pour jouer en plein écran, comme une vraie app.</p><div class="row"><button class="btn" id="insgo">Télécharger l’app</button><button class="btn alt" id="insno">Plus tard</button></div>';
    } else if (isIOS) {
      h = '<p class="sub">Sur iPhone et iPad, l’installation se fait depuis Safari :</p>' +
        '<div class="step"><b>1</b><span>Ouvre Patatogo dans <strong>Safari</strong>.</span></div>' +
        '<div class="step"><b>2</b><span>Appuie sur le bouton <strong>Partager</strong> ' + shareIcon + ' en bas de l’écran.</span></div>' +
        '<div class="step"><b>3</b><span>Fais défiler et choisis <strong>Sur l’écran d’accueil</strong>.</span></div>' +
        '<div class="step"><b>4</b><span>Appuie sur <strong>Ajouter</strong> : l’icône Patatogo apparaît.</span></div><div class="row"><button class="btn" id="insno">Compris</button></div>';
    } else if (isAndroid) {
      h = '<p class="sub">Pour installer Patatogo :</p>' +
        '<div class="step"><b>1</b><span>Ouvre le menu de ton navigateur (les trois points en haut).</span></div>' +
        '<div class="step"><b>2</b><span>Choisis <strong>Installer l’application</strong> ou <strong>Ajouter à l’écran d’accueil</strong>.</span></div>' +
        '<div class="step"><b>3</b><span>Confirme : l’icône apparaît sur ton écran.</span></div><div class="row"><button class="btn" id="insno">Compris</button></div>';
    } else {
      h = '<p class="sub">Sur ordinateur, cherche l’icône d’installation à droite de la barre d’adresse, ou ouvre le menu du navigateur puis <strong>Installer Patatogo</strong>. Sur téléphone, ouvre ce site depuis ton navigateur pour obtenir les étapes.</p><div class="row"><button class="btn" id="insno">Compris</button></div>';
    }
    d.innerHTML = '<div><h2>Télécharger l’app</h2>' + h + '</div>';
    document.body.appendChild(d);
    var no = $("#insno"); if (no) no.onclick = function () { d.remove(); };
    var go = $("#insgo");
    if (go) go.onclick = async function () {
      var e = window.PT_INSTALL; window.PT_INSTALL = null; d.remove();
      try { e.prompt(); await e.userChoice; } catch (x) {}
    };
  }

  sb.auth.getSession().then(function (r) {
    if (r.data && r.data.session) begin(r.data.session); else showLogin();
  });
})();
