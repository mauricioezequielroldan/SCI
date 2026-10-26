/* SCI Bomberos – equipos de trabajo (lado del comando): QR, mapa de recorridos, reportes, mensajes, ERA y evacuación */
'use strict';
const mapInst = {}, mapViews = {};
function rndKey() { const a = new Uint8Array(8); (window.crypto || {}).getRandomValues ? crypto.getRandomValues(a) : a.forEach((_, i) => a[i] = Math.random() * 256); return Array.from(a, b => b.toString(36).padStart(2, '0')).join('').slice(0, 12); }
const eqConn = e => !e.last ? (e.joinedAt ? 'join' : 'none') : now() - e.last.ts < 2 * 60000 ? 'ok' : now() - e.last.ts < 5 * 60000 ? 'warn' : 'bad';
const CONN_TXT = { none: ['', '⚪ Sin conectar'], join: ['info', '🔵 Conectado, sin posición'], ok: ['ok', '🟢 En línea'], warn: ['warn', '🟠 Señal débil'], bad: ['bad', '🔴 Sin señal'] };
function eqBadge(op) { const n = (op.equipos || []).filter(e => e.unread).length; return n ? ' <i class="badge">' + n + '</i>' : ''; }
function eqStatusRow(op) { return op.equipos.length ? '<div class="eqrow">' + op.equipos.map(e => { const k = eqConn(e); return '<span class="eqchip" style="--ec:' + e.color + '">' + esc(e.nombre) + ' <small class="' + CONN_TXT[k][0] + 'c">' + (e.last ? '<span data-ago="' + e.last.ts + '"></span>' : CONN_TXT[k][1]) + '</small></span>'; }).join('') + '</div>' : '<p class="muted">Sin equipos. Creálos en la sección Equipos y entregales su QR.</p>'; }
function mapData(op) {
  const p = GEO.parse(op.coords), inc = p && !p.error ? [p.lat, p.lon] : null, t = now();
  return { incident: inc, teams: (op.equipos || []).map(e => ({ name: e.nombre, color: e.color, track: e.track || [], last: e.last, stale: e.last && t - e.last.ts > 5 * 60000, alert: op.mayday && op.mayday.active && op.mayday.by === 'eq:' + e.nombre })) };
}
function saveMapViews() { Object.keys(mapInst).forEach(k => { try { mapViews[k] = mapInst[k].getView(); } catch (e) { } delete mapInst[k]; }); }
function mountMaps() { const op = OPx(); if (!op) return; $$('[data-map]').forEach(el => { const k = el.dataset.map, m = MAP.create(el); if (mapViews[k] && mapViews[k].user) m.setView(mapViews[k]); m.set(mapData(op)); mapInst[k] = m; }); }
function refreshMaps() { const op = OPx(); if (op) Object.values(mapInst).forEach(m => m.set(mapData(op))); }

