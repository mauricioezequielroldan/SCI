/* SCI Bomberos – Personal en vivo por Telegram (v2.7)
   - Cada bombero comparte su «ubicación en tiempo real» con el bot del cuartel (sigue andando con el celular bloqueado).
   - La alarma de Telegram trae botones «🚒 Voy / ❌ No puedo»: el tablero muestra quién viene y por dónde.
   - Con nube: la nube lee a Telegram y reparte a todas las tablets (sirve para 2 operadores).
     Sin nube: lo lee esta tablet directamente (solo UN dispositivo puede hacerlo).
   Se carga AL FINAL, después de alarma.js. */
'use strict';
const TV_PERSON = '#f08c00', TV_UNLINK = '#868e96', TV_RECENT = 4 * 3600000;
let TV = null, tvBusy = false, tvErr = '', tvMapI = null, tvMapV = null;

/* ---------- Datos (aparte del respaldo del cuartel: son ubicaciones personales) ---------- */
const tvKey = () => 'sci-tgv-' + S.cuartelId;
function tvLoad() {
  if (TV && TV._c === S.cuartelId) return TV; let x = null;
  try { x = JSON.parse(localStorage.getItem(tvKey()) || 'null'); } catch (e) { }
  TV = Object.assign({ seq: 0, off: 0, people: {}, resp: {}, lastOk: 0 }, x || {}); TV._c = S.cuartelId; return TV;
}
function tvSave() {
  try { localStorage.setItem(tvKey(), JSON.stringify(TV)); }
  catch (e) { Object.values(TV.people).forEach(p => { p.track = (p.track || []).slice(-150); }); try { localStorage.setItem(tvKey(), JSON.stringify(TV)); } catch (_) { } }
}
const tvOn = () => { const a = typeof ALA === 'function' && ALA(); return !!(a && a.tg && a.tg.token && a.tg.live); };
const tvVia = () => { const a = ALA(); return a.tg.via === 'nube' && cloudCfg() ? 'nube' : 'directo'; };
const tvUser = id => (C().users || []).find(u => u.tgId && String(u.tgId) === String(id));
function tvLabel(id) { const u = tvUser(id), p = tvLoad().people[id]; return u ? uName(u.id) : ((p && p.name) || 'Sin nombre') + ' (sin vincular)'; }
function tvLastAlarm() { const a = ALA(); const h = a && (a.hist || [])[0]; return h && h.aid && now() - h.ts < TV_RECENT ? h : null; }
const tvLive = p => !!(p && p.last && !p.stop && (p.live > now() || now() - p.last.ts < 10 * 60000));

