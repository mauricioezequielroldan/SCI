/* SCI Bomberos – datos de la operación, víctimas (SCI-207), condiciones del tiempo, teléfonos y croquis */
'use strict';
ACT['contactos'] = () => {
  const op = OPx(), c = C(), items = (c.contactos || []).slice();
  if (op && op.telSolicitante) items.push({ nombre: 'Solicitante' + (op.solicitante ? ' (' + op.solicitante + ')' : ''), tel: op.telSolicitante });
  if (op) op.recursos.filter(r => r.tel).forEach(r => items.push({ nombre: r.nombre + (r.institucion ? ' · ' + r.institucion : ''), tel: r.tel }));
  modal('📞 Teléfonos útiles', items.length ? '<div class="stack">' + items.map(x => '<a class="btn block" href="tel:' + esc(x.tel.replace(/[^\d+]/g, '')) + '">📞 ' + esc(x.nombre) + ' · <b>' + esc(x.tel) + '</b></a>').join('') + '</div><p class="muted"><small>El administrador edita esta lista en Ajustes. Verificá los números de tu zona.</small></p>' : '<div class="empty">No hay teléfonos cargados.</div>', [{ label: 'Cerrar', cls: 'primary' }]);
};

/* ---------- Datos, víctimas y condiciones ---------- */
function oDatos(op, ed) {
  const v = op.victimas, dis = ed ? '' : ' disabled', L = op.victimasReg;
  const ctr = (k, l) => '<div class="card flat counter"><b class="cl">' + l + '</b><div class="counter">' + (ed ? '<button type="button" class="icon" data-act="vic" data-k="' + k + '" data-d="-1" aria-label="Restar">−</button>' : '') + '<b>' + v[k] + '</b>' + (ed ? '<button type="button" class="icon" data-act="vic" data-k="' + k + '" data-d="1" aria-label="Sumar">+</button>' : '') + '</div></div>';
  return oClima(op, ed) + '<section class="card mb"><h3>🩺 Víctimas (conteo rápido)</h3><div class="grid g2">' + ctr('heridos', 'Heridos') + ctr('fallecidos', 'Fallecidos') + ctr('rescatados', 'Rescatados') + ctr('evacuados', 'Evacuados') + '</div></section>' +
    '<section class="card mb"><div class="row between"><h3>Registro de víctimas (SCI-207)</h3>' + (ed ? '<button type="button" class="btn primary sm" data-act="vict-new">➕ Registrar víctima</button>' : '') + '</div><div class="row" style="margin:6px 0">' + TRIAGE.map(t => '<span class="pill">' + t[1].split(' ')[0] + ' ' + L.filter(x => x.triage === t[0]).length + '</span>').join('') + '</div>' +
    (L.length ? '<div class="tscroll"><table class="t"><thead><tr><th>Hora</th><th>Víctima</th><th>Triage</th><th>Destino</th></tr></thead><tbody>' + L.map(x => '<tr data-act="vict-edit" data-id="' + x.id + '" style="cursor:pointer"><td>' + hhmm(x.ts).slice(0, 5) + '</td><td><b>' + esc(x.nombre || 'Sin identificar') + '</b><br><small class="muted">' + esc([x.edad ? x.edad + ' años' : '', x.sexo, x.lesion].filter(Boolean).join(' · ')) + '</small></td><td><span class="chip">' + esc((TRIAGE.find(t => t[0] === x.triage) || [, '—'])[1]) + '</span></td><td>' + esc(x.destino || '—') + '</td></tr>').join('') + '</tbody></table></div>' : '<div class="empty">Sin víctimas registradas.</div>') +
    '<p class="muted"><small>🔒 Datos sensibles: quedan en este dispositivo y en el PDF. Lo que se envía a la nube puede ir sin nombres (Ajustes).</small></p></section>' +
    '<section class="card"><h3>Datos de la intervención</h3><form id="df" autocomplete="off"><fieldset' + dis + '>' + F.sel('Tipo de siniestro', 'tipo', TIPOS_SINIESTRO, op.tipo) + F.text('Referencia', 'nombre', op.nombre) + F.text('Dirección / lugar', 'direccion', op.direccion) +
    '<div class="frow">' + F.text('Localidad', 'localidad', op.localidad) + F.text('Solicitante', 'solicitante', op.solicitante) + F.text('Tel. solicitante', 'telSolicitante', op.telSolicitante, { type: 'tel' }) + '</div>' + coordField(op.coords) +
    F.area('Descripción', 'descripcion', op.descripcion, 3) + '<div class="frow">' + F.text('Intervalo de PAR (min)', 'parMin', op.parMin, { type: 'number', attrs: ' min="1" max="60"' }) + F.text('Alerta de rotación (min)', 'rotMin', op.rotMin, { type: 'number', attrs: ' min="1" max="120"' }) + '</div></fieldset>' + (ed ? '<button class="btn primary" type="submit">Guardar datos</button>' : '') + '</form></section>';
}
ACT['vic'] = el => mut(op => { const k = el.dataset.k; op.victimas[k] = Math.max(0, op.victimas[k] + (+el.dataset.d)); logEv(op, 'Víctimas — ' + k + ': ' + op.victimas[k], 'vic'); });
D.addEventListener('submit', e => {
  if (e.target.id !== 'df') return; e.preventDefault(); const f = {}; new FormData(e.target).forEach((v, k) => f[k] = String(v).trim());
  if (!f.direccion) return toast('La dirección no puede quedar vacía.', 'bad');
  const cc = readCoords(f.coords); if (!cc.ok) return toast('No entiendo las coordenadas. Ejemplo: -31.52080, -59.31050', 'bad', 5000);
  mut(op => { Object.assign(op, { tipo: f.tipo, nombre: f.nombre || op.nombre, direccion: f.direccion, localidad: f.localidad, coords: cc.text, solicitante: f.solicitante, telSolicitante: f.telSolicitante, descripcion: f.descripcion, parMin: Math.max(1, +f.parMin || op.parMin), rotMin: Math.max(1, +f.rotMin || op.rotMin) }); logEv(op, 'Datos de la intervención actualizados', 'info'); }); toast('Datos guardados ✔');
});
ACT['vict-new'] = () => ACT['vict-edit']({ dataset: { id: '' } });
ACT['vict-edit'] = el => {
  const op = OPx(); if (!isEditor(op)) return; const id = el.dataset.id, x = id ? op.victimasReg.find(v => v.id === id) : null;
  modal(x ? 'Editar víctima' : 'Registrar víctima', '<div class="field"><label>Triage</label><div class="row">' + TRIAGE.map(t => '<label class="btn rad sm tri-' + t[0] + '"><input type="radio" name="triage" value="' + t[0] + '"' + ((x ? x.triage : 'verde') === t[0] ? ' checked' : '') + '> ' + t[1] + '</label>').join('') + '</div></div>' +
    F.text('Nombre y apellido (si se conoce)', 'nombre', x && x.nombre) + '<div class="frow">' + F.text('Edad', 'edad', x && x.edad, { type: 'number', attrs: ' min="0" max="120" inputmode="numeric"' }) + F.sel('Sexo', 'sexo', ['', 'F', 'M', 'X'], x && x.sexo) + '</div>' + F.area('Lesiones / observaciones', 'lesion', x && x.lesion, 2, true) +
    '<div class="frow"><div class="field"><label>Destino (hospital, domicilio…)</label><input type="text" name="destino" list="dl-hosp" value="' + esc(x && x.destino) + '"></div>' + F.list('dl-hosp', C().hospitales || []) + F.text('Traslado a cargo de', 'transporte', x && x.transporte, { attrs: ' placeholder="Ambulancia, unidad, particular…"' }) + '</div>',
    [{ label: 'Cancelar' }, ...(x ? [{ label: 'Eliminar', cls: 'bad', fn: () => { mut(o => { o.victimasReg = o.victimasReg.filter(v => v.id !== x.id); logEv(o, 'Víctima eliminada del registro', 'vic'); }); } }] : []), {
      label: 'Guardar', cls: 'primary', fn: () => {
        const f = fdata(), tri = f.triage || 'verde', t = TRIAGE.find(q => q[0] === tri)[1], d = { nombre: f.nombre, edad: f.edad, sexo: f.sexo, triage: tri, lesion: f.lesion, destino: f.destino, transporte: f.transporte };
        mut(o => { if (x) { Object.assign(o.victimasReg.find(v => v.id === x.id), d); logEv(o, 'Víctima actualizada (' + t + ')', 'vic'); } else { o.victimasReg.push(Object.assign({ id: uid(), ts: now() }, d)); logEv(o, 'Víctima registrada: ' + t, 'vic'); } });
      }
    }], { focus: false });
};
function windOptions(sel) { return '<option value="">— sin dato —</option>' + Object.keys(VIENTO).map(k => '<option value="' + k + '"' + (sel === k ? ' selected' : '') + '>' + k + ' · ' + VIENTO_NOM[k] + '</option>').join(''); }
function climaFields(c) { return '<div class="frow"><div class="field"><label>Viento — de dónde viene</label><select name="dir">' + windOptions(c.dir) + '</select></div>' + F.text('Velocidad (km/h)', 'kmh', c.kmh, { type: 'number', attrs: ' min="0" max="250" inputmode="numeric"' }) + F.text('Temperatura (°C)', 'temp', c.temp, { type: 'number', attrs: ' inputmode="decimal"' }) + F.text('Humedad (%)', 'hum', c.hum, { type: 'number', attrs: ' min="0" max="100" inputmode="numeric"' }) + '</div>' + F.text('Observación (rachas, cambio de viento…)', 'nota', c.nota); }
function oClima(op, ed) {
  const c = op.clima || {};
  return '<section class="card mb"><div class="row between"><h3>🌬 Condiciones del tiempo</h3>' + (c.dir ? '<span class="windbox">' + windSvg(c, 34) + '<b>' + esc(climaTxt(c)) + '</b></span>' : '') + '</div><p class="muted"><small>El viento se marca desde dónde <b>viene</b> («SO» = viene del sudoeste y empuja hacia el noreste). Aparece en el croquis, la vista general y los equipos.</small></p>' +
    '<form id="clf" autocomplete="off"><fieldset' + (ed ? '' : ' disabled') + '>' + climaFields(c) + '</fieldset>' + (ed ? '<button type="submit" class="btn primary">Guardar condiciones</button>' : '') + (c.ts ? ' <small class="muted">Actualizado ' + hhmm(c.ts).slice(0, 5) + '</small>' : '') + '</form></section>';
}
function saveClima(f, partial) {
  const num = (v, lo, hi) => { if (v === '' || v == null) return ''; const n = parseFloat(String(v).replace(',', '.')); return isNaN(n) ? '' : String(Math.max(lo, Math.min(hi, n))); };
  mut(op => {
    const c = Object.assign({}, op.clima || {});
    if ('dir' in f) c.dir = VIENTO[f.dir] != null ? f.dir : ''; if ('kmh' in f) c.kmh = num(f.kmh, 0, 250);
    if (!partial) { c.temp = num(f.temp, -50, 70); c.hum = num(f.hum, 0, 100); c.nota = f.nota || ''; }
    c.ts = now(); op.clima = c;
    logEv(op, 'Condiciones: ' + [c.dir ? 'viento ' + climaTxt(c) : 'viento sin dato', c.temp !== '' && c.temp != null ? c.temp + ' °C' : '', c.hum !== '' && c.hum != null ? 'HR ' + c.hum + '%' : '', c.nota || ''].filter(Boolean).join(' · '), 'clima');
  });
  if (typeof teamsPush === 'function') teamsPush(); toast('Condiciones guardadas ✔');
}
D.addEventListener('submit', e => { if (e.target.id !== 'clf' && e.target.id !== 'windf') return; e.preventDefault(); const f = {}; new FormData(e.target).forEach((v, k) => f[k] = String(v).trim()); saveClima(f, e.target.id === 'windf'); });
ACT['quick-clima'] = () => { const op = OPx(); if (!isEditor(op)) return; modal('🌬 Viento y tiempo', climaFields(op.clima || {}), [{ label: 'Cancelar' }, { label: 'Guardar', cls: 'primary', fn: () => saveClima(fdata(), false) }]); };