/* ---------- Pestaña Equipos ---------- */
function oEquipos(op, ed) {
  const cloud = typeof cloudCfg === 'function' && cloudCfg(), act = op.estado === 'activa';
  op.equipos.forEach(e => { if (e.unread) { e.unread = 0; } });
  let h = '';
  if (!cloud && act) h += '<div class="closed-banner info">ℹ <b>Modo registro (sin nube):</b> el QR abre la app del equipo, que guarda su recorrido, reportes y fotos en el celular; al terminar te los envía como archivo (📥 Importar registro). Para verlos <b>en vivo</b>, el administrador activa la nube en Ajustes.</div>';
  if (ed) h += '<div class="row mb"><button type="button" class="btn primary" data-act="eq-new">➕ Nuevo equipo</button><button type="button" class="btn" data-act="eq-msg-all">📣 Mensaje a todos</button><button type="button" class="btn bad" data-act="evac">🚨 Evacuación</button><button type="button" class="btn" data-act="eq-import">📥 Importar registro</button>' + (cloud ? '<button type="button" class="btn" data-act="eq-poll">🔄 Actualizar ahora</button><small class="muted" data-pollinfo>' + (op._pollTs ? 'Actualizado ' + hhmm(op._pollTs).slice(0, 5) : '') + '</small>' : '') + '</div><input type="file" id="eqfile" accept=".json,application/json" class="hidden">';
  h += '<section class="card mb"><div class="row between"><h3>🗺 Mapa de recorridos</h3><small class="muted">Arrastrá para mover · ⤢ ver todo · el mapa de fondo necesita internet</small></div><div class="mapbox big" data-map="eq"></div></section>';
  if (!op.equipos.length) h += '<div class="card empty">Todavía no hay equipos. Un <b>equipo</b> es un grupo que trabaja junto (ej. «Ataque 1», «Búsqueda Norte»). Creá uno, asignale integrantes y tarea, y mostrale su <b>QR</b> al jefe de equipo.</div>';
  h += '<div class="eqgrid">' + op.equipos.map(e => eqCard(op, e, ed)).join('') + '</div>';
  const reps = []; op.equipos.forEach(e => (e.reportes || []).forEach(r => reps.push([r, e])));
  op.fotos.filter(f => f.equipo && f.equipo !== 'Comando').forEach(f => reps.push([{ ts: f.ts, text: '📷 ' + (f.text || 'Foto'), foto: f.id }, op.equipos.find(e => e.nombre === f.equipo) || { nombre: f.equipo, color: '#888' }]));
  reps.sort((a, b) => b[0].ts - a[0].ts);
  h += '<section class="card"><h3>📡 Reportes desde el terreno</h3>' + (reps.length ? reps.slice(0, 30).map(([r, e]) => '<div class="feed" style="--ec:' + e.color + '"><time>' + hhmm(r.ts).slice(0, 5) + '</time><div><b>' + esc(e.nombre) + '</b> ' + esc(r.text) + (r.foto ? ' <button type="button" class="btn sm" data-act="foto-ver" data-id="' + r.foto + '">Ver</button>' : '') + '</div></div>').join('') : '<p class="muted">Todavía no llegaron reportes.</p>') + '</section>';
  return h;
}
function eqCard(op, e, ed) {
  const k = eqConn(e), s = secOf(op, e.sectorId), mem = (e.miembros || []).map(id => op.recursos.find(r => r.id === id)).filter(Boolean), len = R.trackLen(e.track), last = (e.reportes || []).slice(-1)[0];
  const era = e.era && e.era.start && !e.era.end ? e.era : null, evac = op.evac && op.evac.active;
  return '<section class="eqcard" style="--ec:' + e.color + '"><div class="sh"><div style="min-width:0"><h3>' + esc(e.nombre) + '</h3><small class="muted">' + esc([s && s.nombre, e.tarea].filter(Boolean).join(' · ') || 'Sin tarea asignada') + '</small></div><span class="pill ' + CONN_TXT[k][0] + '">' + CONN_TXT[k][1] + '</span></div>' +
    '<div class="kv"><span>📍 Última posición</span><b>' + (e.last ? '<span data-ago="' + e.last.ts + '"></span> · ±' + Math.round(e.last.acc || 0) + ' m' : '—') + '</b></div>' +
    '<div class="kv"><span>🥾 Recorrido</span><b>' + ((e.track || []).length > 1 ? (len >= 1000 ? (len / 1000).toFixed(2) + ' km' : Math.round(len) + ' m') : '—') + '</b></div>' +
    '<div class="kv"><span>✔ Último PAR</span><b>' + (e.parTs ? '<span data-ago="' + e.parTs + '"></span>' : '—') + '</b></div>' +
    (era ? '<div class="era" data-era="' + (era.start + era.min * 60000) + '"><span>🫁 ERA · ' + era.min + ' min' + (era.presion ? ' · ' + esc(era.presion) + ' bar' : '') + '</span><b data-eraval>--:--</b></div>' : '') +
    (evac ? '<div class="kv"><span>🚨 Evacuación</span><b class="' + (e.evacAck && e.evacAck >= op.evac.ts ? 'okc">✔ Confirmó' : 'ec">Sin confirmar') + '</b></div>' : '') +
    (last ? '<div class="lastrep">💬 <b>' + hhmm(last.ts).slice(0, 5) + '</b> ' + esc(last.text) + '</div>' : '') +
    (mem.length ? '<div class="row" style="gap:6px;margin-top:6px">' + mem.map(r => '<span class="chip">' + resIcon(r) + ' ' + esc(r.nombre) + '</span>').join('') + '</div>' : '') +
    '<div class="row" style="margin-top:10px"><button type="button" class="btn sm primary" data-act="eq-qr" data-id="' + e.id + '">📱 QR</button>' + (ed ? '<button type="button" class="btn sm" data-act="eq-msg" data-id="' + e.id + '">💬 Mensaje</button><button type="button" class="btn sm" data-act="eq-era" data-id="' + e.id + '">🫁 ERA</button><button type="button" class="btn sm" data-act="eq-edit" data-id="' + e.id + '">✎</button>' : '') + '</div></section>';
}

