/* SCI Bomberos – Operación en vivo por la nube del proyecto (v2.8). Se carga AL FINAL.
   - Equipos con QR: transmiten a la nube del proyecto (sin configurar nada en el cuartel).
   - Segundo operador: QR «Sumar operador». Los cambios de los dos se combinan elemento por elemento
     (gana el cambio más nuevo; la bitácora se une; lo borrado queda borrado).
   - Una sola conexión por dispositivo y solo mientras está abierta una operación.
   - Al cerrar la operación, los datos se borran de la nube al minuto (queda solo un aviso de «cerrada»). */
'use strict';
const BARR = ['sectores', 'recursos', 'equipos', 'victimasReg', 'pedidos', 'objetivos', 'hitos', 'fotos'];
const BSKIP = new Set(['id', '_follow', '_pollTs', 'cloud', 'fb', 'teamSeq', 'teamsDirty', '_uf', '_del', '_u', 'croquis', 'log', 'fbCur'].concat(BARR));
const EQ_DYN = ['track', 'last', 'evIds', 'reportes', 'unread', 'parTs', 'joinedAt', 'tracking', 'evacAck'];
const FBX = { op: null, s: null, boardH: '', briefH: '', busyB: false, busyR: false, beatTs: 0, seenB: {}, evBusy: false, devs: {} };
const BSH = {};
const fbClone = o => JSON.parse(JSON.stringify(o));
const myDev = () => (typeof devId === 'function' ? devId() : 'dev');
const fbLive = op => !!(op && op.fb && op.fb.chan && op.fb.key && fbOk());

function ensureFb(op) { if (!op.fb && fbOk()) { op.fb = { chan: fbNewChan(), key: fbNewKey() }; save(true); } return op.fb; }

/* ---------- Instantánea y combinación de cambios ---------- */
function bItem(a, it) { const x = Object.assign({}, it); delete x._u; if (a === 'equipos') EQ_DYN.forEach(k => delete x[k]); if (a === 'recursos') delete x.foto; if (a === 'fotos') delete x.img; return x; }
function bShadow(op) {
  const f = {}, a = {};
  Object.keys(op).forEach(k => { if (!BSKIP.has(k) && k.charAt(0) !== '_') f[k] = JSON.stringify(op[k]); });
  BARR.forEach(n => { const m = a[n] = {}; (op[n] || []).forEach(it => { if (it && it.id) m[it.id] = JSON.stringify(bItem(n, it)); }); });
  return { f, a };
}
function bStamp(op) {
  const cur = bShadow(op), sh = BSH[op.id], t = now(); op._uf = op._uf || {}; op._del = op._del || {};
  if (!sh) { BSH[op.id] = cur; return false; } let ch = false;
  Object.keys(cur.f).forEach(k => { if (sh.f[k] !== cur.f[k]) { op._uf[k] = t; ch = true; } });
  Object.keys(sh.f).forEach(k => { if (!(k in cur.f)) { op._uf[k] = t; ch = true; } });
  BARR.forEach(n => { const m = cur.a[n], o = sh.a[n] || {}; Object.keys(m).forEach(id => { if (o[id] !== m[id]) { const it = (op[n] || []).find(x => x.id === id); if (it) it._u = t; ch = true; } }); Object.keys(o).forEach(id => { if (!(id in m)) { op._del[id] = t; ch = true; } }); });
  BSH[op.id] = cur; return ch;
}
function bSnap(op) {
  const o = {}; Object.keys(op).forEach(k => { if (!['_follow', '_pollTs', 'cloud', 'fb', 'teamSeq', 'teamsDirty', 'croquis', 'fbCur'].includes(k)) o[k] = op[k]; });
  BARR.forEach(n => { o[n] = (op[n] || []).map(it => Object.assign(bItem(n, it), { _u: it._u || 0 })); });
  return o;
}
const fbAuto = e => e && (e.by === 'sistema' || String(e.by || '').indexOf('eq:') === 0);
const fbDupLog = (log, e) => fbAuto(e) && log.some(x => x.id !== e.id && x.by === e.by && x.text === e.text && Math.abs(x.ts - e.ts) < 180000);
function bMerge(op, r) {
  if (BSH[op.id]) bStamp(op); // primero registrar los cambios propios pendientes, para que no se pierdan
  let ch = false; op._uf = op._uf || {}; op._del = op._del || {};
  Object.keys(r._del || {}).forEach(id => { if (!op._del[id]) { op._del[id] = r._del[id]; ch = true; } });
  const keys = new Set(Object.keys(r).concat(Object.keys(r._uf || {})));
  keys.forEach(k => { if (BSKIP.has(k) || k.charAt(0) === '_') return; const rt = (r._uf || {})[k] || 0, lt = op._uf[k] || 0; if (rt > lt) { if (k in r) op[k] = fbClone(r[k]); else delete op[k]; op._uf[k] = rt; ch = true; } });
  BARR.forEach(n => {
    const L = op[n] = op[n] || [], map = new Map(L.map(x => [x.id, x]));
    (r[n] || []).forEach(it => { if (!it || !it.id || op._del[it.id]) return; const l = map.get(it.id); if (!l) { L.push(fbClone(it)); ch = true; } else if ((it._u || 0) > (l._u || 0)) { Object.assign(l, fbClone(it)); ch = true; } });
    const k = L.filter(x => !op._del[x.id]); if (k.length !== L.length) { op[n] = k; ch = true; }
  });
  const ids = new Set((op.log || []).map(x => x.id)); op.log = op.log || [];
  (r.log || []).forEach(e => { if (!e || ids.has(e.id) || fbDupLog(op.log, e)) return; op.log.push(e); ids.add(e.id); ch = true; });
  if (ch) { op.log.sort((a, b) => a.ts - b.ts); BSH[op.id] = bShadow(op); }
  return ch;
}