/* ---------- Lectura de Telegram ---------- */
function tvName(u) { return String(((u.first_name || '') + ' ' + (u.last_name || '')).trim() || u.username || 'Sin nombre').slice(0, 60); }
function tvParse(u) { // mismo formato que tgParse_ del script de Google
  const out = [], m = u.message || u.edited_message, cq = u.callback_query;
  if (m && m.location && m.from && !m.from.is_bot) {
    const L = m.location, lp = Number(L.live_period || 0);
    out.push({ id: 'l' + u.update_id, type: 'loc', uid: String(m.from.id), name: tvName(m.from), user: m.from.username || '', ts: (m.edit_date || m.date) * 1000, lat: L.latitude, lon: L.longitude, acc: Math.round(L.horizontal_accuracy || 0), live: lp ? (lp >= 2147483647 ? 4102444800000 : (m.date + lp) * 1000) : 0, stop: !!(u.edited_message && !lp) });
  }
  if (cq && /^r\|[vn]\|/.test(cq.data || '')) { const p = cq.data.split('|'); out.push({ id: 'c' + u.update_id, type: 'resp', uid: String(cq.from.id), name: tvName(cq.from), user: cq.from.username || '', ts: now(), st: p[1] === 'v' ? 'voy' : 'no', alarm: p[2] || '', cq: cq.id }); }
  return out;
}
async function tvTg(method, body) { const a = ALA(); const r = await fetch(TGAPI + '/bot' + a.tg.token + '/' + method, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) }); return r.json(); }
function tvApply(evs) {
  const T = tvLoad(), alarms = new Set(); let n = 0;
  evs.forEach(ev => {
    const p = T.people[ev.uid] = T.people[ev.uid] || { track: [] }; p.name = ev.name || p.name; p.user = ev.user || p.user; n++;
    if (ev.type === 'loc') {
      if (!p.last || ev.ts >= p.last.ts) { p.last = { ts: ev.ts, lat: ev.lat, lon: ev.lon, acc: ev.acc }; p.live = ev.live; p.stop = ev.stop; }
      const lp = p.track[p.track.length - 1];
      if (!ev.stop && (!lp || (ev.ts > lp[0] && (ev.ts - lp[0] > 15000 || GEO.dist([lp[1], lp[2]], [ev.lat, ev.lon]) > 10)))) p.track.push([ev.ts, ev.lat, ev.lon, ev.acc || 0]);
    } else if (ev.type === 'resp') { (T.resp[ev.alarm] = T.resp[ev.alarm] || {})[ev.uid] = { st: ev.st, ts: ev.ts }; alarms.add(ev.alarm); }
  });
  const old = now() - 24 * 3600000; // no guardar recorridos personales más de 24 h
  Object.values(T.people).forEach(p => { p.track = (p.track || []).filter(q => q[0] > old).slice(-1500); });
  return { n, alarms };
}
function tvActive() {
  if (!tvOn() || !C()) return false; const op = OPx();
  return !!(tvLastAlarm() || (S.view === 'op' && op && op.estado === 'activa') || (S.view === 'cuartel' && S.tab === 'ajustes'));
}
async function tvPoll(force) {
  if (tvBusy || !tvOn() || !navigator.onLine || (!force && !tvActive()) || (typeof isTeamLink === 'function' && isTeamLink())) return;
  tvBusy = true; const cid = S.cuartelId;
  try {
    const T = tvLoad(); let evs = [];
    if (tvVia() === 'nube') {
      const j = await cloudGet({ action: 'tg-feed', cuartel: cid, since: T.seq });
      if (!j || !j.ok) throw new Error((j && j.error) || 'respuesta inválida');
      if (!('events' in j)) throw new Error('Actualizá el script de la nube a la v2.7');
      if ((j.seq || 0) < T.seq) T.seq = 0; // la nube se reinició
      evs = j.events; T.seq = evs.reduce((m, x) => Math.max(m, x.seq || 0), T.seq);
      if (T.seq < (j.seq || 0)) setTimeout(() => tvPoll(true), 500);
    } else {
      const j = await tvTg('getUpdates', Object.assign({ timeout: 0, limit: 100, allowed_updates: ['message', 'edited_message', 'callback_query'] }, T.off ? { offset: T.off } : {}));
      if (!j.ok) throw new Error(j.error_code === 409 ? 'Telegram está conectado a otro sistema (webhook). Activalo de nuevo.' : (j.description || 'error de Telegram'));
      (j.result || []).forEach(u => { T.off = u.update_id + 1; evs.push(...tvParse(u)); });
      const bot = ALA().tg.bot || '';
      evs.filter(e => e.cq).forEach(e => { tvTg('answerCallbackQuery', { callback_query_id: e.cq, show_alert: true, text: (e.st === 'voy' ? '✔ Registrado: VAS. Compartí tu ubicación en tiempo real con @' + bot + ' (📎 → Ubicación → En tiempo real).' : '✔ Registrado: no podés ir. Gracias por avisar.').slice(0, 200) }).catch(() => { }); });
    }
    if (S.cuartelId !== cid) return;
    const r = tvApply(evs); T.lastOk = now(); tvErr = ''; tvSave();
    for (const aid of r.alarms) tvTally(aid);
    if (r.n) tvRefresh();
  } catch (e) { tvErr = e.message || 'sin conexión'; const s = $('[data-tvstate]'); if (s) s.textContent = '⚠ ' + tvErr; }
  finally { tvBusy = false; }
}
setInterval(() => tvPoll(), 8000);
window.addEventListener('online', () => tvPoll());
D.addEventListener('visibilitychange', () => { if (!D.hidden) tvPoll(); });