/* ---------- Crear / editar equipo ---------- */
ACT['eq-new'] = () => ACT['eq-edit']({ dataset: { id: '' } });
ACT['eq-edit'] = el => {
  const op = OPx(); if (!isEditor(op)) return; const e = el.dataset.id ? op.equipos.find(x => x.id === el.dataset.id) : null, live = liveRes(op), col = e ? e.color : EQ_COLORES[op.equipos.length % EQ_COLORES.length];
  const taken = new Set(); op.equipos.forEach(x => { if (!e || x.id !== e.id) (x.miembros || []).forEach(id => taken.add(id)); });
  modal(e ? 'Editar equipo' : '➕ Nuevo equipo', F.text('Nombre del equipo *', 'nombre', e ? e.nombre : 'Equipo ' + (op.equipos.length + 1), { attrs: ' placeholder="Ataque 1, Búsqueda Norte, Rescate…"' }) +
    '<div class="field"><label>Color en el mapa</label><div class="swatches" id="eqsw">' + EQ_COLORES.map(c => '<span class="sw' + (c === col ? ' on' : '') + '" data-col="' + c + '" style="background:' + c + '"></span>').join('') + '</div><input type="hidden" name="color" value="' + col + '"></div>' +
    F.sel('Sector', 'sector', [['', '— sin sector —'], ...op.sectores.map(s => [s.id, s.nombre])], e ? e.sectorId : '') + F.area('Tarea del equipo', 'tarea', e && e.tarea, 2, true) +
    '<h4>Integrantes</h4>' + (live.length ? '<div class="pickgrid">' + live.map(r => '<label class="pick' + (taken.has(r.id) ? ' dim' : '') + '"><input type="checkbox" name="m[]" value="' + r.id + '"' + (e && (e.miembros || []).includes(r.id) ? ' checked' : '') + '>' + resIconHTML(r) + '<span><b>' + esc(r.nombre) + '</b><small>' + (taken.has(r.id) ? 'ya está en otro equipo' : esc(r.estado)) + '</small></span></label>').join('') + '</div>' : '<p class="muted">Primero agregá recursos a la operación.</p>') +
    (e ? '<div class="sep"></div><label class="check"><input type="checkbox" name="rekey"> 🔄 Invalidar el QR anterior (si se perdió el celular)</label>' : ''),
    [{ label: 'Cancelar' }, ...(e ? [{ label: 'Eliminar', cls: 'bad', fn: async () => { if (!(await ask('Eliminar equipo', 'Se quita <b>' + esc(e.nombre) + '</b> y su recorrido de la operación. Su QR deja de funcionar.', 'Eliminar', 'bad'))) return; mut(o => { o.equipos = o.equipos.filter(x => x.id !== e.id); logEv(o, 'Equipo eliminado: ' + e.nombre, 'equipo'); }); teamsPush(); } }] : []), {
      label: e ? 'Guardar' : 'Crear y ver QR', cls: 'primary', fn: () => {
        const f = fdata(), m = checked('m[]'); if (!f.nombre) return merr('Poné un nombre al equipo.');
        if (op.equipos.some(x => x.nombre.toLowerCase() === f.nombre.toLowerCase() && (!e || x.id !== e.id))) return merr('Ya hay un equipo con ese nombre.');
        let nid = null;
        mut(o => {
          if (e) { const x = o.equipos.find(q => q.id === e.id); Object.assign(x, { nombre: f.nombre, color: f.color, sectorId: f.sector, tarea: f.tarea, miembros: m }); if (f.rekey) { x.key = rndKey(); logEv(o, 'QR del equipo ' + x.nombre + ' renovado (el anterior dejó de funcionar)', 'equipo'); } else logEv(o, 'Equipo actualizado: ' + x.nombre, 'equipo'); }
          else { nid = uid(); o.equipos.push({ id: nid, key: rndKey(), nombre: f.nombre, color: f.color, sectorId: f.sector, tarea: f.tarea, miembros: m, track: [], last: null, reportes: [], msgs: [], evIds: [], createdAt: now() }); logEv(o, 'Equipo creado: ' + f.nombre + (m.length ? ' (' + m.length + ' integrantes)' : ''), 'equipo'); }
        });
        teamsPush(); if (nid) { setTimeout(() => ACT['eq-qr']({ dataset: { id: nid } }), 30); }
      }
    }], { onOpen: mm => mm.addEventListener('click', ev => { const s = ev.target.closest('#eqsw .sw'); if (!s) return; $$('#eqsw .sw', mm).forEach(x => x.classList.remove('on')); s.classList.add('on'); $('input[name=color]', mm).value = s.dataset.col; }) });
};

