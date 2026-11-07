/* SCI Bomberos – ubicación (coordenadas, GPS, mapas), vista general y resumen para compartir */
'use strict';
function readCoords(v) { v = (v || '').trim(); if (!v) return { ok: true, text: '' }; const p = GEO.parse(v); if (!p || p.error) return { ok: false }; return { ok: true, text: p.text }; }
function coordField(val) {
  return '<div class="field"><label>Ubicación GPS — latitud y longitud</label><div class="row nowrap"><input type="text" name="coords" value="' + esc(val) + '" placeholder="-31.52080, -59.31050" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false"><button type="button" class="btn sm" data-act="geo">📍 Mi ubicación</button></div>' +
    '<div class="coordfb" aria-live="polite"></div><a class="btn sm hidden" data-maplink target="_blank" rel="noopener"></a><small class="muted">Pegá las coordenadas de Google Maps (mantené apretado un punto y copiá los números), con punto o coma. Sin signo menos también sirve: la app lo agrega para Argentina.</small></div>';
}
function addrQuery(form) { const g = n => { const i = form && form.querySelector('[name=' + n + ']'); return i ? i.value.trim() : ''; }, c = C() || {}; return [g('direccion'), g('localidad') || c.localidad, c.provincia, 'Argentina'].filter(Boolean).join(', '); }
function coordFeedback(input) {
  const wrap = input.closest('.field'); if (!wrap) return; const fb = $('.coordfb', wrap), a = $('[data-maplink]', wrap), v = input.value.trim(), form = input.closest('form'); let html = '', href = '', label = '';
  if (!v) { const dir = form && form.querySelector('[name=direccion]'); if (dir && dir.value.trim()) { href = GEO.search(addrQuery(form)); label = '🗺 Buscar la dirección en Google Maps'; } }
  else { const p = GEO.parse(v); if (!p || p.error) html = '<span class="ec">⚠ No entiendo ese formato. Ejemplo: -31.52080, -59.31050</span>'; else { html = '<span class="okc">✔ ' + p.text + '</span>' + (p.note ? ' <span class="wc">· ' + esc(p.note) + '</span>' : '') + (p.warn ? ' <span class="wc">· ⚠ ' + esc(p.warn) + '</span>' : ''); href = GEO.links(p.lat, p.lon).google; label = '🗺 Abrir en Google Maps'; } }
  if (fb) fb.innerHTML = html; if (a) { if (href) { a.href = href; a.textContent = label; a.classList.remove('hidden'); } else { a.removeAttribute('href'); a.classList.add('hidden'); } }
}
function initCoordFields() { $$('input[name=coords]').forEach(coordFeedback); }
D.addEventListener('input', e => { const n = e.target.name; if (n === 'coords') coordFeedback(e.target); else if (n === 'direccion' || n === 'localidad') { const f = e.target.closest('form'), c = f && f.querySelector('input[name=coords]'); if (c && !c.value.trim()) coordFeedback(c); } });
D.addEventListener('change', e => { if (e.target.name !== 'coords') return; const p = GEO.parse(e.target.value); if (p && !p.error) e.target.value = p.text; coordFeedback(e.target); });
function gpsOnce(ok, fail) {
  if (!window.isSecureContext) return fail('El GPS solo funciona en una dirección segura (https). En GitHub Pages sí funciona.');
  if (!navigator.geolocation) return fail('Este dispositivo no tiene GPS disponible.');
  const msg = { 1: 'No diste permiso de ubicación. Activalo para este sitio (candado junto a la dirección) y probá de nuevo.', 2: 'No se pudo determinar la ubicación (sin señal de GPS). Probá al aire libre.', 3: 'El GPS tardó demasiado. Probá de nuevo.' };
  navigator.geolocation.getCurrentPosition(ok, err => { if (err.code === 1) return fail(msg[1]); navigator.geolocation.getCurrentPosition(ok, e2 => fail(msg[e2.code] || 'No se pudo obtener la ubicación.'), { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 }); }, { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 });
}
ACT['geo'] = () => {
  const input = $('#mf input[name=coords]') || $('input[name=coords]'); if (!input) return; toast('Buscando ubicación…', '', 9000);
  gpsOnce(p => { input.value = GEO.fmt(p.coords.latitude, p.coords.longitude); coordFeedback(input); toast('Ubicación cargada ✔ (±' + Math.round(p.coords.accuracy) + ' m)', '', 4500); }, m => toast(m + ' O pegá las coordenadas.', 'bad', 7000));
};
ACT['copy'] = el => copyText(el.dataset.t);
ACT['ubicacion'] = () => {
  const op = OPx(); if (!op) return; const ed = isEditor(op), p = GEO.parse(op.coords), valid = p && !p.error, c = C();
  let h = '<p><b>' + esc(op.direccion || 'Sin dirección') + '</b>' + (op.localidad ? ' · ' + esc(op.localidad) : '') + '</p>';
  if (valid) {
    const L = GEO.links(p.lat, p.lon);
    h += '<p class="muted">Coordenadas: <b>' + p.text + '</b></p>' + (navigator.onLine ? '<iframe class="mapframe" title="Mapa" loading="lazy" referrerpolicy="no-referrer" src="' + L.embed + '"></iframe>' : '<div class="empty">Sin conexión: el mapa necesita internet. Las coordenadas quedan guardadas igual.</div>') +
      '<div class="grid g2" style="margin-top:10px"><a class="btn block" target="_blank" rel="noopener" href="' + L.google + '">🗺 Google Maps</a><a class="btn block" target="_blank" rel="noopener" href="' + L.waze + '">🚗 Waze</a><a class="btn block" target="_blank" rel="noopener" href="' + L.apple + '">🍎 Apple Mapas</a><a class="btn block" href="' + L.geo + '">📱 App de mapas</a><button type="button" class="btn block" data-act="copy" data-t="' + p.text + '">📋 Copiar coordenadas</button><a class="btn block" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent(op.direccion + ' — ' + L.google) + '">🟢 WhatsApp</a></div>';
  } else h += '<div class="empty">Esta operación todavía no tiene coordenadas.</div>' + (op.direccion ? '<a class="btn block" style="margin-top:10px" target="_blank" rel="noopener" href="' + GEO.search([op.direccion, op.localidad || c.localidad, c.provincia, 'Argentina'].filter(Boolean).join(', ')) + '">🗺 Buscar la dirección en Google Maps</a>' : '');
  if (ed) h += '<div class="sep"></div>' + coordField(op.coords);
  modal('🗺 Ubicación', h, [{ label: 'Cerrar' }, ...(ed ? [{ label: 'Guardar ubicación', cls: 'primary', fn: () => { const r = readCoords(fdata().coords); if (!r.ok) return merr('No entiendo las coordenadas. Ejemplo: -31.52080, -59.31050'); mut(o => { if ((o.coords || '') !== r.text) { o.coords = r.text; logEv(o, 'Ubicación actualizada: ' + (r.text || 'sin coordenadas'), 'info'); } }); } }] : [])]);
};