/* ---------- Respuestas a la alarma ---------- */
function tvCounts(aid) {
  const T = tvLoad(), r = T.resp[aid] || {}, voy = [], no = [];
  Object.keys(r).sort((a, b) => r[a].ts - r[b].ts).forEach(id => (r[id].st === 'voy' ? voy : no).push(id));
  const pend = (C().users || []).filter(u => u.tgId && u.activo !== false && !r[String(u.tgId)]).map(u => String(u.tgId));
  return { voy, no, pend };
}
async function tvTally(aid) { // actualiza el mensaje de Telegram con el conteo (solo el dispositivo que disparó la alarma)
  const a = ALA(), h = (a.hist || []).find(x => x.aid === aid); if (!h || !h.tgMsg || !h.tgText) return;
  const t = tvCounts(aid), txt = h.tgText + '\n\n🚒 Vienen (' + t.voy.length + '): ' + (t.voy.map(tvLabel).join(', ') || '—') + '\n❌ No pueden: ' + t.no.length;
  if (txt === h.tgTally) return; h.tgTally = txt; save(true);
  try { await tvTg('editMessageText', { chat_id: a.tg.chat, message_id: h.tgMsg, text: txt.slice(0, 4000), reply_markup: tgKB(aid) }); } catch (e) { }
}

/* ---------- Mapa: personas junto con los equipos ---------- */
function tvPeople(since, onlyIds) {
  const T = tvLoad(), out = [];
  Object.keys(T.people).forEach(id => {
    const p = T.people[id]; if (!p.last || p.last.ts < since || !tvLive(p)) return; if (onlyIds && !onlyIds.includes(id)) return;
    const u = tvUser(id), nm = u ? (u.apellido || u.nombre) : (p.name || '?');
    out.push({ name: '👤 ' + nm, color: u ? TV_PERSON : TV_UNLINK, track: (p.track || []).filter(q => q[0] >= since), last: p.last, stale: now() - p.last.ts > 5 * 60000 });
  });
  return out;
}
const _mapDataTV = mapData;
mapData = function (op) { const d = _mapDataTV(op); if (tvOn()) d.teams = d.teams.concat(tvPeople((op.alarmAt || op.openedAt || now()) - 3600000)); return d; };