/* ---------- QR del equipo ---------- */
function teamLink(op, e) {
  const c = C(), k = (typeof cloudCfg === 'function' && cloudCfg()) || null, p = new URLSearchParams();
  if (k) { const m = /^https:\/\/script\.google\.com\/macros\/s\/([^/]+)\/exec$/.exec(k.url); p.set('u', m ? 's:' + m[1] : k.url); }
  p.set('c', c.id); p.set('o', op.id); p.set('t', e.id); p.set('k', e.key); p.set('n', e.nombre.slice(0, 30)); p.set('q', c.nombre.slice(0, 40)); p.set('m', op.num);
  return location.href.split('#')[0].split('?')[0] + '#eq?' + p.toString();
}
ACT['eq-qr'] = el => {
  const op = OPx(), e = op.equipos.find(x => x.id === el.dataset.id); if (!e) return; const link = teamLink(op, e), cloud = typeof cloudCfg === 'function' && cloudCfg();
  let svg = ''; try { svg = QR.svg(link); } catch (er) { svg = '<p class="err">El enlace es demasiado largo para el QR.</p>'; }
  const local = /^(file:|http:\/\/(localhost|127\.|192\.168\.|10\.))/.test(location.href);
  modal('📱 QR · ' + esc(e.nombre), '<div class="qrwrap"><div class="qrbox" style="--ec:' + e.color + '">' + svg + '<b>' + esc(e.nombre) + '</b><small>' + esc(C().nombre) + ' · Op. ' + esc(op.num) + '</small></div><div><ol class="steps sm"><li><b>El jefe de equipo abre la cámara</b><span>y apunta al código (o recibe el enlace por WhatsApp).</span></li><li><b>Toca el enlace</b><span>Se abre la app del equipo. No necesita usuario ni PIN.</span></li><li><b>Acepta compartir la ubicación</b><span>' + (cloud ? 'El recorrido, reportes y fotos llegan acá en vivo.' : 'Modo registro: al final envía su archivo.') + '</span></li></ol>' +
    (local ? '<p class="wc"><small>⚠ Estás usando la app desde una dirección local: el QR solo funciona en el mismo equipo o red. Publicala en GitHub Pages para usarla en el terreno.</small></p>' : '') +
    '<p class="muted"><small>🔒 Este QR solo permite a ese equipo enviar datos a esta operación; no da acceso al tablero. Si se pierde el celular, renová el QR desde ✎.</small></p></div></div>',
    [{ label: 'Cerrar' }, { label: '📋 Copiar enlace', fn: () => { copyText(link); return false; } }, { label: '🟢 WhatsApp', fn: () => { window.open('https://wa.me/?text=' + encodeURIComponent('Equipo ' + e.nombre + ' — abrí este enlace para conectarte con el comando: ' + link), '_blank', 'noopener'); return false; } }, { label: '🖨 Imprimir', cls: 'primary', fn: () => { printQR(svg, e, op); return false; } }], { wide: true });
};
function printQR(svg, e, op) {
  let pa = $('#printarea'); if (!pa) { pa = D.createElement('div'); pa.id = 'printarea'; D.body.appendChild(pa); }
  pa.innerHTML = '<div class="pqr"><h1>' + esc(e.nombre) + '</h1><p>' + esc(C().nombre) + ' — Operación ' + esc(op.num) + ' · ' + esc(op.tipo) + '</p>' + svg + '<p><b>Escaneá con la cámara del celular para conectarte con el comando.</b></p><p>Tarea: ' + esc(e.tarea || '—') + '</p></div>';
  D.body.classList.add('printing'); setTimeout(() => { window.print(); setTimeout(() => D.body.classList.remove('printing'), 500); }, 50);
}