/* ---------- Lo que ve cada equipo ---------- */
function fbBrief(op) {
  const t = {}; (op.equipos || []).forEach(e => { t[e.id] = { kh: hash(e.key), nombre: e.nombre, color: e.color, tarea: e.tarea || '', sector: (secOf(op, e.sectorId) || {}).nombre || '', miembros: (e.miembros || []).map(id => (op.recursos.find(r => r.id === id) || {}).nombre).filter(Boolean), msgs: (e.msgs || []).slice(-20).map(m => ({ id: m.id, ts: m.ts, text: m.text, urg: m.urg })) }; });
  return { op: { num: op.num, tipo: op.tipo, clima: op.clima, evac: op.evac, closed: op.estado !== 'activa' }, teams: t };
}

/* ---------- Conexión en vivo de la operación abierta ---------- */
function fbStop() { if (FBX.s) FBX.s.close(); FBX.s = null; FBX.op = null; FBX.seenB = {}; FBX.devs = {}; }
function fbStart(op) {
  if (FBX.s && FBX.op === op.id) return; fbStop(); FBX.op = op.id; FBX.boardH = ''; FBX.briefH = '';
  FBX.s = fbStream(op.fb.chan, (tree, path) => { if (path === '/' || path.indexOf('/ev') === 0) fbOnEv(tree); if (path === '/' || path.indexOf('/board') === 0 || path.indexOf('/pres') === 0) fbOnBoard(tree); });
}
async function fbOnEv(tree) {
  if (FBX.evBusy) { FBX.evAgain = true; return; } FBX.evBusy = true;
  try {
    do {
      FBX.evAgain = false; const op = OPx(); if (!op || op.id !== FBX.op || !tree || !tree.ev) break;
      op.fbCur = op.fbCur || {}; const all = [];
      for (const tid of Object.keys(tree.ev)) {
        const e = op.equipos.find(x => x.id === tid), cur = op.fbCur[tid] || '', keys = Object.keys(tree.ev[tid] || {}).filter(k => k > cur).sort();
        for (const k of keys) {
          op.fbCur[tid] = k; if (!e) continue;
          try { const p = await fbDec(op.fb.key, tree.ev[tid][k].e); if (p.k !== e.key) continue; (p.ev || []).forEach(ev => all.push(Object.assign({}, ev, { teamId: tid }))); } catch (er) { }
        }
      }
      const cur = OPx(); if (!cur || cur.id !== op.id) break;
      if (all.length) {
        const n0 = cur.log.length, r = applyTeamEvents(cur, all), added = cur.log.splice(n0);
        added.forEach(x => { if (!fbDupLog(cur.log, x)) cur.log.push(x); }); cur.log.sort((a, b) => a.ts - b.ts);
        const fm = new Map(); cur.fotos = cur.fotos.filter(f => { const q = fm.get(f.id); if (!q) { fm.set(f.id, f); return true; } if (!q.img && f.img) q.img = f.img; return false; });
        cur._pollTs = now(); save(true);
        if (r.n) { softRender(); if (S.optab !== 'equipos') toast('📡 ' + r.n + ' novedad(es) de los equipos', '', 2500); } else refreshMaps();
      } else save(true);
    } while (FBX.evAgain);
  } finally { FBX.evBusy = false; }
}
async function fbOnBoard(tree) {
  const op = OPx(); if (!op || op.id !== FBX.op || !tree) return; const me = myDev();
  Object.keys(tree.pres || {}).forEach(d => { if (d !== me) FBX.devs[d] = Object.assign(FBX.devs[d] || {}, { ts: tree.pres[d].ts, e: tree.pres[d].e }); });
  let changed = false;
  for (const d of Object.keys(tree.board || {})) {
    const rec = tree.board[d]; if (d === me || !rec || !rec.e || FBX.seenB[d] === rec.e) continue; FBX.seenB[d] = rec.e;
    try { const snap = await fbDec(op.fb.key, rec.e), cur = OPx(); if (!cur || cur.id !== op.id) return; if (bMerge(cur, snap)) changed = true; } catch (e) { }
  }
  for (const d of Object.keys(FBX.devs)) { const x = FBX.devs[d]; if (x.e && x.e !== x.de) { x.de = x.e; try { x.who = await fbDec(op.fb.key, x.e); } catch (e) { } } }
  if (changed) { const cur = OPx(); save(true); softRender(); if (cur && cur.estado === 'cerrada' && !isEditor(cur)) toast('La operación fue cerrada por el otro operador.', '', 5000); }
}