/* ---------- Pestaña Equipos: lista de personas en vivo ---------- */
function tvListHTML(op) {
  const T = tvLoad(), since = (op.alarmAt || op.openedAt || now()) - 3600000, h = tvLastAlarm(), resp = h ? (T.resp[h.aid] || {}) : {};
  const ids = Object.keys(T.people).filter(id => { const p = T.people[id]; return (p.last && p.last.ts >= since) || resp[id]; });
  ids.sort((a, b) => ((T.people[b].last || {}).ts || 0) - ((T.people[a].last || {}).ts || 0));
  const row = id => {
    const p = T.people[id], live = tvLive(p), r = resp[id], gl = p.last ? GEO.links(p.last.lat, p.last.lon).google : '';
    const st = !p.last ? '<span class="pill">Sin ubicación</span>' : live ? (now() - p.last.ts > 5 * 60000 ? '<span class="pill warn">🟠 Sin datos hace <span data-ago="' + p.last.ts + '"></span></span>' : '<span class="pill ok">🟢 En vivo · <span data-ago="' + p.last.ts + '"></span></span>') : '<span class="pill">⚪ Dejó de compartir</span>';
    return '<div class="row between tvrow"><div><b>' + esc(tvLabel(id)) + '</b>' + (r ? ' <small class="' + (r.st === 'voy' ? 'okc">🚒 Va' : 'ec">❌ No puede') + '</small>' : '') + '<br>' + st + (p.last && p.last.acc ? ' <small class="muted">±' + p.last.acc + ' m</small>' : '') + '</div>' + (gl ? '<a class="btn sm" target="_blank" rel="noopener" href="' + esc(gl) + '">📍 Ver</a>' : '') + '</div>';
  };
  return (ids.length ? ids.map(row).join('') : '<p class="muted">Todavía nadie compartió su ubicación. Pediles que en el chat con el bot toquen <b>📎 → Ubicación → Compartir en tiempo real</b>.</p>') +
    '<p class="muted"><small data-tvstate>' + (tvErr ? '⚠ ' + esc(tvErr) : T.lastOk ? 'Actualizado <span data-ago="' + T.lastOk + '"></span> · vía ' + (tvVia() === 'nube' ? 'nube (todas las tablets)' : 'este dispositivo') : 'Conectando con Telegram…') + '</small></p>';
}
const _oEquiposTV = oEquipos;
oEquipos = function (op, ed) {
  const h = _oEquiposTV(op, ed); if (!tvOn()) return h;
  return h + '<section class="card mt"><div class="row between"><h3>🛰 Personal en vivo (Telegram)</h3><button type="button" class="btn sm" data-act="tv-link">🔗 Vincular personas</button></div><div data-tvlist>' + tvListHTML(op) + '</div></section>';
};

/* ---------- Inicio: panel de respuesta a la alarma ---------- */
function tvPanelInner(h) {
  const t = tvCounts(h.aid), T = tvLoad(), p = GEO.parse(h.coords || '');
  const who = id => { const q = T.people[id], l = q && tvLive(q) && q.last.ts >= h.ts - 600000; return '<span class="chip">' + (l ? '📍 ' : '') + esc(tvLabel(id)) + (l ? ' <small class="muted"><span data-ago="' + q.last.ts + '"></span></small>' : '') + '</span>'; };
  return '<div class="row between"><h3>📣 Respuesta a la alarma' + (h.prueba ? ' <span class="pill">prueba</span>' : '') + '</h3><small class="muted">' + esc(h.tipo || '') + ' · <span data-ago="' + h.ts + '"></span></small></div>' +
    '<div class="strip"><div class="stat"><b class="okc">' + t.voy.length + '</b><small>🚒 Vienen</small></div><div class="stat"><b class="ec">' + t.no.length + '</b><small>❌ No pueden</small></div><div class="stat"><b>' + t.pend.length + '</b><small>⏳ Sin responder</small></div></div>' +
    (t.voy.length ? '<div class="row" style="gap:6px">' + t.voy.map(who).join('') + '</div>' : '<p class="muted">Esperando respuestas en Telegram…</p>') +
    (t.pend.length ? '<details><summary class="muted">Sin responder (' + t.pend.length + ')</summary><p>' + t.pend.map(id => esc(tvLabel(id))).join(', ') + '</p></details>' : '') +
    '<div class="mapbox" data-tvmap></div><p class="muted"><small data-tvstate>' + (tvErr ? '⚠ ' + esc(tvErr) : '📍 = comparte ubicación en vivo. ' + (p && !p.error ? 'El punto rojo es el lugar de la alarma.' : '')) + '</small></p>';
}
function tvMapData(h) { const p = GEO.parse(h.coords || ''); return { incident: p && !p.error ? [p.lat, p.lon] : null, teams: tvPeople(h.ts - 600000, tvCounts(h.aid).voy) }; }
const _tInicioTV = tInicio;
tInicio = function () {
  let html = _tInicioTV.apply(this, arguments); const h = tvOn() && tvLastAlarm(); if (!h) return html;
  const panel = '<section class="card" data-tvpanel>' + tvPanelInner(h) + '</section>', btn = '<button type="button" class="btn giant bad" data-act="alarma">🚨 DISPARAR ALARMA</button>';
  return html.indexOf(btn) === 0 ? btn + panel + html.slice(btn.length) : panel + html;
};
function tvMount() {
  if (tvMapI) { try { tvMapV = tvMapI.getView(); } catch (e) { } tvMapI = null; }
  const el = $('[data-tvmap]'), h = tvLastAlarm(); if (!el || !h) return;
  tvMapI = MAP.create(el); if (tvMapV && tvMapV.user) tvMapI.setView(tvMapV); tvMapI.set(tvMapData(h));
}
function tvRefresh() {
  if (S.view === 'op') { const op = OPx(), l = $('[data-tvlist]'); if (op && l && !l.contains(D.activeElement)) l.innerHTML = tvListHTML(op); if (typeof refreshMaps === 'function') refreshMaps(); return; }
  const pn = $('[data-tvpanel]'), h = tvLastAlarm();
  if (pn && h) { pn.innerHTML = tvPanelInner(h); tvMount(); } else if (!pn && h && S.view === 'cuartel' && S.tab === 'inicio' && $('#modal').classList.contains('hidden')) render();
}
const _renderTV = render;
render = function () { _renderTV(); try { tvMount(); } catch (e) { } };