/* ---------- Mensajes, ERA ---------- */
function sendMsg(ids, text, urg) {
  mut(o => ids.forEach(id => { const e = o.equipos.find(x => x.id === id); if (!e) return; (e.msgs = e.msgs || []).push({ id: uid(), ts: now(), text, urg: !!urg }); if (e.msgs.length > 30) e.msgs = e.msgs.slice(-30); logEv(o, 'Mensaje ' + (urg ? 'URGENTE ' : '') + 'a ' + e.nombre + ': ' + text, 'equipo'); }));
  teamsPush(); toast(cloudCfg() ? 'Mensaje enviado ✔ (llega en segundos)' : 'Registrado. Sin nube: comunicalo también por radio.', '', 4500);
}
const MSG_RAPIDOS = ['Retírense a zona segura', 'Informen situación', 'Hagan PAR', 'Cambio de tarea: esperen instrucciones', 'Llega relevo', 'Abran línea de agua', 'Atención: cambio de viento'];
function msgForm() { return '<div class="qbtns">' + MSG_RAPIDOS.map(m => '<button type="button" class="btn sm" data-act="msg-fill" data-t="' + esc(m) + '">' + esc(m) + '</button>').join('') + '</div>' + F.area('Mensaje', 'texto', '', 2, true) + F.chk('🔴 Urgente (suena y vibra en el celular del equipo)', 'urg', false); }
ACT['msg-fill'] = el => { const t = $('#mf [name=texto]'); if (t) t.value = el.dataset.t; };
ACT['eq-msg'] = el => { const op = OPx(), e = op.equipos.find(x => x.id === el.dataset.id); if (!e) return; modal('💬 Mensaje a ' + esc(e.nombre), msgForm() + ((e.msgs || []).length ? '<h4>Enviados</h4>' + e.msgs.slice(-5).reverse().map(m => '<div class="li"><span>' + hhmm(m.ts).slice(0, 5) + '</span><b>' + esc(m.text) + (m.ack ? ' ✔ leído' : '') + '</b></div>').join('') : ''), [{ label: 'Cancelar' }, { label: 'Enviar', cls: 'primary', fn: () => { const f = fdata(); if (!f.texto) return merr('Escribí el mensaje.'); sendMsg([e.id], f.texto, f.urg); } }]); };
ACT['eq-msg-all'] = () => { const op = OPx(); if (!isEditor(op)) return; if (!op.equipos.length) return toast('Todavía no hay equipos.', 'bad'); modal('📣 Mensaje a todos los equipos', msgForm(), [{ label: 'Cancelar' }, { label: 'Enviar a todos', cls: 'primary', fn: () => { const f = fdata(); if (!f.texto) return merr('Escribí el mensaje.'); sendMsg(op.equipos.map(e => e.id), f.texto, f.urg); } }]); };
ACT['eq-era'] = el => {
  const op = OPx(), e = op.equipos.find(x => x.id === el.dataset.id); if (!e) return; const run = e.era && e.era.start && !e.era.end;
  if (run) {
    const left = e.era.start + e.era.min * 60000 - now();
    return modal('🫁 ERA · ' + esc(e.nombre), '<p>Ingresó a las <b>' + hhmm(e.era.start).slice(0, 5) + '</b> con ' + e.era.min + ' min de autonomía' + (e.era.presion ? ' (' + esc(e.era.presion) + ' bar)' : '') + '.</p><p class="big">' + (left > 0 ? 'Quedan <b>' + Math.ceil(left / 60000) + ' min</b>' : '<b class="ec">Tiempo cumplido</b>') + '</p>',
      [{ label: 'Cerrar' }, { label: '+5 min', fn: () => { mut(o => { const x = o.equipos.find(q => q.id === e.id); x.era.min += 5; x.era.w5 = false; x.era.w0 = false; logEv(o, 'ERA ' + x.nombre + ': se extiende 5 min', 'equipo'); }); } }, { label: '✔ Salieron', cls: 'ok', fn: () => { mut(o => { const x = o.equipos.find(q => q.id === e.id); x.era.end = now(); logEv(o, 'ERA ' + x.nombre + ': salieron de la zona (' + dur(x.era.end - x.era.start) + ')', 'equipo'); }); } }]);
  }
  modal('🫁 Control de ingreso con ERA · ' + esc(e.nombre), '<p class="muted"><small>Registrá cuando el equipo entra con equipo de respiración autónoma. Te avisa 5 minutos antes y al cumplirse el tiempo.</small></p><div class="frow">' + F.text('Autonomía estimada (min)', 'min', 30, { type: 'number', attrs: ' min="5" max="90" inputmode="numeric"' }) + F.text('Presión al ingresar (bar)', 'presion', '', { type: 'number', attrs: ' min="0" max="350" inputmode="numeric" placeholder="300"' }) + '</div>',
    [{ label: 'Cancelar' }, { label: '🫁 Ingresaron', cls: 'primary', fn: () => { const f = fdata(), mn = Math.max(5, Math.min(90, +f.min || 30)); mut(o => { const x = o.equipos.find(q => q.id === e.id); x.era = { start: now(), min: mn, presion: f.presion, w5: false, w0: false }; logEv(o, 'ERA ' + x.nombre + ': ingresan con ' + mn + ' min de autonomía' + (f.presion ? ' (' + f.presion + ' bar)' : ''), 'equipo'); }); } }]);
};