/* ---------- Croquis por capas: imagen del lugar + dibujo + norte y viento ---------- */
const CRO_W = 1000, CRO_H = 640;
const CRO_COLORS = ['#111111', '#d62828', '#1c6dd0', '#2b8a3e', '#e8590c'];
const CRO_MARKS = [['PC', 'Puesto de comando', '#1c6dd0'], ['ZS', 'Zona segura', '#2b8a3e'], ['AG', 'Agua / hidrante', '#0c8599'], ['FR', 'Frente de fuego', '#d62828'], ['AT', 'Línea de ataque', '#e8590c'], ['AN', 'Punto de anclaje', '#7048e8'], ['PM', 'Puesto médico', '#c2255c'], ['RH', 'Rehabilitación', '#5f3dc4'], ['PE', 'Peligro', '#d9a400'], ['AC', 'Acceso / ingreso', '#495057']];
let croTool = { mode: 'pen', color: '#d62828', size: 4, mark: 'PC' }, croStack = [], croDraft = null, croV = null;
const croSig = op => ((op && op.clima && op.clima.dir) || '') + '|' + ((op && op.clima && op.clima.kmh) || '');
function oCroquis(op, ed) {
  const on = c => c ? ' primary' : '', c = op.clima || {};
  let h = '<section class="card"><div class="row between"><h3>✏ Croquis de la situación</h3>' + (ed ? '<button type="button" class="btn ok sm" data-act="cro-save">💾 Guardar</button>' : '') + '</div><p class="muted"><small>Cargá una captura del lugar (Google Maps o Earth, satélite, foto) y marcá encima: puestos, agua, frente de fuego, líneas de ataque, zonas seguras. El norte y el viento se dibujan solos. Va al PDF.</small></p><div class="cro-layout">';
  if (ed) h += '<div class="croTools"><div class="row"><label class="btn sm filebtn">🖼 Imagen / captura<input type="file" id="crobase" accept="image/*"></label><label class="btn sm filebtn">📷 Sacar foto<input type="file" id="crobase2" accept="image/*" capture="environment"></label><span id="nobase">' + (croV && croV.baseUrl ? '<button type="button" class="btn sm" data-act="cro-nobase">✖ Quitar imagen</button>' : '') + '</span></div>' +
    '<form id="windf" class="row" autocomplete="off"><b>🌬</b><select name="dir" style="width:auto;min-height:38px" aria-label="Viento">' + windOptions(c.dir) + '</select><input type="number" name="kmh" value="' + esc(c.kmh) + '" min="0" max="250" inputmode="numeric" placeholder="km/h" style="width:84px;min-height:38px" aria-label="km/h"><button type="submit" class="btn sm">Aplicar</button></form>' +
    '<div class="row">' + CRO_COLORS.map(k => '<button type="button" class="sw' + (croTool.color === k && ['pen', 'arrow', 'text'].includes(croTool.mode) ? ' on' : '') + '" data-act="cro-color" data-c="' + k + '" style="background:' + k + '" aria-label="Color"></button>').join('') + '</div>' +
    '<div class="row"><button type="button" class="btn sm' + on(croTool.mode === 'pen') + '" data-act="cro-mode" data-m="pen">✏ Lápiz</button><button type="button" class="btn sm' + on(croTool.mode === 'arrow') + '" data-act="cro-mode" data-m="arrow">➜ Flecha</button><button type="button" class="btn sm' + on(croTool.mode === 'text') + '" data-act="cro-mode" data-m="text">🔤 Texto</button><button type="button" class="btn sm' + on(croTool.mode === 'erase') + '" data-act="cro-mode" data-m="erase">🧽 Borrar</button>' +
    '<select id="crosize" style="width:auto;min-height:38px" aria-label="Grosor"><option value="2"' + (croTool.size === 2 ? ' selected' : '') + '>Fino</option><option value="4"' + (croTool.size === 4 ? ' selected' : '') + '>Medio</option><option value="8"' + (croTool.size === 8 ? ' selected' : '') + '>Grueso</option></select></div>' +
    '<div class="row mkrow">' + CRO_MARKS.map(m => '<button type="button" class="btn sm mk' + on(croTool.mode === 'mark' && croTool.mark === m[0]) + '" data-act="cro-mode" data-m="mark" data-k="' + m[0] + '" title="' + esc(m[1]) + '"><i style="background:' + m[2] + '"></i>' + m[0] + '</button>').join('') + '</div>' +
    '<div class="row"><button type="button" class="btn sm" data-act="cro-undo">↩ Deshacer</button><button type="button" class="btn sm" data-act="cro-clear">🗑 Limpiar dibujo</button></div></div>';
  h += '<div class="cro-main"><canvas id="cro" width="' + CRO_W + '" height="' + CRO_H + '" class="croCanvas" aria-label="Croquis"></canvas><div class="legend">' + CRO_MARKS.map(m => '<span><i style="background:' + m[2] + '"></i><b>' + m[0] + '</b> ' + esc(m[1]) + '</span>').join('') + '</div>' +
    '<p class="muted"><small>' + (op.croquis ? 'Último guardado: ' + hhmm(op.croquis.ts) : 'Todavía no se guardó ningún croquis.') + (ed ? ' Los cambios se guardan solos al salir de esta pestaña.' : '') + '</small></p></div></div></section>';
  return h;
}
function croFlush() {
  if (!croDraft) return; const c = C(), op = c && c.ops.find(o => o.id === croDraft.op);
  if (op && op.estado === 'activa' && !op._follow && op.editors.includes(S.userId)) { op.croquis = { v: 2, base: croDraft.base, draw: croDraft.draw, img: croDraft.img, sig: croDraft.sig, ts: now(), by: S.userId }; save(); }
  croDraft = null;
}
window.addEventListener('pagehide', croFlush);
D.addEventListener('visibilitychange', () => { if (D.hidden) croFlush(); });
function croRR(x, a, b, w, h, r) { x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath(); }
function croOverlays(x, op) {
  x.save(); x.fillStyle = 'rgba(255,255,255,.88)'; x.strokeStyle = '#445'; x.lineWidth = 2; croRR(x, 14, 14, 54, 76, 8); x.fill(); x.stroke();
  x.fillStyle = '#111'; x.beginPath(); x.moveTo(41, 24); x.lineTo(54, 62); x.lineTo(41, 53); x.lineTo(28, 62); x.closePath(); x.fill(); x.font = 'bold 20px Arial'; x.textAlign = 'center'; x.fillText('N', 41, 84); x.restore();
  const c = op && op.clima;
  if (c && c.dir && VIENTO[c.dir] != null) {
    const bw = 178, bh = 98, bx = CRO_W - 14 - bw, by = 14, cx = bx + 48, cy = by + 58;
    x.save(); x.fillStyle = 'rgba(255,255,255,.9)'; x.strokeStyle = '#445'; x.lineWidth = 2; croRR(x, bx, by, bw, bh, 8); x.fill(); x.stroke(); x.fillStyle = '#334'; x.font = 'bold 13px Arial'; x.textAlign = 'left'; x.fillText('VIENTO', bx + 10, by + 20);
    x.translate(cx, cy); x.rotate(((VIENTO[c.dir] + 180) % 360) * Math.PI / 180); x.fillStyle = '#d62828'; x.beginPath(); x.moveTo(0, -30); x.lineTo(15, 24); x.lineTo(0, 12); x.lineTo(-15, 24); x.closePath(); x.fill(); x.restore();
    x.save(); x.fillStyle = '#111'; x.textAlign = 'left'; x.font = 'bold 20px Arial'; x.fillText('del ' + c.dir, bx + 92, by + 54); x.font = 'bold 18px Arial'; x.fillText(c.kmh ? c.kmh + ' km/h' : 's/d', bx + 92, by + 82); x.restore();
  }
}
function croRender(extra) {
  const v = croV; if (!v) return; const x = v.cv.getContext('2d');
  x.clearRect(0, 0, CRO_W, CRO_H); x.fillStyle = '#fff'; x.fillRect(0, 0, CRO_W, CRO_H);
  if (v.base) { x.fillStyle = '#e9edf1'; x.fillRect(0, 0, CRO_W, CRO_H); const k = Math.min(CRO_W / v.base.width, CRO_H / v.base.height), w = v.base.width * k, h = v.base.height * k; x.drawImage(v.base, (CRO_W - w) / 2, (CRO_H - h) / 2, w, h); }
  else { x.strokeStyle = '#e3e8ed'; x.lineWidth = 1; x.beginPath(); for (let i = 50; i < CRO_W; i += 50) { x.moveTo(i, 0); x.lineTo(i, CRO_H); } for (let j = 50; j < CRO_H; j += 50) { x.moveTo(0, j); x.lineTo(CRO_W, j); } x.stroke(); }
  x.drawImage(v.lay, 0, 0); if (extra) extra(x); croOverlays(x, OPx());
}
function croArrow(x, a, b, color, size) {
  x.save(); x.strokeStyle = color; x.fillStyle = color; x.lineWidth = size + 1; x.lineCap = 'round'; const ang = Math.atan2(b.y - a.y, b.x - a.x), hl = 16 + size * 2;
  x.beginPath(); x.moveTo(a.x, a.y); x.lineTo(b.x - Math.cos(ang) * hl * 0.6, b.y - Math.sin(ang) * hl * 0.6); x.stroke();
  x.beginPath(); x.moveTo(b.x, b.y); x.lineTo(b.x - hl * Math.cos(ang - Math.PI / 7), b.y - hl * Math.sin(ang - Math.PI / 7)); x.lineTo(b.x - hl * Math.cos(ang + Math.PI / 7), b.y - hl * Math.sin(ang + Math.PI / 7)); x.closePath(); x.fill(); x.restore();
}
function croMark(x, cx, cy, code) {
  const m = CRO_MARKS.find(q => q[0] === code) || CRO_MARKS[0]; x.save(); x.beginPath(); x.arc(cx, cy, 25, 0, Math.PI * 2); x.fillStyle = 'rgba(0,0,0,.45)'; x.fill();
  x.beginPath(); x.arc(cx, cy, 24, 0, Math.PI * 2); x.fillStyle = m[2]; x.fill(); x.lineWidth = 4; x.strokeStyle = '#fff'; x.stroke(); x.fillStyle = '#fff'; x.font = 'bold 18px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(m[0], cx, cy + 1); x.restore();
}
function croUndoPush() { const v = croV; if (!v) return; croStack.push({ data: v.lay.getContext('2d').getImageData(0, 0, CRO_W, CRO_H), base: v.base, baseUrl: v.baseUrl }); if (croStack.length > 10) croStack.shift(); }
function croCommit() { const v = croV; if (!v) return; croRender(); croDraft = { op: S.opId, v: 2, base: v.baseUrl || null, draw: v.lay.toDataURL('image/png'), img: v.cv.toDataURL('image/jpeg', 0.8), sig: croSig(OPx()) }; }
function initCroquis() {
  const cv = $('#cro'); if (!cv) { croV = null; return; }
  const op = OPx(), ed = isEditor(op), lay = D.createElement('canvas'); lay.width = CRO_W; lay.height = CRO_H;
  const v = croV = { cv, lay, base: null, baseUrl: null, loading: false }; croStack = [];
  const src = (croDraft && croDraft.op === op.id) ? croDraft : op.croquis; croRender();
  if (src) {
    let pending = 0; v.loading = true;
    const done = () => { if (--pending > 0) return; v.loading = false; croRender(); if (ed && src.v === 2 && src.sig !== croSig(op)) croCommit(); };
    const load = (url, cb) => { pending++; const im = new Image(); im.onload = () => { cb(im); done(); }; im.onerror = () => done(); im.src = url; };
    if (src.v !== 2 || op.estado !== 'activa' || !src.draw) { if (src.img) { v.baseUrl = src.img; load(src.img, im => { v.base = im; }); } }
    else { if (src.base) { v.baseUrl = src.base; load(src.base, im => { v.base = im; }); } load(src.draw, im => lay.getContext('2d').drawImage(im, 0, 0)); }
    if (!pending) v.loading = false;
  }
  if (!ed) return;
  const lx = lay.getContext('2d', { willReadFrequently: true }); lx.lineCap = 'round'; lx.lineJoin = 'round'; let st = null;
  const pos = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * CRO_W / r.width, y: (e.clientY - r.top) * CRO_H / r.height }; };
  cv.addEventListener('pointerdown', e => {
    e.preventDefault(); if (v.loading) return; const p = pos(e), t = croTool;
    if (t.mode === 'mark') { croUndoPush(); croMark(lx, p.x, p.y, t.mark); croCommit(); return; }
    if (t.mode === 'text') { croText(p); return; }
    try { cv.setPointerCapture(e.pointerId); } catch (er) { }
    croUndoPush(); st = { start: p, last: p, mode: t.mode };
    if (t.mode === 'pen' || t.mode === 'erase') { lx.globalCompositeOperation = t.mode === 'erase' ? 'destination-out' : 'source-over'; lx.strokeStyle = t.color; lx.lineWidth = t.mode === 'erase' ? t.size * 5 : t.size; lx.beginPath(); lx.moveTo(p.x, p.y); lx.lineTo(p.x + 0.01, p.y + 0.01); lx.stroke(); croRender(); }
  });
  cv.addEventListener('pointermove', e => { if (!st) return; e.preventDefault(); const p = pos(e); if (st.mode === 'arrow') { st.last = p; croRender(x => croArrow(x, st.start, p, croTool.color, croTool.size)); return; } lx.beginPath(); lx.moveTo(st.last.x, st.last.y); lx.lineTo(p.x, p.y); lx.stroke(); st.last = p; croRender(); });
  const end = () => { if (!st) return; const s = st; st = null; lx.globalCompositeOperation = 'source-over'; if (s.mode === 'arrow') { if (Math.hypot(s.last.x - s.start.x, s.last.y - s.start.y) > 10) croArrow(lx, s.start, s.last, croTool.color, croTool.size); else croStack.pop(); } croCommit(); };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
}
function croText(p) {
  modal('Texto en el croquis', F.text('Texto', 'txt', ''), [{ label: 'Cancelar' }, {
    label: 'Agregar', cls: 'primary', fn: () => {
      const t = fdata().txt; if (!t) return merr('Escribí un texto.'); const v = croV; if (!v) return; croUndoPush(); const x = v.lay.getContext('2d');
      x.save(); x.font = 'bold ' + (18 + croTool.size * 3) + 'px Arial,sans-serif'; x.textBaseline = 'middle'; x.lineJoin = 'round'; x.lineWidth = 6; x.strokeStyle = 'rgba(255,255,255,.95)'; x.strokeText(t, p.x, p.y); x.fillStyle = croTool.color; x.fillText(t, p.x, p.y); x.restore(); croCommit();
    }
  }], { focus: true });
}
function croSyncUI() { $$('[data-act=cro-color]').forEach(b => b.classList.toggle('on', b.dataset.c === croTool.color && ['pen', 'arrow', 'text'].includes(croTool.mode))); $$('[data-act=cro-mode]').forEach(b => b.classList.toggle('primary', b.dataset.m === croTool.mode && (croTool.mode !== 'mark' || b.dataset.k === croTool.mark))); }
ACT['cro-color'] = el => { croTool.color = el.dataset.c; if (!['pen', 'arrow', 'text'].includes(croTool.mode)) croTool.mode = 'pen'; croSyncUI(); };
ACT['cro-mode'] = el => { croTool.mode = el.dataset.m; if (el.dataset.k) croTool.mark = el.dataset.k; croSyncUI(); };
D.addEventListener('change', e => { if (e.target.id === 'crosize') croTool.size = +e.target.value || 4; });
ACT['cro-undo'] = () => { const v = croV; if (!v || !croStack.length) return; const s = croStack.pop(); v.lay.getContext('2d').putImageData(s.data, 0, 0); v.base = s.base; v.baseUrl = s.baseUrl; croCommit(); };
ACT['cro-clear'] = () => { const v = croV; if (!v) return; croUndoPush(); v.lay.getContext('2d').clearRect(0, 0, CRO_W, CRO_H); croCommit(); };
ACT['cro-nobase'] = () => { const v = croV; if (!v || !v.base) return; croUndoPush(); v.base = null; v.baseUrl = null; croCommit(); const b = $('#nobase'); if (b) b.innerHTML = ''; };
ACT['cro-save'] = () => { if (!croV) return; croCommit(); mut(op => { const d = croDraft; op.croquis = { v: 2, base: d.base, draw: d.draw, img: d.img, sig: d.sig, ts: now(), by: S.userId }; croDraft = null; logEv(op, 'Croquis guardado', 'nota'); }); toast('Croquis guardado ✔'); };
D.addEventListener('change', async e => {
  if ((e.target.id !== 'crobase' && e.target.id !== 'crobase2') || !e.target.files[0] || !croV) return; const file = e.target.files[0]; e.target.value = '';
  try { const url = await fileToJpeg(file, 1000, 0.8), im = new Image(); im.onload = () => { if (!croV) return; croUndoPush(); croV.base = im; croV.baseUrl = url; croCommit(); toast('Imagen cargada ✔ Ahora marcá encima.'); const b = $('#nobase'); if (b) b.innerHTML = '<button type="button" class="btn sm" data-act="cro-nobase">✖ Quitar imagen</button>'; }; im.onerror = () => toast('No se pudo leer la imagen.', 'bad'); im.src = url; }
  catch (er) { toast('No se pudo leer la imagen.', 'bad'); }
});