/* ---------- Ciclo: detectar cambios propios y publicarlos ---------- */
async function fbTick() {
  try {
    const c = C(); if (!c || (typeof isTeamLink === 'function' && isTeamLink())) return;
    fbPurge(c); const op = OPx();
    if (S.view !== 'op' || !fbLive(op) || (op.estado !== 'activa' && now() - (op.closedAt || 0) > 90000)) { if (FBX.s) fbStop(); return; }
    fbStart(op); if (!navigator.onLine) return;
    const mine = !op._follow && op.editors.includes(S.userId);
    if (now() - FBX.beatTs > 30000) { FBX.beatTs = now(); fbReq('PUT', op.fb.chan + '/pres/' + myDev(), { ts: { '.sv': 'timestamp' }, e: await fbEnc(op.fb.key, { u: S.userId, n: uName(S.userId), m: mine ? 'opera' : 'mira' }) }).catch(() => { }); }
    if (!mine || (op.estado !== 'activa' && now() - (op.closedAt || 0) > 45000)) return; // cerrada: deja de publicar antes de la limpieza
    bStamp(op);
    const snap = bSnap(op), hb = hash(JSON.stringify(snap));
    if (hb !== FBX.boardH && !FBX.busyB) { FBX.busyB = true; try { await fbReq('PUT', op.fb.chan + '/board/' + myDev(), { ts: { '.sv': 'timestamp' }, e: await fbEnc(op.fb.key, snap) }); FBX.boardH = hb; } catch (e) { } finally { FBX.busyB = false; } }
    const br = fbBrief(op), hr = hash(JSON.stringify(br));
    if (hr !== FBX.briefH && !FBX.busyR) { FBX.busyR = true; try { await fbReq('PUT', op.fb.chan + '/brief', { ts: { '.sv': 'timestamp' }, e: await fbEnc(op.fb.key, br) }); FBX.briefH = hr; } catch (e) { } finally { FBX.busyR = false; } }
  } catch (e) { console.error(e); }
}
setInterval(fbTick, 1500);
function fbPurge(c) { // al minuto de cerrar: borra recorridos y copias; deja solo el aviso de «cerrada» para los equipos
  (c.ops || []).forEach(o => {
    if (!o.fb || o.fb.purged || o._follow || o.estado !== 'cerrada' || !o.editors.includes(S.userId) || now() - (o.closedAt || 0) < 60000 || !navigator.onLine) return;
    o.fb.purged = true; save(true);
    fbEnc(o.fb.key, fbBrief(o)).then(e => fbReq('PUT', o.fb.chan, { brief: { ts: { '.sv': 'timestamp' }, e }, closedAt: { '.sv': 'timestamp' } })).catch(() => { o.fb.purged = false; save(true); });
  });
}