/* ---------- Ajustes ---------- */
function tvSetupHTML(a) {
  const t = a.tg || {};
  if (!t.live) return '<div class="sep"></div><h4>🛰 Personal en vivo y «Voy / No puedo»</h4><p class="muted"><small>La alarma de Telegram trae botones <b>🚒 Voy</b> y <b>❌ No puedo</b>, y cada bombero comparte su <b>ubicación en tiempo real</b> con el bot. En el tablero ves quién viene y por dónde, aunque tengan el celular bloqueado. No hace falta escanear nada ni conectarse a la nube.</small></p>' +
    '<p class="muted"><small>' + (cloudCfg() ? '✔ Con la nube del cuartel: lo ven <b>todas las tablets del comando</b> a la vez.' : '⚠ Sin nube: solo <b>este dispositivo</b> puede ver las ubicaciones. Para dos operadores, conectá la nube primero.') + '</small></p><button type="button" class="btn primary" data-act="tv-on">Activar</button>';
  return '<div class="sep"></div><h4>🛰 Personal en vivo <span class="pill ok">✔ Activo</span> <span class="pill info">' + (tvVia() === 'nube' ? 'vía nube' : 'solo este dispositivo') + '</span></h4>' +
    (t.bot ? '<p class="muted"><small>Bot: <b>@' + esc(t.bot) + '</b>. Cada integrante abre <a target="_blank" rel="noopener" href="https://t.me/' + esc(t.bot) + '">t.me/' + esc(t.bot) + '</a> y toca <b>Iniciar</b> (está en el QR de adhesión).</small></p>' : '') +
    '<p class="muted"><small>Para que el bot también lea ubicaciones compartidas <b>en el grupo</b>, hacelo administrador del grupo. Compartirla en el chat privado con el bot funciona siempre y no llena el grupo.</small></p>' +
    '<div class="row"><button type="button" class="btn" data-act="tv-link">🔗 Vincular personas</button><button type="button" class="btn sm bad" data-act="tv-off">Desactivar</button></div>';
}
ACT['tv-on'] = async () => {
  const a = ALA(), t = a.tg || {}; if (!t.token || !t.chat) return toast('Primero conectá el bot y el grupo de Telegram.', 'bad');
  let bot = t.bot || ''; try { const me = await tvTg('getMe'); if (me.ok) bot = me.result.username || bot; } catch (e) { }
  if (cloudCfg()) {
    toast('Activando en la nube…', '', 3000);
    const r = await cloudPost({ token: cloudCfg().token, action: 'tg-setup', tgToken: t.token }, cloudCfg());
    if (!r.ok || !r.confirmed || !r.data || !('bot' in r.data)) return modal('No se pudo activar en la nube', '<p>' + esc(r.error && r.error !== 'Datos incompletos' ? r.error : 'El script de la nube es una versión anterior.') + '</p><p class="muted"><small>Actualizá el script a la <b>v2.7</b>: Ajustes → Nube → Asistente → paso 2 (copiar el código con la <b>misma clave</b>) y en Google <b>Implementar → Administrar implementaciones → ✎ → Nueva versión</b>. Google va a pedir un permiso nuevo para «conectarse a un servicio externo» (Telegram): aceptalo.</small></p>', [{ label: 'Entendido', cls: 'primary' }]);
    a.tg = Object.assign({}, t, { live: true, via: 'nube', bot: r.data.bot || bot });
  } else {
    if (!(await ask('Activar sin nube', 'Sin la nube, <b>solo este dispositivo</b> puede leer las ubicaciones y respuestas (Telegram las entrega una sola vez). Si después conectás la nube, volvé a activar esto.', 'Activar en este dispositivo'))) return;
    a.tg = Object.assign({}, t, { live: true, via: 'directo', bot }); try { await tvTg('deleteWebhook'); } catch (e) { }
  }
  save(true); render(); toast('✔ Activado. Volvé a imprimir o mandar el QR de adhesión: ahora incluye el bot.', '', 7000); tvPoll(true);
};
ACT['tv-off'] = async () => {
  if (!(await ask('Desactivar', 'La alarma sigue funcionando, pero sin botones «Voy / No puedo» ni ubicación en vivo.', 'Desactivar', 'bad'))) return;
  const a = ALA(); if (a.tg.via === 'nube' && cloudCfg()) cloudPost({ token: cloudCfg().token, action: 'tg-setup', tgToken: '' }, cloudCfg());
  a.tg = Object.assign({}, a.tg, { live: false }); save(true); render();
};
ACT['tv-link'] = async () => {
  await tvPoll(true); const T = tvLoad(), c = C(), ids = Object.keys(T.people);
  const opts = [['', '— sin vincular —'], ...c.users.filter(u => u.activo !== false).map(u => [u.id, uName(u.id)])];
  modal('🔗 Vincular personas de Telegram', '<p class="muted"><small>Aparecen quienes ya tocaron un botón de la alarma o compartieron su ubicación. Vinculalos con su ficha del personal para ver su nombre y jerarquía, y para saber quién no respondió.</small></p>' +
    (ids.length ? ids.map(id => { const p = T.people[id], u = tvUser(id); return '<div class="frow">' + '<div class="field"><label>Telegram</label><input type="text" readonly value="' + esc(p.name + (p.user ? ' (@' + p.user + ')' : '')) + '"></div>' + F.sel('Integrante', 'tv_' + id, opts, u ? u.id : '') + '</div>'; }).join('') : '<div class="empty">Todavía no hay nadie. Hacé una <b>alarma de prueba</b> y pediles que toquen 🚒 Voy.</div>'),
    [{ label: 'Cerrar' }, ...(ids.length ? [{ label: 'Guardar', cls: 'primary', fn: () => {
      const f = fdata(); ids.forEach(id => { c.users.forEach(u => { if (String(u.tgId) === id) delete u.tgId; }); const sel = f['tv_' + id]; if (sel) { const u = c.users.find(x => x.id === sel); if (u) u.tgId = id; } });
      save(true); render(); toast('✔ Vinculados', '', 2500);
    } }] : [])], { wide: true });
};

(function () { const st = D.createElement('style'); st.textContent = '.tvrow{padding:8px 0;border-bottom:1px solid var(--line)}.tvrow:last-of-type{border-bottom:0}[data-tvpanel] .mapbox{margin-top:10px}.card.mt{margin-top:12px}'; D.head.appendChild(st); })();
tvMount(); tvPoll();
