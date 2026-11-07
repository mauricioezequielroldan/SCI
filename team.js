/* SCI Bomberos – modo EQUIPO (se abre al escanear el QR). Sin usuario ni PIN: solo envía datos de su equipo a su operación. */
'use strict';
const isTeamLink = () => /^#eq\?/.test(location.hash);
let TP = null, TS = null, tWatch = null, tTimer = null, tBusy = false, tEvacLoop = null, tWake = null, tMap = null, tMapView = null;
const T_QUICK = [['📍', 'En posición'], ['🔥', 'Trabajando en el frente'], ['💧', 'Necesitamos agua'], ['🆘', 'Necesitamos apoyo'], ['✅', 'Fuego controlado en nuestro sector'], ['🧍', 'Víctima encontrada'], ['⚠️', 'Peligro / riesgo detectado'], ['↩️', 'Nos retiramos']];
function tParams() {
  const p = new URLSearchParams(location.hash.replace(/^#eq\?/, '')), u = p.get('u') || '';
  return { url: u.indexOf('s:') === 0 ? 'https://script.google.com/macros/s/' + u.slice(2) + '/exec' : u, c: p.get('c'), o: p.get('o'), t: p.get('t'), k: p.get('k'), n: p.get('n') || 'Equipo', q: p.get('q') || '', m: p.get('m') || '' };
}
const tKey = () => 'sci-team-' + TP.o + '-' + TP.t;
function tLoad() { try { return Object.assign({ q: [], all: [], brief: null, lastOk: 0, tracking: false, joined: false, ackEvac: 0, seen: [], err: '' }, JSON.parse(localStorage.getItem(tKey()) || '{}')); } catch (e) { return { q: [], all: [], brief: null, lastOk: 0, tracking: false, joined: false, ackEvac: 0, seen: [], err: '' }; } }
function tSave() { try { localStorage.setItem(tKey(), JSON.stringify(TS)); } catch (e) { const ph = TS.all.filter(x => x.img); if (ph.length) { ph[0].img = null; tSave(); } } }
let tFix = null;
function tEv(type, extra) {
  const ev = Object.assign({ id: uid(), ts: now(), type }, extra || {});
  if (ev.lat == null && tFix && now() - tFix.ts < 120000 && type !== 'pos') { ev.lat = tFix.lat; ev.lon = tFix.lon; ev.acc = tFix.acc; }
  TS.q.push(ev); TS.all.push(ev); if (TS.all.length > 4000) TS.all = TS.all.filter((x, i) => x.type !== 'pos' || i % 2 === 0); tSave(); tFlush(); return ev;
}
async function tFlush() {
  if (!TP.url || tBusy || !navigator.onLine) { tPaint(); return; } tBusy = true;
  try {
    const photo = TS.q.find(x => x.type === 'photo' && x.img), batch = photo ? [photo] : TS.q.filter(x => x.type !== 'photo' || !x.img).slice(0, 40);
    const r = await fetch(TP.url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, redirect: 'follow', body: JSON.stringify({ action: 'team-post', cuartelId: TP.c, opId: TP.o, teamId: TP.t, key: TP.k, events: batch }) });
    const j = await r.json();
    if (!j || !j.ok) { TS.err = (j && j.error) || 'Error'; }
    else { const ids = new Set(batch.map(x => x.id)); TS.q = TS.q.filter(x => !ids.has(x.id)); TS.lastOk = now(); TS.err = ''; if (j.brief) tBrief(j.brief); }
  } catch (e) { TS.err = navigator.onLine ? 'No responde el comando' : 'Sin señal'; }
  tBusy = false; tSave(); tPaint();
  if (TS.q.length && !TS.err) setTimeout(tFlush, 300);
}
function tBrief(b) {
  const prev = TS.brief; TS.brief = b;
  (b.msgs || []).forEach(m => { if (TS.seen.includes(m.id)) return; TS.seen.push(m.id); TS.newMsg = m.id; if (m.urg) beep(4, 990); else beep(1, 760); toast('💬 Comando: ' + m.text, m.urg ? 'bad' : '', 7000); tEv('msg-ack', { text: m.id }); });
  if (b.evac && b.evac.active && b.evac.ts > (TS.ackEvac || 0)) { if (!tEvacLoop) { beep(6, 950); tEvacLoop = setInterval(() => beep(3, 950), 6000); } }
  else if (tEvacLoop) { clearInterval(tEvacLoop); tEvacLoop = null; }
  if (b.closed && (!prev || !prev.closed)) { tTrack(false, true); toast('La operación fue cerrada por el comando. ¡Gracias!', '', 8000); }
  if (!b.valid && b.valid !== undefined) TS.err = 'QR no válido';
}
function tPos(p) {
  const f = { ts: now(), lat: p.coords.latitude, lon: p.coords.longitude, acc: Math.round(p.coords.accuracy) }, prev = tFix; tFix = f;
  const lastPos = TS.all.filter(x => x.type === 'pos').slice(-1)[0];
  if (!lastPos || GEO.dist([lastPos.lat, lastPos.lon], [f.lat, f.lon]) > 10 || f.ts - lastPos.ts > 30000) tEv('pos', { lat: f.lat, lon: f.lon, acc: f.acc }); else tPaint();
  if (!prev) tPaint(true);
}
function tTrack(on, silent) {
  if (on) {
    if (!window.isSecureContext || !navigator.geolocation) return toast('Este dispositivo no permite GPS en esta dirección (necesita https).', 'bad', 6000);
    if (tWatch == null) tWatch = navigator.geolocation.watchPosition(tPos, err => { toast(err.code === 1 ? 'Sin permiso de ubicación. Activalo en el navegador para compartir el recorrido.' : 'Sin señal de GPS. Seguimos intentando…', 'bad', 6000); if (err.code === 1) tTrack(false, true); }, { enableHighAccuracy: true, maximumAge: 10000, timeout: 30000 });
    if (!TS.tracking) { TS.tracking = true; tEv('start'); }
    try { if (navigator.wakeLock && !tWake) navigator.wakeLock.request('screen').then(w => { tWake = w; w.addEventListener('release', () => { tWake = null; }); }).catch(() => { }); } catch (e) { }
  } else {
    if (tWatch != null) { navigator.geolocation.clearWatch(tWatch); tWatch = null; }
    if (TS.tracking) { TS.tracking = false; if (!silent) tEv('stop'); else tSave(); } if (tWake) { try { tWake.release(); } catch (e) { } tWake = null; }
  }
  tPaint(true);
}
function tTrackStats() { const pts = TS.all.filter(x => x.type === 'pos'); let m = 0; for (let i = 1; i < pts.length; i++) m += GEO.dist([pts[i - 1].lat, pts[i - 1].lon], [pts[i].lat, pts[i].lon]); return { n: pts.length, m, pts }; }
function tConn() {
  if (!TP.url) return ['info', '📒 Modo registro (sin conexión con el comando)'];
  if (TS.err === 'Clave incorrecta' || TS.err === 'QR no válido' || TS.err === 'Equipo no registrado') return ['bad', '⛔ QR no válido o renovado — pedí uno nuevo al comando'];
  if (!navigator.onLine) return ['warn', '🟠 Sin señal' + (TS.q.length ? ' · ' + TS.q.length + ' pendientes (se envían solos al volver)' : '')];
  if (TS.lastOk && now() - TS.lastOk < 45000 && !TS.err) return TS.q.length > 1 ? ['warn', '🟠 Enviando ' + TS.q.length + ' datos…'] : ['ok', '🟢 Conectado con el comando'];
  return ['warn', '🟠 ' + (TS.err || 'Conectando…') + (TS.q.length ? ' · ' + TS.q.length + ' pendientes (se envían solos)' : '')];
}
function tView() {
  const b = TS.brief || {}, cn = tConn(), st = tTrackStats(), evac = b.evac && b.evac.active && b.evac.ts > (TS.ackEvac || 0), msgs = (b.msgs || []).slice().reverse(), c = b.clima || {};
  return (evac ? '<div class="evacfull" role="alertdialog"><div class="ev-ico">🚨</div><h1>EVACUAR</h1><p>' + esc(b.evac.text || 'Todo el personal a zona segura') + '</p><button type="button" class="btn giant ok" data-act="t-evac-ack">✔ Recibido, evacuando</button></div>' : '') +
    '<header class="top tteam" style="--accent:' + esc(b.color || '#1c6dd0') + '"><div class="brand"><div class="logo">👥</div><div><b>' + esc(b.nombre || TP.n) + '</b><small>' + esc(TP.q) + (TP.m ? ' · Op. ' + esc(TP.m) : '') + '</small></div></div><div class="who">' + themeBtn() + '</div></header><main class="stack narrow tmain">' +
    '<div class="tstatus ' + cn[0] + '" aria-live="polite">' + cn[1] + (TS.lastOk ? ' <small>· ' + MAP.ago(TS.lastOk) + '</small>' : '') + '</div>' +
    (b.closed ? '<div class="closed-banner">🏁 La operación fue cerrada. Podés enviar tu registro final al comando abajo.</div>' : '') +
    '<section class="card"><h3>📋 Del comando</h3>' + (b.tarea || b.sector ? '<p class="big"><b>' + esc(b.tarea || '—') + '</b>' + (b.sector ? '<br><small class="muted">Sector: ' + esc(b.sector) + '</small>' : '') + '</p>' : '<p class="muted">' + (TP.url ? 'Esperando instrucciones…' : 'Recibí la tarea por radio.') + '</p>') +
    (c.dir ? '<div class="windbox">' + windSvg(c, 40) + '<div><b>Viento ' + esc(climaTxt(c)) + '</b><small class="muted">empuja hacia el ' + esc(windTo(c)) + '</small></div></div>' : '') +
    (msgs.length ? '<div class="tmsgs">' + msgs.slice(0, 6).map(m => '<div class="tmsg' + (m.urg ? ' urg' : '') + (m.id === TS.newMsg ? ' new' : '') + '"><time>' + hhmm(m.ts).slice(0, 5) + '</time> ' + esc(m.text) + '</div>').join('') + '</div>' : '') + '</section>' +
    '<section class="card"><button type="button" class="btn giant ' + (TS.tracking ? 'ok' : 'primary') + '" data-act="t-track">' + (TS.tracking ? '📍 Compartiendo recorrido — tocá para pausar' : '📍 Compartir mi recorrido') + '</button>' +
    '<div class="strip tstats"><div class="stat"><b>' + (st.m >= 1000 ? (st.m / 1000).toFixed(2) + ' km' : Math.round(st.m) + ' m') + '</b><small>Recorrido</small></div><div class="stat"><b>' + st.n + '</b><small>Puntos</small></div><div class="stat"><b>' + (tFix ? '±' + tFix.acc + ' m' : '—') + '</b><small>Precisión GPS</small></div></div>' +
    (TS.tracking ? '<p class="muted"><small>Mantené la app abierta y la pantalla encendida: si el celular se bloquea, el GPS se pausa.</small></p>' : '') + '<div class="mapbox" id="tmap"></div></section>' +
    '<section class="card"><h3>📣 Reporte rápido</h3><div class="qgrid">' + T_QUICK.map(q => '<button type="button" class="qitem" data-act="t-quick" data-t="' + esc(q[1]) + '"><span>' + q[0] + '</span>' + esc(q[1]) + '</button>').join('') + '</div>' +
    '<button type="button" class="btn giant ok" data-act="t-par" style="margin-top:10px">✔ PAR OK — todos bien</button>' +
    '<form id="tmsgf" class="micwrap" style="margin-top:10px"><input type="text" id="tmsgt" name="t" placeholder="¿Qué ven? Escribí un reporte…" autocomplete="off">' + micBtn('#tmsgt') + '<button type="submit" class="btn primary">Enviar</button></form>' +
    '<label class="btn block filebtn big" style="margin-top:10px">📷 Mandar foto<input type="file" id="tphoto" accept="image/*" capture="environment"></label></section>' +
    '<button type="button" class="btn giant mayday" data-act="t-mayday">🆘 MAYDAY</button>' +
    '<section class="card"><h3>📦 Registro del equipo</h3><p class="muted"><small>' + TS.all.length + ' datos guardados en este celular' + (TS.q.length ? ' · ' + TS.q.length + ' sin enviar' : '') + '. ' + (TP.url ? 'Si no hay señal, se guardan y se envían solos cuando vuelve.' : 'Al terminar, mandá este archivo al comando (WhatsApp, correo) para que lo importe.') + '</small></p><button type="button" class="btn block" data-act="t-export">📤 Enviar registro al comando (archivo)</button></section>' +
    '<p class="muted center"><small>SCI Bomberos · modo equipo. Esta pantalla solo envía datos de tu equipo a esta operación.</small></p></main>';
}
function tPaint(full) {
  const app = $('#app'); if (!app || !TP) return;
  const ae = D.activeElement, typing = ae && app.contains(ae) && /INPUT|TEXTAREA/.test(ae.tagName) && ae.value;
  if (typing && !full) { const s = $('.tstatus'); if (s) { const cn = tConn(); s.className = 'tstatus ' + cn[0]; s.textContent = cn[1]; } return; }
  if (tMap) { try { tMapView = tMap.getView(); } catch (e) { } }
  app.innerHTML = tView();
  const el = $('#tmap'), st = tTrackStats();
  if (el) { tMap = MAP.create(el); if (tMapView && tMapView.user) tMap.setView(tMapView); tMap.set({ teams: [{ name: 'Mi equipo', color: (TS.brief && TS.brief.color) || '#1c6dd0', track: st.pts.map(x => [x.ts, x.lat, x.lon]), last: tFix ? { ts: tFix.ts, lat: tFix.lat, lon: tFix.lon } : null }] }); }
}
ACT['t-track'] = () => tTrack(!TS.tracking);
ACT['t-quick'] = el => { tEv('msg', { text: el.dataset.t }); toast('Enviado: ' + el.dataset.t, '', 2500); };
ACT['t-par'] = () => { tEv('par'); toast('✔ PAR enviado', '', 2500); };
ACT['t-evac-ack'] = () => { TS.ackEvac = (TS.brief && TS.brief.evac && TS.brief.evac.ts) || now(); if (tEvacLoop) { clearInterval(tEvacLoop); tEvacLoop = null; } tEv('evac-ack'); tPaint(true); toast('Confirmación enviada. Dirigite a la zona segura.', '', 6000); };
ACT['t-mayday'] = () => modal('🆘 MAYDAY', '<p>Se envía <b>de inmediato</b> al comando con tu ubicación. <b>Avisá también por radio.</b></p>' + F.area('¿Qué pasa? (opcional) — Lugar, Unidad, Nombre, Aire, Recursos', 'det', '', 2, true),
  [{ label: 'Cancelar' }, { label: '🆘 ENVIAR MAYDAY', cls: 'bad', fn: () => { tEv('mayday', { text: fdata().det || 'MAYDAY' }); beep(2, 1100); toast('🆘 MAYDAY enviado al comando', 'bad', 6000); } }]);
D.addEventListener('submit', e => { if (e.target.id !== 'tmsgf') return; e.preventDefault(); const t = e.target.t.value.trim(); if (!t) return; tEv('msg', { text: t }); e.target.t.value = ''; toast('Reporte enviado', '', 2000); tPaint(true); });
D.addEventListener('change', async e => {
  if (e.target.id !== 'tphoto' || !e.target.files[0]) return; const file = e.target.files[0]; e.target.value = '';
  let img; try { img = await fileToJpeg(file, 900, 0.7); } catch (er) { return toast('No se pudo leer la foto.', 'bad'); }
  modal('📷 Foto', '<img class="gimg" alt="" src="' + img + '">' + F.text('¿Qué se ve? (opcional)', 'texto', ''), [{ label: 'Cancelar' }, { label: 'Enviar foto', cls: 'primary', fn: () => { tEv('photo', { img, text: fdata().texto }); const ph = TS.all.filter(x => x.img); if (ph.length > 10) { ph[0].img = null; tSave(); } toast('Foto en cola de envío', '', 2500); } }]);
});
ACT['t-export'] = async () => {
  const data = JSON.stringify({ kind: 'sci-equipo', v: 1, exportedAt: now(), c: TP.c, o: TP.o, t: TP.t, k: TP.k, m: TP.m, n: TP.n, events: TS.all }), name = 'Registro_' + fsafe(TP.n) + '_Op' + fsafe(TP.m) + '.json';
  try { const f = new File([data], name, { type: 'application/json' }); if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], title: 'Registro ' + TP.n }); return; } } catch (er) { if (er && er.name === 'AbortError') return; }
  download(new TextEncoder().encode(data), name, 'application/json'); toast('Archivo descargado: mandalo al comando por WhatsApp o correo.', '', 6000);
};
function startTeam() {
  TP = tParams(); applyAccent();
  if (!TP.o || !TP.t || !TP.k) { $('#app').innerHTML = '<main class="stack narrow"><section class="card"><h2>Enlace incompleto</h2><p>Este QR no tiene todos los datos. Pedile al comando que lo muestre de nuevo.</p></section></main>'; return; }
  TS = tLoad(); if (!TS.joined) { TS.joined = true; tEv('join', { text: (navigator.userAgent.match(/Android|iPhone|iPad|Windows|Mac/) || ['dispositivo'])[0] }); }
  D.title = 'Equipo ' + TP.n + ' · SCI Bomberos'; tPaint(true); tFlush();
  tTimer = setInterval(() => { tFlush(); }, TP.url ? 10000 : 60000);
  if (TS.tracking) tTrack(true);
  window.addEventListener('online', tFlush);
  D.addEventListener('visibilitychange', () => { if (!D.hidden) { tFlush(); if (TS.tracking && !tWake && navigator.wakeLock) navigator.wakeLock.request('screen').then(w => { tWake = w; }).catch(() => { }); } });
}