/* ---------- Enganches con lo existente ---------- */
const _teamLinkF = teamLink;
teamLink = function (op, e) {
  if (!ensureFb(op)) return _teamLinkF(op, e);
  const l = _teamLinkF(op, e), i = l.indexOf('#eq?'), p = new URLSearchParams(l.slice(i + 4)); p.delete('u'); p.set('f', op.fb.chan); p.set('x', op.fb.key);
  return l.slice(0, i) + '#eq?' + p.toString();
};
const _teamsPushF = teamsPush;
teamsPush = function (opArg) { const op = opArg || OPx(); if (fbLive(op)) { setTimeout(fbTick, 50); return; } return _teamsPushF(opArg); };
const _pollTeamsF = pollTeams;
pollTeams = function (force) { const op = OPx(); if (fbLive(op)) return; return _pollTeamsF(force); };
const _pollFollowF = pollFollow;
pollFollow = function () { const op = OPx(); if (op && op.fb) return; return _pollFollowF(); };

/* ---------- Estado en vivo y «Sumar operador» ---------- */
function fbStatusHTML(op) {
  if (!fbOk()) return '<div class="closed-banner info">ℹ Este navegador no permite la conexión en vivo. Usá Chrome, Edge o Safari actualizados.</div>';
  const st = FBX.s && FBX.op === op.id ? FBX.s.st : null, ok = st && st.ok && navigator.onLine;
  const others = Object.values(FBX.devs).filter(d => d.who && now() - (d.ts || 0) < 90000).map(d => esc(d.who.n) + (d.who.m === 'mira' ? ' <small>(mira)</small>' : ''));
  return '<div class="fbbar"><span class="pill ' + (op.fb ? (ok ? 'ok">🟢 En vivo' : 'warn">🟠 Conectando…') : 'info">⚪ En vivo al crear el primer equipo o sumar un operador') + '</span>' +
    (others.length ? '<span class="pill info">👥 También conectado: ' + others.join(', ') + '</span>' : '') +
    (op.estado === 'activa' && !op._follow ? '<button type="button" class="btn sm" data-act="fb-share">📲 Sumar operador</button>' : '') + '</div>';
}
const _oEquiposF = oEquipos;
oEquipos = function (op, ed) { return fbStatusHTML(op) + _oEquiposF(op, ed); };
const _oGeneralF = oGeneral;
oGeneral = function (op, ed) { return (op.fb || op._follow ? fbStatusHTML(op) : '') + _oGeneralF(op, ed); };

ACT['fb-share'] = async () => {
  const op = OPx(); if (!op || !fbOk()) return; ensureFb(op); FBX.boardH = ''; await fbTick();
  const code = nb64(JSON.stringify({ c: C().id, o: op.id, n: op.num, f: op.fb.chan, x: op.fb.key })), link = location.href.split('#')[0].split('?')[0] + '#sumar=' + code;
  let svg = ''; try { svg = QR.svg(link); } catch (e) { svg = '<p class="err">No se pudo generar el QR.</p>'; }
  modal('📲 Sumar operador', '<div class="qrwrap"><div class="qrbox" style="--ec:var(--accent)">' + svg + '<b>Operación ' + esc(op.num) + '</b><small>' + esc(C().nombre) + '</small></div><div><ol class="steps sm"><li><b>En la otra tablet o celular</b><span>tiene que estar instalada la app con el cuartel cargado.</span></li><li><b>Escanea este QR con la cámara</b><span>o abre el enlace que le mandes.</span></li><li><b>Entra con su PIN</b><span>y elige <b>Operar</b> (si está habilitado para comando) o <b>Solo mirar</b>.</span></li></ol><p class="muted"><small>🔒 Este QR da acceso a toda la operación: mostralo solo a personal del cuartel. Sirve también para que el jefe de cuartel o la central sigan en vivo.</small></p></div></div>',
    [{ label: 'Cerrar' }, { label: '📋 Copiar enlace', fn: () => { copyText(link); return false; } }, { label: '🟢 WhatsApp', cls: 'primary', fn: () => { window.open('https://wa.me/?text=' + encodeURIComponent('Operación ' + op.num + ' de ' + C().nombre + ': abrí este enlace para sumarte al comando: ' + link), '_blank', 'noopener'); return false; } }], { wide: true });
};