/* ---------- Importar registro de un equipo (modo sin nube) ---------- */
ACT['eq-import'] = () => $('#eqfile').click();
D.addEventListener('change', async ev => {
  if (ev.target.id !== 'eqfile' || !ev.target.files[0]) return; const file = ev.target.files[0]; ev.target.value = '';
  let j; try { j = JSON.parse(await file.text()); } catch (e) { return toast('No se pudo leer el archivo.', 'bad'); }
  const op = OPx(); if (!j || j.kind !== 'sci-equipo' || !Array.isArray(j.events)) return toast('Ese archivo no es un registro de equipo de SCI Bomberos.', 'bad', 5000);
  if (j.o !== op.id) return toast('Ese registro es de otra operación (' + (j.m || '?') + ').', 'bad', 5000);
  const e = op.equipos.find(x => x.id === j.t); if (!e) return toast('El equipo de ese registro ya no existe en esta operación.', 'bad', 5000);
  if (j.k !== e.key) return toast('El registro tiene un QR viejo (fue renovado). No se importa.', 'bad', 5000);
  let n = 0; mut(o => { n = applyTeamEvents(o, j.events.map(x => Object.assign({ teamId: e.id }, x))).n; logEv(o, 'Registro del equipo ' + e.nombre + ' importado (' + n + ' datos)', 'equipo'); });
  toast('Registro importado ✔ (' + n + ' datos nuevos)', '', 4500);
});