/* ---------- Vista general ---------- */
function genAlerts(op) {
  const t = now(), live = liveRes(op), out = [];
  if (op.evac && op.evac.active) out.push('<span class="pill bad">🚨 Evacuación en curso' + evacAck(op).replace(/<[^>]+>/g, '') + '</span>');
  if (op.mayday && op.mayday.active) out.push('<span class="pill bad">🆘 MAYDAY activo</span>');
  (op.equipos || []).forEach(e => {
    if (e.era && e.era.start && !e.era.end) { const left = e.era.start + e.era.min * 60000 - t; if (left <= 5 * 60000) out.push('<span class="pill bad">🫁 ' + esc(e.nombre) + ': ' + (left > 0 ? 'quedan ' + Math.ceil(left / 60000) + ' min de aire' : 'TIEMPO DE AIRE CUMPLIDO') + '</span>'); }
    if (e.last && e.tracking !== false && t - e.last.ts > 5 * 60000 && op.estado === 'activa') out.push('<span class="pill warn">📡 ' + esc(e.nombre) + ' sin posición hace ' + Math.floor((t - e.last.ts) / 60000) + ' min</span>');
  });
  op.sectores.forEach(s => { if (live.some(r => r.sectorId === s.id) && t - s.parLast >= (s.parMin || op.parMin) * 60000) out.push('<span class="pill bad">⏱ PAR vencido: ' + esc(s.nombre) + '</span>'); });
  const rot = live.filter(r => r.sectorId && r.workStart && t - r.workStart >= op.rotMin * 60000);
  if (rot.length) out.push('<span class="pill warn" title="' + esc(rot.map(r => r.nombre).join(', ')) + '">🔄 Rotación: ' + (rot.length > 2 ? rot.length + ' recursos llevan' : rot.map(r => esc(r.nombre)).join(' y ') + (rot.length > 1 ? ' llevan' : ' lleva')) + ' más de ' + op.rotMin + ' min</span>');
  const pe = op.pedidos.filter(p => !p.atendido).length; if (pe) out.push('<span class="pill warn">📦 ' + pe + ' pedido(s) pendiente(s)</span>');
  const sa = live.filter(r => !r.sectorId && r.estado === 'En escena').length; if (sa) out.push('<span class="pill info">' + sa + ' en escena sin asignar</span>');
  return out.length ? out.join(' ') : '<span class="pill ok">✅ Sin alertas</span>';
}
function oGeneral(op, ed) {
  const act = op.estado === 'activa', live = liveRes(op), v = op.victimas, wait = live.filter(r => !r.sectorId), vr = op.victimasReg || [], cl = op.clima || {};
  const hs = op.hitos, hd = hs.filter(h => h.hecho).length, pct = hs.length ? Math.round(hd / hs.length * 100) : 0, hp = hs.filter(h => !h.hecho).slice(0, 4);
  const objP = op.objetivos.filter(o => !o.hecho), pedP = op.pedidos.filter(p => !p.atendido), logs = op.log.slice().sort((a, b) => b.ts - a.ts).slice(0, 10), p = GEO.parse(op.coords), valid = p && !p.error;
  const kv = (k, val) => '<div class="kv"><span>' + k + '</span><b>' + val + '</b></div>';
  let h = guia(op, ed) + '<div class="gen-actions row"><button type="button" class="btn primary" data-act="share-sit">📤 Compartir situación</button><button type="button" class="btn" data-act="fullscreen">⛶ Pantalla completa</button><button type="button" class="btn" data-act="ubicacion">🗺 Ubicación</button>' + (typeof cloudPill === 'function' ? cloudPill(op) : '') + '</div>';
  if (act) h += '<div class="card gen-alerts"><b>⚠ Atención</b><span id="gen-alerts" class="row" style="gap:6px">' + genAlerts(op) + '</span></div>';
  h += statStrip(op, '<div class="stat"><b>' + op.equipos.length + '</b><small>Equipos</small></div><div class="stat"><b>' + hd + '/' + hs.length + '</b><small>Hitos</small></div>');
  const ord = { 'En escena': 0, 'En rehabilitación': 1, 'En camino': 2, 'Alertado': 3 }, us = live.filter(r => r.kind === 'unidad' || (r.kind === 'externo' && unitFoto(r))).sort((x, y) => (ord[x.estado] || 9) - (ord[y.estado] || 9));
  h += '<div class="gen-grid"><div class="gen-main">';
  if (op.equipos.length || valid) h += '<section class="card mb"><div class="row between"><h3>👥 Equipos en el terreno</h3><button type="button" class="btn sm" data-act="optab" data-t="equipos">Ver equipos →</button></div><div class="mapbox" data-map="gen"></div>' + eqStatusRow(op) + '</section>';
  if (us.length) h += '<h3>🚒 Unidades en el lugar (' + us.length + ')</h3><div class="ugal">' + us.map(r => { const f = unitFoto(r), s = secOf(op, r.sectorId); return '<div class="ucard e-' + ESTADO_SLUG[r.estado] + '" data-act="res-open" data-id="' + r.id + '" role="button" tabindex="0">' + (f ? '<img alt="" src="' + f + '">' : '<div class="uph2">' + resIcon(r) + '</div>') + '<div class="un"><b>' + esc(r.nombre) + '</b><small>' + esc(r.institucion || r.detalle || '') + '</small><span class="chip">' + esc(r.estado) + '</span><small>' + (s ? '📍 ' + esc(s.nombre) : 'Sin asignar') + '</small></div></div>'; }).join('') + '</div>';
  h += '<h3>🧭 Sectores y recursos</h3><div class="gen-sectors"><section class="sector wait"><div class="sh"><div><span class="tag">Staging</span><h3>Sin asignar / En espera</h3></div><span class="pill">' + wait.length + '</span></div>' + (wait.length ? wait.map(r => resCard(op, r)).join('') : '<div class="empty">Nadie en espera.</div>') + '</section>' + op.sectores.map((s, i) => sectorCol(op, s, i, ed, true)).join('') + '</div>' + (!op.sectores.length ? '<p class="muted">Todavía no hay sectores. Se crean desde el Tablero.</p>' : '') + '</div>';
  h += '<aside class="gen-side"><section class="card"><h3>🎖 Comando</h3>' + kv('Comandante', esc(uName(op.editors[0]))) + kv('Operador', op.editors[1] ? esc(uName(op.editors[1])) : '—') + kv('Estrategia', esc(op.estrategia)) + ROLES_SCI.filter(r => op.roles[r[0]]).map(r => kv(r[1], esc(op.roles[r[0]]))).join('') + '</section>';
  h += '<section class="card"><h3>🌬 Condiciones</h3>' + (cl.dir ? '<div class="windbox">' + windSvg(cl, 46) + '<div><b>Viento ' + esc(climaTxt(cl)) + '</b><small class="muted">empuja hacia el ' + esc(windTo(cl)) + '</small></div></div>' : '<p class="muted" style="margin:0">Sin dato de viento.' + (ed ? ' <button type="button" class="btn sm" data-act="quick-clima">Cargar</button>' : '') + '</p>') + ((cl.temp !== '' && cl.temp != null) || (cl.hum !== '' && cl.hum != null) ? kv('Temperatura / humedad', [cl.temp !== '' && cl.temp != null ? esc(cl.temp) + ' °C' : '', cl.hum !== '' && cl.hum != null ? 'HR ' + esc(cl.hum) + '%' : ''].filter(Boolean).join(' · ')) : '') + (cl.nota ? '<p class="muted" style="margin:6px 0 0">' + esc(cl.nota) + '</p>' : '') + '</section>';
  h += '<section class="card"><h3>✅ Hitos · ' + hd + '/' + hs.length + '</h3><div class="bar"><i style="width:' + pct + '%"></i></div>' + (hp.length ? hp.map(x => '<div class="li"><span>⬜</span><b>' + esc(x.texto) + '</b></div>').join('') : '<p class="muted">' + (hs.length ? '✔ Todos cumplidos.' : 'Sin hitos.') + '</p>') + '<button type="button" class="btn sm block" style="margin-top:8px" data-act="optab" data-t="objetivos">Ver todos</button></section>';
  if (objP.length || pedP.length) h += '<section class="card"><h3>📌 Pendientes</h3>' + objP.slice(0, 5).map(o => '<div class="li"><span>🎯</span><b>' + esc(o.texto) + '</b></div>').join('') + pedP.slice(0, 5).map(q => '<div class="li"><span>📦</span><b>' + esc(q.texto) + '</b></div>').join('') + '</section>';
  h += '<section class="card"><h3>🩺 Víctimas</h3>' + kv('Heridos', v.heridos) + kv('Fallecidos', v.fallecidos) + kv('Rescatados', v.rescatados) + kv('Evacuados', v.evacuados) + (vr.length ? '<div class="row" style="margin-top:8px">' + TRIAGE.map(t => '<span class="pill">' + t[1].split(' ')[0] + ' ' + vr.filter(x => x.triage === t[0]).length + '</span>').join('') + '</div>' : '') + '</section>';
  h += '<section class="card"><h3>📍 Ubicación</h3><p style="margin:0 0 6px"><b>' + esc(op.direccion || '—') + '</b>' + (op.localidad ? ' · ' + esc(op.localidad) : '') + '</p><p class="muted" style="margin:0 0 8px">' + (valid ? esc(p.text) : 'Sin coordenadas cargadas') + '</p><button type="button" class="btn sm block" data-act="ubicacion">🗺 Abrir ubicación y mapas</button></section>';
  const ext = op.recursos.filter(r => r.kind === 'externo'), grp = {}; ext.forEach(r => { const k = r.institucion || 'Otras instituciones'; (grp[k] = grp[k] || []).push(r); });
  if (ext.length) h += '<section class="card"><h3>🤝 Instituciones presentes</h3>' + Object.keys(grp).map(k => '<div style="margin-bottom:8px"><b>' + esc(k) + '</b>' + grp[k].map(r => '<div class="li"><span>' + (r.estado === 'Retirado' ? '⬜' : '✅') + '</span><b>' + esc(r.nombre) + (r.dotacion ? ' <small class="muted">(' + esc(r.dotacion) + ' pers.)</small>' : '') + (r.tel ? ' <a href="tel:' + esc(r.tel.replace(/[^\d+]/g, '')) + '">📞</a>' : '') + '</b></div>').join('') + '</div>').join('') + '</section>';
  if (op.croquis && op.croquis.img) h += '<section class="card"><h3>✏ Croquis</h3><img class="gimg" alt="Croquis" src="' + op.croquis.img + '"><button type="button" class="btn sm block" style="margin-top:8px" data-act="optab" data-t="croquis">Abrir croquis</button></section>';
  const ft = op.fotos.slice(-6).reverse(); if (ft.length) h += '<section class="card"><h3>📷 Fotos (' + op.fotos.length + ')</h3><div class="fgrid">' + ft.map(f => '<button type="button" class="fth" data-act="foto-ver" data-id="' + f.id + '"><img alt="" src="' + f.img + '"><small>' + hhmm(f.ts).slice(0, 5) + ' · ' + esc(f.equipo || '') + '</small></button>').join('') + '</div></section>';
  h += '<section class="card"><h3>📝 Últimos eventos</h3>' + (logs.length ? logs.map(l => '<div class="glog ' + (l.type === 'mayday' || l.type === 'evac' ? 'mayday' : l.type === 'equipo' ? 'eqlog' : '') + '"><time>' + hhmm(l.ts).slice(0, 5) + '</time><span>' + esc(l.text) + '</span></div>').join('') : '<p class="muted">Sin eventos.</p>') + '<button type="button" class="btn sm block" style="margin-top:8px" data-act="optab" data-t="bitacora">Ver bitácora completa</button></section>';
  return h + '</aside></div>';
}
ACT['foto-ver'] = el => { const op = OPx(), f = op && op.fotos.find(x => x.id === el.dataset.id); if (!f) return; modal('📷 ' + esc(f.equipo || 'Foto') + ' · ' + hhmm(f.ts).slice(0, 5), '<img class="gimg" alt="" src="' + f.img + '">' + (f.text ? '<p>' + esc(f.text) + '</p>' : '') + (f.lat ? '<p class="muted"><small>Tomada en ' + GEO.fmt(f.lat, f.lon) + '</small></p>' : ''), [{ label: 'Cerrar', cls: 'primary' }], { wide: true }); };
ACT['fullscreen'] = () => { const d = D.documentElement; try { if (D.fullscreenElement || D.webkitFullscreenElement) (D.exitFullscreen || D.webkitExitFullscreen).call(D); else (d.requestFullscreen || d.webkitRequestFullscreen).call(d); } catch (e) { toast('Este dispositivo no permite pantalla completa. Instalá la app en la pantalla de inicio.', '', 5000); } };