/* ---------- Llegar con el QR «Sumar operador» ---------- */
const SUMAR_K = 'sci-sumar';
(function () { const m = location.hash.match(/^#sumar=([A-Za-z0-9_-]+)/); if (!m) return; try { const j = JSON.parse(nunb64(m[1])); if (j.f && j.x && j.o) localStorage.setItem(SUMAR_K, JSON.stringify(Object.assign(j, { at: Date.now() }))); } catch (e) { } history.replaceState(null, '', location.pathname + location.search); })();
let sumarShown = 0;
function sumarCheck() {
  let j; try { j = JSON.parse(localStorage.getItem(SUMAR_K) || 'null'); } catch (e) { } if (!j) return;
  if (Date.now() - j.at > 6 * 3600000) { localStorage.removeItem(SUMAR_K); return; }
  if (!$('#modal').classList.contains('hidden') || Date.now() - sumarShown < 15000) return;
  if (!db.cuarteles[j.c]) { sumarShown = Date.now(); return modal('📲 Sumarse a una operación', '<p>Este dispositivo no tiene cargado el cuartel de esa operación.</p><p class="muted"><small>Pedile al administrador el <b>respaldo del cuartel</b> (.json), importalo en la pantalla inicial y volvé a abrir el enlace o escanear el QR.</small></p>', [{ label: 'Descartar', fn: () => { localStorage.removeItem(SUMAR_K); } }, { label: 'Entendido', cls: 'primary' }]); }
  if (S.cuartelId !== j.c || !U()) return; // espera a que entre con su PIN en ese cuartel
  sumarShown = Date.now(); const can = canCommand(U());
  modal('📲 Sumarse a la operación ' + esc(j.n || ''), '<p>Te sumás en vivo a la operación de <b>' + esc(C().nombre) + '</b>.</p>' + (can ? '<p class="muted"><small><b>Operar:</b> podés editar el tablero junto con el comandante. <b>Solo mirar:</b> ves todo en vivo sin modificar.</small></p>' : '<p class="muted"><small>No estás habilitado para comando: vas a ver la operación en vivo, sin modificarla.</small></p>'),
    [{ label: 'Cancelar', fn: () => { localStorage.removeItem(SUMAR_K); } }, { label: '👁 Solo mirar', fn: () => sumarJoin(j, false) }].concat(can ? [{ label: '✍ Operar', cls: 'primary', fn: () => sumarJoin(j, true) }] : []), { lock: true });
}
async function sumarJoin(j, operar) {
  if (!fbOk()) return merr('Este navegador no permite la conexión en vivo.');
  merr(''); const e0 = $('#merr'); if (e0) e0.textContent = 'Conectando…';
  let snap = null;
  try {
    const b = await fbReq('GET', j.f + '/board'); const recs = Object.values(b || {}).filter(x => x && x.e).sort((a, z) => (z.ts || 0) - (a.ts || 0));
    for (const r of recs) { try { snap = await fbDec(j.x, r.e); break; } catch (e) { } }
  } catch (e) { return merr('No se pudo conectar (' + (e.message || 'sin señal') + '). Revisá la conexión y probá de nuevo.'); }
  if (!snap || snap.id !== j.o) return merr('La operación todavía no está disponible. Pedile al comandante que vuelva a abrir «📲 Sumar operador» y probá de nuevo.');
  const c = C(), i = c.ops.findIndex(o => o.id === j.o); let op;
  if (i >= 0) { op = c.ops[i]; op.fb = { chan: j.f, key: j.x }; bMerge(op, snap); }
  else { op = migrate({ cuarteles: { x: { ops: [fbClone(snap)] } } }).cuarteles.x.ops[0]; op.fb = { chan: j.f, key: j.x }; op.fbCur = {}; c.ops.push(op); }
  c.opSeq = Math.max(c.opSeq || 0, parseInt(String(op.num).split('-')[1], 10) || 0);
  BSH[op.id] = bShadow(op);
  if (operar) { delete op._follow; if (!op.editors.includes(S.userId)) op.editors.push(S.userId); if (op.estado === 'activa') logEv(op, 'Se suma como operador: ' + uName(S.userId), 'cmd'); }
  else op._follow = true;
  localStorage.removeItem(SUMAR_K); save(true); closeModal(); go({ view: 'op', opId: op.id, optab: 'general' });
  toast(operar ? '✔ Estás operando en vivo junto con el comando.' : '👁 Siguiendo en vivo (solo lectura).', '', 5000); setTimeout(fbTick, 100);
  return false;
}
setInterval(sumarCheck, 1500);

(function () { const st = D.createElement('style'); st.textContent = '.fbbar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:12px}'; D.head.appendChild(st); })();