/* ---------- Aplicar eventos que llegan de los equipos ---------- */
function addPos(e, ev) {
  if (ev.lat == null || ev.lon == null || isNaN(ev.lat)) return;
  if (!e.last || ev.ts >= e.last.ts) e.last = { ts: ev.ts, lat: ev.lat, lon: ev.lon, acc: ev.acc };
  const tr = e.track = e.track || [], lp = tr[tr.length - 1];
  if (!lp || ev.ts < lp[0]) { tr.push([ev.ts, ev.lat, ev.lon, Math.round(ev.acc || 0)]); tr.sort((a, b) => a[0] - b[0]); }
  else if (GEO.dist([lp[1], lp[2]], [ev.lat, ev.lon]) > 8 || ev.ts - lp[0] > 60000) tr.push([ev.ts, ev.lat, ev.lon, Math.round(ev.acc || 0)]);
  if (tr.length > 3000) e.track = tr.filter((_, i) => i % 2 === 0 || i > tr.length - 500);
}
function applyTeamEvents(op, evs) {
  let n = 0, alarm = false, photos = [];
  evs.slice().sort((a, b) => (a.seq || 0) - (b.seq || 0) || a.ts - b.ts).forEach(ev => {
    const e = op.equipos.find(x => x.id === ev.teamId); if (!e) return; e.evIds = e.evIds || []; if (e.evIds.includes(ev.id)) return;
    e.evIds.push(ev.id); if (e.evIds.length > 900) e.evIds = e.evIds.slice(-600); n++;
    const by = 'eq:' + e.nombre, where = ev.lat != null ? ' (' + GEO.fmt(ev.lat, ev.lon) + ')' : '';
    addPos(e, ev);
    if (ev.type === 'join') { e.joinedAt = ev.ts; logEv(op, e.nombre + ' se conectó al comando' + (ev.text ? ' · ' + ev.text : ''), 'equipo', by); }
    else if (ev.type === 'msg') { (e.reportes = e.reportes || []).push({ ts: ev.ts, text: ev.text }); e.unread = (e.unread || 0) + 1; op.log.push({ id: uid(), ts: ev.ts, by, text: '[' + e.nombre + '] ' + ev.text + where, type: 'equipo' }); }
    else if (ev.type === 'par') { e.parTs = ev.ts; (e.reportes = e.reportes || []).push({ ts: ev.ts, text: 'PAR OK — todos bien' + (ev.text ? ' (' + ev.text + ')' : '') }); op.log.push({ id: uid(), ts: ev.ts, by, text: 'PAR del equipo ' + e.nombre + ': todos bien' + (ev.text ? ' (' + ev.text + ')' : ''), type: 'par' }); }
    else if (ev.type === 'mayday') { if (op.estado === 'activa') { op.mayday = { active: true, ts: ev.ts, by, detalle: e.nombre + ': ' + (ev.text || 'MAYDAY') + where }; alarm = true; } op.log.push({ id: uid(), ts: ev.ts, by, text: 'MAYDAY desde el equipo ' + e.nombre + ': ' + (ev.text || '') + where, type: 'mayday' }); }
    else if (ev.type === 'evac-ack') { e.evacAck = ev.ts; op.log.push({ id: uid(), ts: ev.ts, by, text: e.nombre + ' confirmó la orden de evacuación', type: 'evac' }); }
    else if (ev.type === 'msg-ack') { (e.msgs || []).forEach(m => { if (m.id === ev.text) m.ack = ev.ts; }); }
    else if (ev.type === 'stop') { e.tracking = false; op.log.push({ id: uid(), ts: ev.ts, by, text: e.nombre + ' dejó de compartir su ubicación', type: 'equipo' }); }
    else if (ev.type === 'start') { e.tracking = true; }
    else if (ev.type === 'photo') { if (ev.img) op.fotos.push({ id: ev.id, ts: ev.ts, equipo: e.nombre, text: ev.text || '', img: ev.img, lat: ev.lat, lon: ev.lon }); else if (ev.photoId) photos.push({ ev, e }); e.unread = (e.unread || 0) + 1; op.log.push({ id: uid(), ts: ev.ts, by, text: 'Foto del equipo ' + e.nombre + (ev.text ? ': ' + ev.text : '') + where, type: 'equipo' }); }
  });
  if (alarm) beep(5, 1100);
  return { n, photos, alarm };
}

