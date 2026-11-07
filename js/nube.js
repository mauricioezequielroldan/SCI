/* SCI Bomberos – Asistente de nube y registro de consentimientos (v2.5)
   Se carga AL FINAL. Agrega:
   1) Asistente en Ajustes: arma el código del script con la clave puesta, guía los pasos de Google,
      prueba la conexión y genera un «código de conexión» (texto, enlace y QR) para el administrador del cuartel.
   2) El administrador pega el código (o abre el enlace) y queda conectado.
   3) Los consentimientos (términos, privacidad, dato de salud, anexo de beta y equipos por QR) se envían
      a la planilla «Consentimientos» del Drive de la cuenta de la nube.
   4) Si la nube la provee el proyecto (beta), se muestra y se pide aceptar un anexo de privacidad. */
'use strict';
const NUBE_PREF = 'SCI1.', NUBE_PEND = 'sci-nube-pend', NUBE_SENT = 'sci-consent-sent', NUBE_DEV = 'sci-device-id', ANEXO_VER = 'b1';
const nb64 = s => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const nunb64 = s => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))));
function nubeCode(url, token, managed) { return NUBE_PREF + nb64(JSON.stringify({ u: url, k: token, m: managed ? 1 : 0 })); }
function nubeParse(txt) {
  txt = String(txt || '').trim(); const m = txt.match(/SCI1\.[A-Za-z0-9_-]+/); if (!m) return null;
  try { const j = JSON.parse(nunb64(m[0].slice(NUBE_PREF.length))); return j && /^https:\/\//.test(j.u) && j.k ? j : (j && /^http:\/\/(127\.|localhost)/.test(j.u) && j.k ? j : null); } catch (e) { return null; }
}
const nubeLink = code => location.href.split('#')[0].split('?')[0] + '#nube=' + code;
function devId() { let d = localStorage.getItem(NUBE_DEV); if (!d) { d = uid(); localStorage.setItem(NUBE_DEV, d); } return d; }
const devName = () => ((navigator.userAgent.match(/Android|iPhone|iPad|Windows|Macintosh|Linux/) || ['Dispositivo'])[0]) + ' · ' + devId().slice(-4);
function rndToken() { const a = new Uint8Array(18); crypto.getRandomValues(a); return 'SCI-' + Array.from(a, b => 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'[b % 57]).join(''); }
const isManaged = () => { const c = C(); return !!(c && c.cloud && c.cloud.on && c.cloud.managed); };

/* ---------- Enlace #nube=… (al escanear el QR de conexión) ---------- */
(function () { const h = location.hash; if (/^#nube=/.test(h)) { localStorage.setItem(NUBE_PEND, decodeURIComponent(h.slice(6))); history.replaceState(null, '', location.pathname + location.search); } })();
function checkPending() {
  const code = localStorage.getItem(NUBE_PEND); if (!code || !$('#modal').classList.contains('hidden') || (typeof isTeamLink === 'function' && isTeamLink())) return;
  if (S.view === 'home' || S.view === 'login' || !U()) { if (!checkPending._t) { checkPending._t = 1; toast('☁ Recibiste un código de conexión. Entrá con el usuario administrador del cuartel para aplicarlo.', '', 7000); } return; }
  if (!isAdmin()) return;
  modal('☁ Código de conexión recibido', '<p>¿Conectar <b>' + esc(C().nombre) + '</b> a esta nube?</p><p class="muted"><small>Después vas a poder ver a los equipos en vivo por QR. Los consentimientos del personal se guardan en esa cuenta.</small></p>',
    [{ label: 'Ahora no', fn: () => { localStorage.removeItem(NUBE_PEND); } }, { label: 'Conectar', cls: 'primary', fn: async () => { const r = await nubeApply(code); localStorage.removeItem(NUBE_PEND); if (!r) return; } }]);
}

/* ---------- Aplicar un código de conexión ---------- */
async function nubeApply(txt) {
  const j = nubeParse(txt); if (!j) { toast('Ese código no es válido. Copialo completo (empieza con SCI1.)', 'bad', 6000); return false; }
  toast('Probando la conexión…', '', 4000);
  try { const r = await cloudGet({ action: 'list', cuartel: C().id }, { url: j.u, token: j.k }); if (!r || !r.ok) throw new Error((r && r.error) || 'respuesta inválida'); }
  catch (e) { toast('No se pudo conectar: ' + (e.message || 'sin respuesta') + '. Revisá la conexión a internet o pedí un código nuevo.', 'bad', 8000); return false; }
  const c = C(); c.cloud = { on: true, url: j.u, token: j.k, anon: true, managed: !!j.m, since: now() }; save(true);
  try { if (typeof teamsPush === 'function' && OPx()) teamsPush(OPx()); } catch (e) { }
  render(); toast('✔ Cuartel conectado a la nube. Ya podés usar los QR de equipos en vivo.', '', 6000);
  setTimeout(() => { consentSync(true); if (c.cloud.managed) render(); }, 400);
  setTimeout(() => modal('✔ Conectado', '<p>Importante: <b>exportá de nuevo el respaldo del cuartel</b> (Ajustes) e importalo en los otros dispositivos, así todos quedan conectados.</p>', [{ label: 'Exportar respaldo ahora', cls: 'primary', fn: () => { ACT['export-cuartel'](); } }, { label: 'Después' }]), 1200);
  return true;
}

/* ---------- Sección en Ajustes ---------- */
const _tAjustesN = tAjustes;
tAjustes = function () {
  const c = C(), k = c.cloud || {}, on = !!(k.on && k.url && k.token);
  return '<section class="card narrow"><h2>☁ Nube y equipos en vivo</h2>' +
    (on ? '<p><span class="pill ok">✔ Conectado</span>' + (k.managed ? ' <span class="pill info">Nube provista por el proyecto (beta)</span>' : '') + '</p><p class="muted"><small>Los QR de equipos funcionan en vivo. Los consentimientos se guardan en la planilla «Consentimientos» de esa cuenta.</small></p>' +
      '<div class="row"><button type="button" class="btn sm" data-act="cloud-test2">🔌 Probar conexión</button><button type="button" class="btn sm" data-act="nube-share">📲 Pasar a otro dispositivo</button><button type="button" class="btn sm" data-act="consent-now">🗂 Enviar consentimientos ahora</button><button type="button" class="btn sm bad" data-act="nube-off">Desconectar</button></div><span id="nubetest" class="muted"></span>'
      : '<p class="muted">Sin nube, los equipos con QR trabajan en «modo registro» (mandan su archivo al final).</p>') +
    '<div class="sep"></div><h3>🔑 Tengo un código de conexión</h3><p class="muted"><small>Te lo manda quien administra la nube. Empieza con <b>SCI1.</b></small></p><div class="row nowrap"><input type="text" id="nubecode" placeholder="SCI1.…" autocomplete="off" autocapitalize="off" spellcheck="false"><button type="button" class="btn primary" data-act="nube-paste">Conectar</button></div>' +
    '<div class="sep"></div><details><summary>🧙 Crear una nube nueva (para quien la administra)</summary><p class="muted"><small>Se hace una vez por cuartel, desde una computadora y con la cuenta de Google que va a guardar los datos (recomendado: una cuenta exclusiva del proyecto o del cuartel, no la del trabajo).</small></p><button type="button" class="btn primary" data-act="nube-wizard">Abrir el asistente</button></details></section>' +
    _tAjustesN().replace(/<div class="sep"><\/div><h3>☁ Respaldo en la nube y equipos en vivo<\/h3>/, '<div class="sep"></div><details><summary>Configuración manual de la nube</summary><h3>☁ Respaldo en la nube y equipos en vivo</h3>').replace('<div class="sep"></div><h3>Valores por defecto', '</details><div class="sep"></div><h3>Valores por defecto');
};
ACT['nube-paste'] = async () => { const v = ($('#nubecode') || {}).value; if (!v) return toast('Pegá el código primero.', 'bad'); await nubeApply(v); };
ACT['cloud-test2'] = async () => { const k = C().cloud, o = $('#nubetest'); if (o) o.textContent = ' Probando…'; try { const r = await cloudGet({ action: 'list', cuartel: C().id }, k); if (o) o.innerHTML = r && r.ok ? ' <span class="okc">✔ Conexión correcta</span>' : ' <span class="ec">✖ ' + esc((r && r.error) || 'Error') + '</span>'; } catch (e) { if (o) o.innerHTML = ' <span class="ec">✖ No responde</span>'; } };
ACT['nube-off'] = async () => { if (!(await ask('Desconectar la nube', 'Los equipos con QR vuelven al modo registro. Los datos ya guardados en la nube no se borran.', 'Desconectar', 'bad'))) return; C().cloud = { on: false, url: '', token: '', anon: true }; save(true); render(); };
ACT['nube-share'] = () => { const k = C().cloud; nubeShowCode(nubeCode(k.url, k.token, k.managed), 'Pasar la conexión a otro dispositivo', 'Abrí este QR con la cámara del otro celular, o mandale el código. Después entrá con el usuario administrador.'); };
function nubeShowCode(code, title, help) {
  const link = nubeLink(code); let svg = ''; try { svg = QR.svg(link); } catch (e) { }
  modal('📲 ' + title, '<p class="muted"><small>' + help + '</small></p><div class="qrwrap"><div class="qrbox" style="--ec:#1c6dd0">' + svg + '<b>Código de conexión</b><small>SCI Bomberos</small></div><div><label>Código</label><textarea readonly rows="4" class="mono">' + esc(code) + '</textarea>' +
    '<p class="wc"><small>⚠ Este código da acceso a los datos del cuartel en la nube. Mandalo solo al administrador, por un canal privado.</small></p></div></div>',
    [{ label: 'Cerrar' }, { label: '📋 Copiar código', fn: () => { copyText(code); return false; } }, { label: '🟢 WhatsApp', cls: 'primary', fn: () => { window.open('https://wa.me/?text=' + encodeURIComponent('SCI Bomberos — código de conexión de la nube del cuartel.\n1) Abrí este enlace en el celular del administrador: ' + link + '\n2) Entrá con tu usuario administrador y tocá «Conectar».\nSi no funciona el enlace: Ajustes → «Tengo un código de conexión» → pegá: ' + code), '_blank', 'noopener'); return false; } }], { wide: true });
}

/* ---------- Asistente para crear la nube ---------- */
let W = null;
ACT['nube-wizard'] = () => { W = { step: 1, token: rndToken(), email: C().emailParte || '', url: '', ok: false, managed: true }; wizShow(); };
function wizShow() {
  const st = W.step, dots = [1, 2, 3, 4].map(i => '<span class="pill ' + (i < st ? 'ok' : i === st ? 'info' : '') + '">' + i + '</span>').join(' ');
  let h = '<div class="row" style="margin-bottom:10px">' + dots + '</div>', acts = [{ label: 'Cerrar' }];
  if (st === 1) {
    h += '<h3>1 · Datos de la nube</h3>' + F.text('Correo que recibe los informes al cerrar cada operación', 'email', W.email, { type: 'email', attrs: ' placeholder="jefe@micuartel.org"' }) +
      '<p class="muted"><small>La clave secreta se generó sola: <b class="mono">' + esc(W.token) + '</b>. No hace falta anotarla.</small></p>' +
      F.chk('Esta nube la administra el proyecto / desarrollador durante la beta (se avisa en la privacidad del cuartel)', 'managed', W.managed);
    acts.push({ label: 'Siguiente →', cls: 'primary', fn: () => { const f = fdata(); if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email || '')) return merr('Poné un correo válido.'); W.email = f.email; W.managed = !!f.managed; W.step = 2; setTimeout(wizShow, 10); } });
  } else if (st === 2) {
    h += '<h3>2 · Copiar el código del script</h3><p>Tocá el botón: el código ya trae tu clave y tu correo puestos.</p><button type="button" class="btn primary block big" data-act="wiz-copy"' + (W.code ? '' : ' disabled') + '>📋 Copiar el código del script</button><p id="wizcopy" class="muted">' + (W.code ? '' : (W.codeErr ? '<span class="ec">' + W.codeErr + '</span> <button type="button" class="btn sm" data-act="wiz-reload">Reintentar</button>' : 'Preparando el código…')) + '</p>' + (W.code ? '<details><summary>Ver el código (si el botón no copia, seleccioná todo y copiá)</summary><textarea readonly rows="8" class="mono" onclick="this.select()">' + esc(W.code) + '</textarea></details>' : '');
    if (!W.code && !W.codeErr && !W.loading) wizLoad();
    acts.push({ label: '← Atrás', fn: () => { W.step = 1; setTimeout(wizShow, 10); } }, { label: 'Ya lo copié →', cls: 'primary', fn: () => { W.step = 3; setTimeout(wizShow, 10); } });
  } else if (st === 3) {
    h += '<h3>3 · Pegarlo en Google</h3><ol class="wizsteps">' +
      '<li>Abrí <a href="https://script.google.com/home/projects/create" target="_blank" rel="noopener"><b>script.google.com</b> (nuevo proyecto)</a> con la cuenta de Google de la nube.</li>' +
      '<li>Borrá lo que aparece escrito (<b>Ctrl+A</b> y <b>Suprimir</b>) y pegá el código (<b>Ctrl+V</b>). Guardá con <b>Ctrl+S</b>.</li>' +
      '<li>Arriba a la derecha: <b>Implementar → Nueva implementación</b>. En la ruedita ⚙ elegí <b>Aplicación web</b>.</li>' +
      '<li><b>Ejecutar como:</b> Yo · <b>Quién tiene acceso: Cualquier persona</b> ⚠ → <b>Implementar</b>.</li>' +
      '<li><b>Autorizar acceso</b> → elegí la cuenta. Si aparece «Google no verificó esta app»: <b>Configuración avanzada → Ir a … (no seguro) → Permitir</b>. Es normal: la app es tuya.</li>' +
      '<li>Copiá la <b>URL de la aplicación web</b> (termina en <b>/exec</b>).</li></ol>';
    acts.push({ label: '← Atrás', fn: () => { W.step = 2; setTimeout(wizShow, 10); } }, { label: 'Tengo la URL →', cls: 'primary', fn: () => { W.step = 4; setTimeout(wizShow, 10); } });
  } else if (st === 4) {
    h += '<h3>4 · Pegar la URL y probar</h3><div class="row nowrap"><input type="url" id="wizurl" value="' + esc(W.url) + '" placeholder="https://script.google.com/macros/s/…/exec" autocapitalize="off" spellcheck="false"><button type="button" class="btn" data-act="wiz-test">🔌 Probar</button></div><div id="wizres" class="coordfb"></div>' +
      (W.ok ? '<div class="sep"></div><p class="okc"><b>✔ ¡La nube funciona!</b> Ahora elegí:</p><div class="grid g2"><button type="button" class="btn primary block" data-act="wiz-use">Conectar ESTE cuartel</button><button type="button" class="btn block" data-act="wiz-code">📲 Código para otro cuartel</button></div>' : '');
    acts.push({ label: '← Atrás', fn: () => { W.step = 3; setTimeout(wizShow, 10); } });
  }
  modal('🧙 Asistente de nube', h, acts, { wide: true });
  if (st === 4 && W.ok) $('#wizres').innerHTML = '<span class="okc">✔ Conexión correcta</span>';
}
async function wizLoad() {
  W.loading = true;
  try {
    const r = await fetch('apps-script/Code.gs', { cache: 'no-store' }); if (!r.ok) throw new Error(r.status);
    let t = await r.text();
    t = t.replace(/var TOKEN = '[^']*';/, "var TOKEN = '" + W.token + "';").replace(/var EMAIL_TO = '[^']*';/, "var EMAIL_TO = '" + W.email.replace(/'/g, '') + "';");
    if (t.indexOf(W.token) < 0) throw new Error('formato'); W.code = t; W.codeErr = '';
  } catch (e) { W.codeErr = 'No se pudo obtener el código (¿sin internet?).'; }
  W.loading = false; if (W.step === 2 && !$('#modal').classList.contains('hidden')) wizShow();
}
ACT['wiz-reload'] = () => { W.codeErr = ''; wizShow(); };
ACT['wiz-copy'] = async () => { if (!W.code) return; await copyText(W.code); const o = $('#wizcopy'); if (o) o.innerHTML = '<span class="okc">✔ Copiado (' + W.code.split('\n').length + ' líneas). Ahora pasá al paso 3.</span>'; };
ACT['wiz-test'] = async () => {
  const url = ($('#wizurl') || {}).value.trim(), out = $('#wizres'); W.url = url; W.ok = false;
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(url) && !/^http:\/\/(127\.|localhost)/.test(url)) { out.innerHTML = '<span class="ec">La URL tiene que empezar con https://script.google.com/macros/s/ y terminar en /exec</span>'; return; }
  out.textContent = 'Probando…';
  try { const r = await cloudGet({ action: 'list', cuartel: 'test' }, { url, token: W.token }); if (r && r.ok) { W.ok = true; wizShow(); return; } out.innerHTML = '<span class="ec">✖ ' + esc((r && r.error) === 'Clave incorrecta' ? 'Clave incorrecta: volvé al paso 2, copiá el código de nuevo y pegalo en Google (Implementar → Administrar implementaciones → ✎ → Nueva versión).' : (r && r.error) || 'Respuesta inválida') + '</span>'; }
  catch (e) { out.innerHTML = '<span class="ec">✖ No responde. Lo más común: en «Quién tiene acceso» no quedó <b>Cualquier persona</b>. Corregilo en Implementar → Administrar implementaciones.</span>'; }
};
ACT['wiz-use'] = async () => { closeModal(); await nubeApply(nubeCode(W.url, W.token, W.managed)); };
ACT['wiz-code'] = () => { nubeShowCode(nubeCode(W.url, W.token, W.managed), 'Código para el administrador del cuartel', 'Mandale el QR o el código al administrador. Lo abre con la cámara (o lo pega en Ajustes → «Tengo un código de conexión») y queda conectado. Cada cuartel debería tener su propia nube.'); };

/* ---------- Registro de consentimientos ---------- */
function consentRecords() {
  const c = C(); if (!c) return [];
  const out = [], dev = devName(), T = { terminos: 'terminos', privacidad: 'privacidad', salud: 'dato-salud', anexo: 'anexo-nube-beta' };
  c.users.forEach(u => Object.keys(T).forEach(k => { const a = u[k]; if (!a || !a.ts) return; out.push({ id: c.id + '|' + u.id + '|' + k + '|' + (a.v || '') + '|' + a.ts, ts: a.ts, cuartel: c.nombre, cuartelId: c.id, nombre: uFull(u), legajo: u.legajo || '', tipo: T[k], version: a.v || (k === 'salud' ? 'si' : ''), dispositivo: a.dev || '' }); }));
  try { const t = JSON.parse(localStorage.getItem('sci-terminos') || 'null'); if (t && t.ts) out.push({ id: c.id + '|dev|' + devId() + '|' + t.v + '|' + t.ts, ts: t.ts, cuartel: c.nombre, cuartelId: c.id, nombre: '(dispositivo)', tipo: 'terminos-dispositivo', version: t.v, dispositivo: dev }); } catch (e) { }
  return out;
}
let consBusy = false;
async function consentSync(force) {
  const cfg = typeof cloudCfg === 'function' && cloudCfg(); if (!cfg || consBusy || !navigator.onLine) return;
  let sent = {}; try { sent = JSON.parse(localStorage.getItem(NUBE_SENT) || '{}'); } catch (e) { }
  const recs = consentRecords().filter(r => !sent[r.id]); if (!recs.length) { if (force) toast('🗂 Consentimientos al día.', '', 2500); return; }
  consBusy = true;
  try {
    const r = await cloudPost({ token: cfg.token, action: 'consent', records: recs }, cfg);
    if (r.ok) { recs.forEach(x => sent[x.id] = now()); localStorage.setItem(NUBE_SENT, JSON.stringify(sent)); if (force) toast('🗂 ' + recs.length + ' consentimiento(s) registrados en la nube ✔', '', 3500); }
    else if (force) toast('No se pudieron enviar: ' + (r.error || 'error'), 'bad', 5000);
  } finally { consBusy = false; }
}
ACT['consent-now'] = () => consentSync(true);
setInterval(() => { if (!(typeof isTeamLink === 'function' && isTeamLink())) consentSync(); }, 30000);
// guardar el dispositivo en el que se dio cada consentimiento
setInterval(() => { const u = U(); if (!u) return; let ch = false; ['terminos', 'privacidad', 'salud', 'anexo'].forEach(k => { if (u[k] && u[k].ts && !u[k].dev) { u[k].dev = devName(); ch = true; } }); if (ch) { save(true); consentSync(); } }, 3000);

/* ---------- Nube provista por el proyecto: anexo de privacidad ---------- */
const ANEXO_TXT = '<p><b>Anexo · Nube durante la beta.</b> La nube de este cuartel funciona en una cuenta de Google administrada por el proyecto SCI Bomberos (Mauricio Ezequiel Roldán), que actúa como <b>encargado del tratamiento</b> por cuenta del cuartel: solo la usa para que la app funcione (equipos en vivo, respaldos, informes) y para guardar el registro de consentimientos. No usa los datos para otros fines ni los cede. El responsable de los datos sigue siendo el cuartel. Al terminar la beta, el cuartel puede pasar a su propia cuenta y pedir que se borren sus datos.</p>';
if (typeof avisoHTML === 'function') { const _av = avisoHTML; avisoHTML = function (c) { return isManaged() ? _av(c).replace('</div>', ANEXO_TXT + '</div>') : _av(c); }; }
if (typeof terminosHTML === 'function') { const _tm = terminosHTML; terminosHTML = function () { const h = _tm(); return isManaged() ? h.replace('<b>El desarrollador no accede ni administra esos datos.</b>', 'Durante la beta, si el cuartel usa la nube provista por el proyecto, el desarrollador la administra como <b>encargado</b>, solo para su funcionamiento y para guardar los consentimientos (ver aviso de privacidad).') : h; }; }
function checkAnexo() {
  const u = U(); if (!u || !isManaged() || S.view === 'home' || S.view === 'login' || !$('#modal').classList.contains('hidden')) return;
  if (!u.terminos || !u.privacidad) return;   // primero términos y privacidad
  if (u.anexo && u.anexo.v === ANEXO_VER) return;
  const since = (C().cloud || {}).since || 0;
  if (u.privacidad.ts && since && u.privacidad.ts >= since) { u.anexo = { v: ANEXO_VER, ts: u.privacidad.ts, dev: u.privacidad.dev || devName(), conAviso: true }; save(true); consentSync(); return; }
  modal('☁ Anexo de privacidad · nube de la beta', '<div class="help">' + ANEXO_TXT + '</div><label class="check"><input type="checkbox" name="acepto"> Leí el anexo y acepto.</label>',
    [{ label: 'No acepto (salir)', fn: () => { ACT['lock'](); } }, { label: 'Aceptar', cls: 'primary', fn: () => { if (!fdata().acepto) return merr('Marcá la casilla para aceptar.'); const x = U(); x.anexo = { v: ANEXO_VER, ts: now(), dev: devName() }; save(true); consentSync(); } }], { lock: true });
  const b = $('#modal .box'); if (b) b.classList.add('lockx');
}

/* ---------- Equipos por QR: registrar su aceptación de términos ---------- */
function teamConsent() {
  try { if (!termOk(TERM_TKEY) || localStorage.getItem('sci-team-cons-' + TP.t)) return; tEv('consent', { text: TERM_VER, dev: devName() }); localStorage.setItem('sci-team-cons-' + TP.t, '1'); } catch (e) { }
}
/* el nombre del cuartel viaja con los equipos (para la planilla) */
if (typeof cloudPost === 'function') { const _cp = cloudPost; cloudPost = function (body, cfg) { if (body && body.action === 'teams' && !body.cuartelNombre && C()) body.cuartelNombre = C().nombre; return _cp(body, cfg); }; }

/* conservar los datos de la nube provista al guardar Ajustes */
D.addEventListener('submit', e => { if (e.target.id !== 'cf') return; const k = Object.assign({}, C().cloud || {}); setTimeout(() => { const n = C().cloud; if (n && k.managed && n.url === k.url && n.token === k.token) { n.managed = true; n.since = k.since; save(true); } }, 0); }, true);
setInterval(() => { if (!(typeof isTeamLink === 'function' && isTeamLink()) && $('#modal').classList.contains('hidden')) { checkPending(); checkAnexo(); } }, 3000);
/* ---------- Enganche y estilos ---------- */
(function () { const st = D.createElement('style'); st.textContent = '.wizsteps{padding-left:22px}.wizsteps li{margin:6px 0}#nubecode{font-family:ui-monospace,Consolas,monospace}'; D.head.appendChild(st); })();
const _renderN = render;
render = function () { _renderN(); setTimeout(() => { checkPending(); checkAnexo(); }, 60); };
if (typeof isTeamLink === 'function' && isTeamLink()) setInterval(teamConsent, 4000);
else render();