/* ---------- Resumen de situación (WhatsApp / texto) ---------- */
function sitText(op) {
  const c = C(), t = op.closedAt || now(), live = liveRes(op), p = GEO.parse(op.coords), L = [];
  L.push('🚨 *' + c.nombre + '* — Comando de incidentes'); L.push('Operación ' + op.num + ': ' + op.tipo + (op.estado === 'cerrada' ? ' (CERRADA)' : ''));
  L.push('📍 ' + [op.direccion, op.localidad].filter(Boolean).join(', ')); if (p && !p.error) L.push(GEO.links(p.lat, p.lon).google);
  L.push('🕐 Alarma ' + hhmm(op.alarmAt).slice(0, 5) + ' · transcurrido ' + dur(t - op.alarmAt)); L.push('🎖 Comando: ' + uName(op.editors[0]) + ' · Estrategia: ' + op.estrategia);
  if (op.clima && op.clima.dir) L.push('🌬 Viento ' + climaTxt(op.clima));
  if (op.evac && op.evac.active) L.push('🚨 *EVACUACIÓN EN CURSO*: ' + (op.evac.text || '')); if (op.mayday && op.mayday.active) L.push('🆘 *MAYDAY ACTIVO* ' + (op.mayday.detalle || ''));
  L.push('🚒 En operación: ' + live.filter(r => r.kind === 'unidad').length + ' unidades, ' + live.filter(r => r.kind === 'personal').length + ' bomberos' + (live.some(r => r.kind === 'externo') ? ', ' + live.filter(r => r.kind === 'externo').length + ' de otras instituciones' : ''));
  op.sectores.forEach(s => { const rs = live.filter(r => r.sectorId === s.id); L.push('• ' + s.nombre + (s.lider ? ' (' + s.lider + ')' : '') + ': ' + (rs.length ? rs.map(r => r.nombre).join(', ') : 'sin recursos')); });
  const w = live.filter(r => !r.sectorId); if (w.length) L.push('• En espera: ' + w.map(r => r.nombre).join(', '));
  if (op.equipos.length) L.push('👥 Equipos: ' + op.equipos.map(e => e.nombre + (e.last ? ' (pos. ' + MAP.ago(e.last.ts) + ')' : '')).join(', '));
  if (op.hitos.length) { const d = op.hitos.filter(h => h.hecho); L.push('✅ Hitos ' + d.length + '/' + op.hitos.length + (d.length ? ' · último: ' + d[d.length - 1].texto : '')); }
  const v = op.victimas; if (v.heridos || v.fallecidos || v.rescatados || v.evacuados) L.push('🩺 Heridos ' + v.heridos + ' · Fallecidos ' + v.fallecidos + ' · Rescatados ' + v.rescatados + ' · Evacuados ' + v.evacuados);
  const pe = op.pedidos.filter(q => !q.atendido); if (pe.length) L.push('📦 Pedidos: ' + pe.map(q => q.texto).join('; '));
  L.push('— Actualizado ' + hhmm(now()).slice(0, 5)); return L.join('\n');
}
ACT['share-sit'] = () => {
  const op = OPx(); if (!op) return; const txt = sitText(op);
  modal('📤 Compartir situación', '<p class="muted"><small>Foto del momento: quien la recibe no ve los cambios posteriores. Para que alguien la siga en vivo, usá «Seguir una operación en vivo» (necesita la nube).</small></p><textarea readonly rows="12" id="sittxt" class="mono">' + esc(txt) + '</textarea><a class="btn block" style="margin-top:10px" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent(txt) + '">🟢 Enviar por WhatsApp</a>',
    [{ label: 'Cerrar' }, { label: '📋 Copiar', fn: () => { copyText(txt); return false; } }, ...(navigator.share ? [{ label: '📤 Compartir…', cls: 'primary', fn: () => { navigator.share({ text: txt, title: 'Situación ' + op.num }).catch(() => { }); return false; } }] : [])]);
};