/* ---------- Sincronización con la nube (relay en Apps Script) ---------- */
let pushT = null;
function teamsPush(opArg) {
  const cfg = typeof cloudCfg === 'function' && cloudCfg(); if (!cfg) return; const opId = (opArg || OPx() || {}).id; if (!opId) return;
  clearTimeout(pushT); pushT = setTimeout(async () => {
    const c = C(), op = c && c.ops.find(o => o.id === opId); if (!op || op._follow) return;
    const body = { token: cfg.token, action: 'teams', cuartelId: c.id, opId: op.id, op: { num: op.num, tipo: op.tipo, direccion: op.direccion, coords: op.coords, clima: op.clima, evac: op.evac, closed: op.estado !== 'activa' },
      teams: op.equipos.map(e => ({ id: e.id, key: e.key, nombre: e.nombre, color: e.color, tarea: e.tarea || '', sector: (secOf(op, e.sectorId) || {}).nombre || '', miembros: (e.miembros || []).map(id => (op.recursos.find(r => r.id === id) || {}).nombre).filter(Boolean), msgs: (e.msgs || []).slice(-20).map(m => ({ id: m.id, ts: m.ts, text: m.text, urg: m.urg })) })) };
    const r = await cloudPost(body, cfg); op.teamsDirty = !r.ok; save(true);
  }, opArg ? 0 : 500);
}
let polling = false;
async function pollTeams(force) {
  const op = OPx(), cfg = typeof cloudCfg === 'function' && cloudCfg();
  if (polling || !op || !cfg || !isEditor(op) || !op.equipos.length || (!force && !navigator.onLine)) return;
  polling = true;
  try {
    if (op.teamsDirty) teamsPush(op);
    const j = await cloudGet({ action: 'feed', cuartel: C().id, op: op.id, since: op.teamSeq || 0 });
    if (!j || !j.ok) throw new Error((j && j.error) || 'respuesta inválida');
    const cur = OPx(); if (!cur || cur.id !== op.id) return;
    cur._pollTs = now();
    if (j.events && j.events.length) {
      const r = applyTeamEvents(cur, j.events); cur.teamSeq = Math.max(cur.teamSeq || 0, j.seq || 0);
      for (const p of r.photos) { try { const ph = await cloudGet({ action: 'photo', cuartel: C().id, op: op.id, id: p.ev.photoId }); if (ph && ph.ok && ph.data) cur.fotos.push({ id: p.ev.id, ts: p.ev.ts, equipo: p.e.nombre, text: p.ev.text || '', img: ph.data, lat: p.ev.lat, lon: p.ev.lon }); } catch (e) { } }
      save(); if (r.n) { softRender(); if (S.optab !== 'equipos' && r.n) toast('📡 ' + r.n + ' novedad(es) de los equipos', '', 2500); }
    } else { save(true); const pi = $('[data-pollinfo]'); if (pi) pi.textContent = 'Actualizado ' + hhmm(cur._pollTs).slice(0, 5); refreshMaps(); }
  } catch (e) { const pi = $('[data-pollinfo]'); if (pi) pi.textContent = '⚠ Sin conexión con la nube'; }
  finally { polling = false; }
}
ACT['eq-poll'] = () => { toast('Buscando novedades…', '', 1500); pollTeams(true); };
