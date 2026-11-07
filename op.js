/* SCI Bomberos – operación: pantalla, tablero, recursos, sectores, estructura, objetivos, bitácora, datos, MAYDAY, evacuación y cierre */
'use strict';
function logEv(op, text, type, by) { op.log.push({ id: uid(), ts: now(), by: by || S.userId, text, type: type || 'info' }); }
function mut(fn) { const op = OPx(); if (!isEditor(op)) { toast('Solo lectura: no tenés acceso de edición a esta operación.', 'bad'); return false; } fn(op); save(); render(); return true; }
function mutCmd(fn) { const op = OPx(); if (!op || op.estado !== 'activa' || op._follow || !(isIC(op) || isAdmin())) { toast('Solo el comandante del incidente o el administrador pueden hacer esto.', 'bad'); return false; } fn(op); save(); render(); return true; }
const liveRes = op => op.recursos.filter(r => r.estado !== 'Retirado');
const secOf = (op, id) => op.sectores.find(s => s.id === id);
function setEstado(op, r, est, silent) {
  if (r.estado === est) return; const prev = r.estado; r.estado = est; (r.hist = r.hist || []).push({ ts: now(), estado: est });
  if (est === 'En escena') { r.arrivedAt = r.arrivedAt || now(); r.workStart = now(); r.rehabStart = null; }
  else if (est === 'En rehabilitación') { r.workStart = null; r.rehabStart = now(); r.sectorId = null; }
  else if (est === 'Retirado') { r.leftAt = now(); r.workStart = null; r.rehabStart = null; r.sectorId = null; }
  else { r.workStart = null; r.rehabStart = null; }
  if (!silent) logEv(op, r.nombre + ': ' + prev + ' → ' + est, 'estado');
}
function assign(op, r, sid) {
  const sec = sid ? secOf(op, sid) : null, had = sec ? liveRes(op).filter(x => x.sectorId === sec.id).length : 0;
  if (sec) { r.sectorId = sec.id; r.lastSectorId = sec.id; if (['Alertado', 'En camino', 'En rehabilitación'].includes(r.estado)) setEstado(op, r, 'En escena', true); r.workStart = now(); if (!had) { sec.parLast = now(); sec.parAlerted = false; } logEv(op, r.nombre + ' asignado a ' + sec.nombre, 'asign'); }
  else { r.sectorId = null; r.workStart = null; logEv(op, r.nombre + ' pasa a espera / sin asignar', 'asign'); }
}
const HITOS = {
  'Incendio estructural': ['Reporte inicial y dimensionamiento (vuelta de reconocimiento)', 'Comando establecido', 'Seguridad: perímetro y control de accesos', 'Línea de ataque en posición', 'Búsqueda y rescate primaria', 'Ventilación', 'Corte de servicios (gas / electricidad)', 'Fuego controlado', 'Fuego extinguido', 'Búsqueda secundaria', 'Control de rescoldos', 'Rehabilitación del personal', 'Control final de personal (PAR)'],
  'Incendio forestal / pastizal': ['Reporte inicial (viento, combustible, exposiciones)', 'Comando establecido', 'Vías de escape y zonas seguras definidas', 'Protección / evacuación de exposiciones', 'Ataque inicial en flanco', 'Frente controlado', 'Perímetro asegurado', 'Liquidación y control de rescoldos', 'Rehabilitación del personal', 'Control final de personal (PAR)'],
  'Incendio vehicular': ['Reporte inicial', 'Zona de seguridad establecida', 'Línea de ataque en posición', 'Fuego controlado', 'Fuego extinguido', 'Control de combustible y batería', 'Rehabilitación del personal'],
  'Incendio industrial': ['Reporte inicial (qué se almacena / procesa)', 'Comando establecido', 'Evacuación del personal de la planta', 'Identificación de materiales peligrosos', 'Abastecimiento de agua asegurado', 'Protección de exposiciones', 'Fuego controlado', 'Fuego extinguido', 'Control final de personal (PAR)'],
  'Rescate vehicular': ['Reporte inicial y escena asegurada', 'Comando establecido', 'Estabilización del vehículo', 'Control de peligros (combustible, batería, tránsito)', 'Acceso a las víctimas', 'Triage y atención inicial', 'Extricación completada', 'Víctimas trasladadas', 'Control final de personal (PAR)'],
  'Rescate en altura / cuerdas': ['Reporte inicial y evaluación', 'Comando establecido', 'Sistema de anclaje y seguridad', 'Acceso a la víctima', 'Víctima asegurada y atendida', 'Víctima descendida / extraída', 'Control final de personal (PAR)'],
  'Rescate acuático': ['Reporte inicial', 'Comando establecido', 'Seguridad de los rescatistas', 'Búsqueda iniciada', 'Víctima localizada', 'Víctima rescatada', 'Traslado / entrega a emergencias médicas'],
  'Búsqueda de personas': ['Reporte inicial y último punto conocido', 'Comando establecido', 'Áreas de búsqueda asignadas a equipos', 'Equipos desplegados', 'Persona localizada', 'Persona evacuada / entregada', 'Control final de personal (PAR)'],
  'Materiales peligrosos (HAZMAT)': ['Reporte inicial (identificar el producto)', 'Perímetro y zonas (caliente / tibia / fría)', 'Evacuación o refugio en el lugar', 'Producto identificado', 'Descontaminación establecida', 'Fuga controlada / contenida', 'Control final de personal (PAR)'],
  'Accidente con múltiples víctimas': ['Reporte inicial y escena asegurada', 'Comando establecido', 'Triage iniciado', 'Área de tratamiento establecida', 'Transporte coordinado', 'Todas las víctimas evaluadas', 'Todas las víctimas trasladadas'],
  'Fuga de gas': ['Reporte inicial', 'Perímetro y control de fuentes de ignición', 'Evacuación', 'Corte de suministro', 'Medición: atmósfera segura', 'Ventilación', 'Entrega a la empresa de gas'],
  'Inundación / temporal': ['Reporte inicial', 'Comando establecido', 'Evaluación de riesgos', 'Evacuación', 'Asistencia a personas', 'Coordinación con Defensa Civil', 'Cierre de la operación']
};
const DEF_HITOS = ['Reporte inicial', 'Comando establecido', 'Seguridad de la escena', 'Objetivos definidos', 'Situación controlada', 'Rehabilitación del personal', 'Control final de personal (PAR)'];
const hitosFor = t => (HITOS[t] || DEF_HITOS).map(x => ({ id: uid(), texto: x, hecho: false, ts: now() }));
function respuestaMs(op) { const a = op.recursos.map(r => r.arrivedAt).filter(Boolean); return a.length ? Math.max(0, Math.min.apply(null, a) - op.alarmAt) : null; }
const respTxt = op => { const m = respuestaMs(op); return m == null ? '—' : dur(m); };

/* ---------- Nueva operación ---------- */
ACT['new-op'] = () => {
  const c = C(), cmds = c.users.filter(x => canCommand(x) && x.id !== S.userId);
  modal('🚨 Nueva operación', '<div class="grid tipos">' + TIPOS_SINIESTRO.slice(0, 8).map((t, i) => '<label class="btn rad tipo"><input type="radio" name="tipo" value="' + esc(t) + '"' + (i ? '' : ' checked') + '> ' + esc(t) + '</label>').join('') + '</div>' +
    F.sel('Otro tipo de siniestro', 'tipo2', [['', '— usar el marcado arriba —'], ...TIPOS_SINIESTRO.slice(8)], '') +
    F.text('Dirección / lugar *', 'direccion', '', { attrs: ' placeholder="Calle y número, ruta y km…"' }) + F.text('Localidad', 'localidad', c.localidad) + coordField('') +
    '<details><summary>Más datos (solicitante, descripción, hora, operador)</summary><div class="frow">' + F.text('Solicitante', 'solicitante', '') + F.text('Teléfono del solicitante', 'telSolicitante', '', { type: 'tel' }) + '</div>' +
    F.text('Referencia interna (opcional)', 'nombre', '', { attrs: ' placeholder="Si lo dejás vacío se arma sola"' }) + F.area('Descripción inicial', 'descripcion', '', 2, true) +
    '<div class="field"><label>Hora de la alarma</label><input type="datetime-local" name="alarma" value="' + toLocalInput(now()) + '"></div>' +
    F.sel('Operador de comando (2.º acceso de edición)', 'deleg', [['', 'Ninguno'], ...cmds.map(x => [x.id, uName(x.id)])], '') + '</details>' +
    '<p class="muted"><small>🔒 Vas a ser el <b>Comandante del incidente</b>: solo vos (y un operador, si lo elegís) pueden modificar el tablero.</small></p>',
    [{ label: 'Cancelar' }, {
      label: '🚨 Abrir operación', cls: 'primary', fn: () => {
        const f = fdata(), tipo = f.tipo2 || f.tipo || TIPOS_SINIESTRO[0]; if (!f.direccion) return merr('Ingresá la dirección o el lugar.');
        const cc = readCoords(f.coords); if (!cc.ok) return merr('No entiendo las coordenadas. Ejemplo: -31.52080, -59.31050 (o dejalas vacías).');
        c.opSeq = (c.opSeq || 0) + 1; const a = f.alarma ? new Date(f.alarma).getTime() : now();
        const op = migrate({ cuarteles: { x: { ops: [{
          id: uid(), num: new Date().getFullYear() + '-' + String(c.opSeq).padStart(3, '0'), nombre: f.nombre || (tipo + ' - ' + f.direccion), tipo, direccion: f.direccion, localidad: f.localidad, coords: cc.text, solicitante: f.solicitante, telSolicitante: f.telSolicitante, descripcion: f.descripcion,
          estado: 'activa', alarmAt: isNaN(a) ? now() : a, openedAt: now(), closedAt: null, editors: [S.userId].concat(f.deleg ? [f.deleg] : []), icInicial: S.userId, estrategia: 'Sin definir', parMin: c.defaults.parMin, rotMin: c.defaults.rotMin, hitos: hitosFor(tipo), mayday: null, cierre: null
        }] } } }).cuarteles.x.ops[0];
        logEv(op, 'Operación abierta: ' + op.tipo + ' en ' + op.direccion, 'info'); logEv(op, 'Comandante del incidente: ' + uName(S.userId), 'cmd'); if (f.deleg) logEv(op, 'Operador de comando: ' + uName(f.deleg), 'cmd');
        c.ops.push(op); save(); go({ view: 'op', opId: op.id, optab: 'general' });
      }
    }], { focus: false });
};

/* ---------- Pantalla de operación ---------- */
const OPTABS = [['general', '📺', 'General'], ['tablero', '🧭', 'Tablero'], ['equipos', '👥', 'Equipos'], ['croquis', '✏', 'Croquis'], ['recursos', '🚒', 'Recursos'], ['estructura', '🎖', 'Estructura'], ['objetivos', '🎯', 'Objetivos'], ['bitacora', '📝', 'Bitácora'], ['datos', 'ℹ', 'Datos']];
const MAIN_TABS = ['general', 'tablero', 'equipos', 'croquis'];
function vOp() {
  const c = C(), op = OPx(), u = U(); if (!c || !u) return vLogin(); if (!op) return vCuartel();
  const ed = isEditor(op), act = op.estado === 'activa', mm = localStorage.getItem(MKEY) === '1';
  const body = { general: oGeneral, tablero: oTablero, equipos: oEquipos, croquis: oCroquis, recursos: oRecursos, estructura: oEstructura, objetivos: oObjetivos, bitacora: oBitacora, datos: oDatos }[S.optab] || oGeneral;
  const more = !MAIN_TABS.includes(S.optab), bodyHtml = body(op, ed);
  return '<div class="opsticky"><div class="optop"><button type="button" class="icon" data-act="op-back" title="Volver al cuartel" aria-label="Volver">←</button>' +
    '<div class="title"><b>' + esc(op.num) + ' · ' + esc(op.nombre) + '</b><small class="muted">' + esc(op.tipo) + ' · ' + esc(op.direccion) + '</small></div>' +
    '<div class="clock"><small>' + (act ? 'Tiempo de operación' : 'Duración final') + '</small><span data-since="' + op.alarmAt + '"' + (op.closedAt ? ' data-until="' + op.closedAt + '"' : '') + '>00:00</span></div>' +
    '<span class="pill ' + (ed ? 'ok' : 'info') + '">' + (!act ? '🔒 CERRADA' : op._follow ? '📡 EN VIVO' : ed ? '✏ EDITOR' : '👁 LECTURA') + '</span>' +
    '<button type="button" class="icon" data-act="envio" title="Enviar, respaldar y traspasar" aria-label="Enviar">📤</button><button type="button" class="icon" data-act="contactos" title="Teléfonos útiles" aria-label="Teléfonos">📞</button><button type="button" class="icon" data-act="ubicacion" title="Ubicación y mapas" aria-label="Ubicación">🗺</button><button type="button" class="icon" data-act="mute" title="Sonido de alertas" aria-label="Sonido">' + (mm ? '🔕' : '🔔') + '</button>' +
    (act && !op._follow ? '<button type="button" class="btn mayday" data-act="mayday">🆘 MAYDAY</button>' : '') + (ed ? '<button type="button" class="btn sm" data-act="op-close" title="Cerrar operación">✅<span class="hs"> Cerrar</span></button>' : '') + '</div>' +
    (act && op.evac && op.evac.active ? '<div class="evacbar"><b>🚨 ORDEN DE EVACUACIÓN ' + hhmm(op.evac.ts).slice(0, 5) + '</b><span class="grow">' + esc(op.evac.text || 'Todo el personal a zona segura') + evacAck(op) + '</span>' + (ed ? '<button type="button" class="btn sm ok" data-act="evac-end">Levantar</button>' : '') + '</div>' : '') +
    (act && op.mayday && op.mayday.active ? '<div class="maydaybar"><b>🆘 MAYDAY desde ' + hhmm(op.mayday.ts).slice(0, 5) + '</b><span class="grow">' + esc(op.mayday.detalle || 'Sin detalle: tocá «Detalle» para indicar quién y dónde.') + '</span><button type="button" class="btn sm" data-act="mayday-detail">Detalle</button>' + (ed ? '<button type="button" class="btn sm ok" data-act="mayday-end">Resuelto</button>' : '') + '</div>' : '') +
    '<nav class="tabs optabs" role="tablist">' + OPTABS.map(t => '<button type="button" role="tab" class="tab' + (S.optab === t[0] ? ' on' : '') + '" data-act="optab" data-t="' + t[0] + '"><span>' + t[1] + '</span> ' + t[2] + (t[0] === 'equipos' ? eqBadge(op) : '') + '</button>').join('') + '</nav></div>' +
    '<main class="opmain">' + (!act ? '<div class="closed-banner row between"><span>🔒 Operación cerrada el ' + R.fdt(op.closedAt) + ' — solo lectura.</span><span class="row"><button type="button" class="btn sm primary" data-act="op-pdf" data-id="' + op.id + '">📄 PDF</button><button type="button" class="btn sm" data-act="op-share" data-id="' + op.id + '">📤 Compartir</button></span></div>'
      : op._follow ? '<div class="closed-banner">📡 Siguiendo en vivo desde la nube (solo lectura). Se actualiza solo cada 20 s. <span class="muted" data-followinfo></span> <button type="button" class="btn sm" data-act="unfollow">Dejar de seguir</button></div>'
        : !ed ? '<div class="closed-banner">👁 Modo <b>solo lectura</b>. Editan: <b>' + esc(uName(op.editors[0])) + '</b>' + (op.editors[1] ? ' y <b>' + esc(uName(op.editors[1])) + '</b>' : '') + '.</div>' : '') +
    bodyHtml + '</main>' +
    '<nav class="bnav" aria-label="Secciones">' + OPTABS.filter(t => MAIN_TABS.includes(t[0])).map(t => '<button type="button" class="' + (S.optab === t[0] ? 'on' : '') + '" data-act="optab" data-t="' + t[0] + '"><span>' + t[1] + '</span>' + t[2] + (t[0] === 'equipos' ? eqBadge(op) : '') + '</button>').join('') + '<button type="button" class="' + (more ? 'on' : '') + '" data-act="more"><span>☰</span>' + (more ? OPTABS.find(t => t[0] === S.optab)[2] : 'Más') + '</button></nav>' +
    (ed ? '<button type="button" class="fab" data-act="quick" aria-label="Acción rápida" title="Acción rápida">＋</button>' : '');
}
ACT['op-back'] = () => { if (typeof croFlush === 'function') croFlush(); go({ view: 'cuartel', opId: null }); };
ACT['optab'] = el => { if (S.optab === 'croquis' && el.dataset.t !== 'croquis') croFlush(); closeModal(); go({ optab: el.dataset.t }, el.closest('.bnav') || el.closest('#modal') ? true : false); };
ACT['more'] = () => modal('Más secciones', '<div class="grid g2">' + OPTABS.filter(t => !MAIN_TABS.includes(t[0])).map(t => '<button type="button" class="btn block big" data-act="optab" data-t="' + t[0] + '">' + t[1] + ' ' + t[2] + '</button>').join('') + '</div>', [{ label: 'Cerrar' }]);
ACT['mute'] = () => { localStorage.setItem(MKEY, localStorage.getItem(MKEY) === '1' ? '0' : '1'); render(); };
ACT['op-share'] = el => { const op = C().ops.find(o => o.id === el.dataset.id); if (op) exportPdf(op, true); };

/* ---------- Primeros pasos ---------- */
function guia(op, ed) {
  if (!ed || op.guiaOff) return '';
  const st = [[!!op.coords, '📍 Ubicación', 'ubicacion'], [op.recursos.length > 0, '🚒 Recursos', 'res-add'], [op.sectores.length > 0, '🧭 Un sector', 'sector-new'], [!!(op.clima && op.clima.dir), '🌬 Viento', 'quick-clima'], [op.equipos.length > 0, '👥 Equipos con QR', 'eq-new'], [!!op.roles.seguridad, '🦺 Of. de Seguridad', 'go-estructura']];
  const done = st.filter(s => s[0]).length; if (done === st.length) return '';
  return '<section class="card guia"><div class="row between"><b>Primeros pasos · ' + done + '/' + st.length + '</b><button type="button" class="btn sm ghost" data-act="guia-off">Ocultar</button></div><div class="bar"><i style="width:' + Math.round(done / st.length * 100) + '%"></i></div><div class="gsteps">' +
    st.map(s => '<button type="button" class="gstep' + (s[0] ? ' ok' : '') + '" data-act="' + s[2] + '"' + (s[0] ? ' disabled' : '') + '>' + (s[0] ? '✅ ' : '') + s[1] + '</button>').join('') + '</div></section>';
}
ACT['guia-off'] = () => mut(op => { op.guiaOff = true; });
ACT['sector-new'] = () => ACT['sector-edit']({ dataset: { id: '' } });
ACT['go-estructura'] = () => go({ optab: 'estructura' });

/* ---------- Acciones rápidas (＋) ---------- */
ACT['quick'] = () => {
  const items = [['quick-note', '📝', 'Nota en bitácora'], ['res-add', '🚒', 'Agregar recursos'], ['quick-foto', '📷', 'Foto del lugar'], ['quick-pedido', '📦', 'Pedido de recursos'], ['vict-new', '🩺', 'Registrar víctima'], ['quick-clima', '🌬', 'Viento y tiempo'], ['eq-msg-all', '📣', 'Mensaje a equipos'], ['evac', '🚨', 'Orden de evacuación']];
  modal('Acción rápida', '<div class="qgrid">' + items.map(i => '<button type="button" class="qitem' + (i[0] === 'evac' ? ' danger' : '') + '" data-act="' + i[0] + '"><span>' + i[1] + '</span>' + i[2] + '</button>').join('') + '</div>', [{ label: 'Cerrar' }]);
};
ACT['quick-note'] = () => modal('📝 Nota en bitácora', '<div class="qbtns">' + QUICK_LOG.map(q => '<button type="button" class="btn sm" data-act="qlog" data-t="' + esc(q) + '">' + esc(q) + '</button>').join('') + '</div>' + F.area('O escribí la novedad', 'nota', '', 3, true),
  [{ label: 'Cancelar' }, { label: 'Registrar', cls: 'primary', fn: () => { const t = fdata().nota; if (!t) return merr('Escribí la novedad o tocá una de las rápidas.'); mut(op => logEv(op, t, 'nota')); toast('Registrado ✔'); } }], { focus: true });
ACT['quick-pedido'] = () => modal('📦 Pedido de recursos', F.text('¿Qué se necesita?', 'texto', '', { attrs: ' placeholder="Cisterna adicional, ambulancia, relevo…"' }) + F.sel('Categoría', 'cat', ['Recursos', 'Personal', 'Logística', 'Médico', 'Equipo', 'Otro'], 'Recursos'),
  [{ label: 'Cancelar' }, { label: 'Registrar', cls: 'primary', fn: () => { const f = fdata(); if (!f.texto) return merr('Escribí el pedido.'); mut(op => { op.pedidos.push({ id: uid(), texto: f.texto, categoria: f.cat, atendido: false, ts: now() }); logEv(op, 'Pedido (' + f.cat + '): ' + f.texto, 'pedido'); }); } }], { focus: true });
ACT['quick-foto'] = () => modal('📷 Foto del lugar', '<div class="field"><label>Foto</label><input type="file" name="foto" accept="image/*" capture="environment"></div>' + F.text('Descripción', 'texto', ''),
  [{ label: 'Cancelar' }, { label: 'Guardar', cls: 'primary', fn: async () => { const file = $('#mf [name=foto]').files[0], t = fdata().texto; if (!file) return merr('Elegí o sacá una foto.'); let img; try { img = await fileToJpeg(file, 900, 0.72); } catch (e) { return merr('No se pudo leer la foto.'); } mut(op => { op.fotos.push({ id: uid(), ts: now(), equipo: 'Comando', text: t, img }); logEv(op, 'Foto agregada' + (t ? ': ' + t : ''), 'foto'); }); } }]);

/* ---------- Tablero ---------- */
function resCard(op, r) {
  let t = '';
  if (r.estado === 'En rehabilitación' && r.rehabStart) t = '<span class="wt">⏸ <span data-since="' + r.rehabStart + '">00:00</span></span>';
  else if (r.sectorId && r.workStart && op.estado === 'activa') t = '<span class="wt" title="Tiempo de trabajo">⏱ <span data-work="' + r.workStart + '">00:00</span></span>';
  return '<div class="res e-' + ESTADO_SLUG[r.estado] + '" data-act="res-open" data-id="' + r.id + '" role="button" tabindex="0">' + resIconHTML(r) + '<div class="rn"><b>' + esc(r.nombre) + '</b><small>' + esc([r.institucion, r.detalle].filter(Boolean).join(' · ') || r.kind) + '</small></div><div class="rr"><span class="chip">' + esc(r.estado) + '</span>' + t + '</div></div>';
}
function statStrip(op, extra) {
  const live = liveRes(op), v = op.victimas, st = (n, l, cls) => '<div class="stat' + (cls ? ' ' + cls : '') + '"><b' + (String(n).length > 6 ? ' class="txt"' : '') + '>' + n + '</b><small>' + l + '</small></div>';
  return '<div class="strip">' + st(live.filter(r => r.estado === 'En escena').length, 'En escena') + st(live.filter(r => !r.sectorId).length, 'Sin asignar') + st(live.filter(r => r.kind === 'unidad').length, 'Unidades') + st(live.filter(r => r.kind === 'personal').length, 'Bomberos') + st(v.heridos, 'Heridos', v.heridos ? 'warnb' : '') + st(v.rescatados, 'Rescatados') + st(respTxt(op), 'Respuesta') + (extra || '') + st(esc(op.estrategia), 'Estrategia') + '</div>';
}
function sectorCol(op, s, i, ed, compact) {
  const live = liveRes(op), rs = live.filter(r => r.sectorId === s.id), act = op.estado === 'activa', wait = live.filter(r => !r.sectorId);
  const eqs = op.equipos.filter(e => e.sectorId === s.id);
  return '<section class="sector" style="--sc:' + SECTOR_COLORES[i % SECTOR_COLORES.length] + '"><div class="sh"><div style="min-width:0"><span class="tag">' + esc(s.tipo || 'Sector') + '</span><h3>' + esc(s.nombre) + '</h3>' + (s.lider ? '<small class="muted">Líder: ' + esc(s.lider) + '</small>' : '') + '</div>' + (ed && !compact ? '<button type="button" class="icon" data-act="sector-edit" data-id="' + s.id + '" title="Editar sector">✎</button>' : '<span class="pill">' + rs.length + '</span>') + '</div>' +
    (act && rs.length ? '<div class="par" data-par="' + s.id + '" data-state="ok"><div><small>PAR · ' + (s.parMin || op.parMin) + ' MIN</small><b data-parval>00:00</b></div>' + (ed ? '<button type="button" class="btn ok sm" data-act="par" data-id="' + s.id + '">✔ PAR OK</button>' : '') + '</div>' : '') +
    (s.objetivo ? '<div class="task">🎯 ' + esc(s.objetivo) + '</div>' : '') + (eqs.length ? '<div class="row" style="gap:6px;margin:4px 0">' + eqs.map(e => '<span class="eqchip" style="--ec:' + e.color + '">👥 ' + esc(e.nombre) + '</span>').join('') + '</div>' : '') +
    (rs.length ? rs.map(r => resCard(op, r)).join('') : '<div class="empty">Sin recursos asignados.</div>') + (ed && wait.length && !compact ? '<button type="button" class="btn sm block" style="margin-top:10px" data-act="assign-here" data-id="' + s.id + '">➕ Asignar recursos aquí</button>' : '') + '</section>';
}
function oTablero(op, ed) {
  const wait = liveRes(op).filter(r => !r.sectorId);
  let h = guia(op, ed) + statStrip(op);
  if (ed) h += '<div class="row" style="margin-bottom:12px"><button type="button" class="btn primary" data-act="res-add">➕ Agregar recursos</button><button type="button" class="btn" data-act="sector-new">➕ Nuevo sector / división</button></div>';
  h += '<div class="board"><section class="sector wait"><div class="sh"><div><span class="tag">Staging</span><h3>Sin asignar / En espera</h3></div><span class="pill">' + wait.length + '</span></div>' + (wait.length ? wait.map(r => resCard(op, r)).join('') : '<div class="empty">No hay recursos en espera.</div>') + '</section>' + op.sectores.map((s, i) => sectorCol(op, s, i, ed)).join('') + '</div>';
  return h + (!op.sectores.length && ed ? '<p class="muted">Tip: creá sectores («Frente de ataque», «Rescate», «Abastecimiento») y asigná los recursos tocándolos.</p>' : '');
}
ACT['par'] = el => mut(op => { const s = secOf(op, el.dataset.id); if (!s) return; s.parLast = now(); s.parAlerted = false; logEv(op, 'PAR realizado: ' + s.nombre + ' (' + liveRes(op).filter(r => r.sectorId === s.id).length + ' recursos)', 'par'); });
ACT['assign-here'] = el => {
  const op = OPx(), s = secOf(op, el.dataset.id), wait = liveRes(op).filter(r => !r.sectorId);
  modal('Asignar a ' + esc(s.nombre), wait.length ? '<div class="list">' + wait.map(r => '<label class="check"><input type="checkbox" name="rs[]" value="' + r.id + '"> ' + resIcon(r) + ' <span>' + esc(r.nombre) + ' <small class="muted">' + esc(r.estado) + '</small></span></label>').join('') + '</div>' : '<div class="empty">No hay recursos sin asignar.</div>',
    [{ label: 'Cancelar' }, { label: 'Asignar', cls: 'primary', fn: () => { const ids = checked('rs[]'); if (!ids.length) return merr('Elegí al menos un recurso.'); mut(o => ids.forEach(id => { const r = o.recursos.find(x => x.id === id); if (r) assign(o, r, s.id); })); } }]);
};
ACT['sector-edit'] = el => {
  const op = OPx(), id = el.dataset.id, s = id ? secOf(op, id) : null, pers = C().users.filter(u => u.activo !== false).map(uFull);
  modal(s ? 'Editar sector' : 'Nuevo sector / división', F.text('Nombre *', 'nombre', s && s.nombre, { attrs: ' placeholder="Frente de ataque, Sector A, Rescate…"' }) +
    '<div class="field"><label>Tipo</label><input type="text" name="tipo" list="dl-ts" value="' + esc(s ? s.tipo : 'Sector') + '"></div>' + F.list('dl-ts', TIPOS_SECTOR) +
    '<div class="field"><label>Líder / jefe del sector</label><input type="text" name="lider" list="dl-pers" value="' + esc(s && s.lider) + '"></div>' + F.list('dl-pers', pers) +
    F.area('Tarea / objetivo del sector', 'objetivo', s && s.objetivo, 2, true) + F.text('Intervalo de PAR propio (min) — vacío = el de la operación', 'parMin', s && s.parMin, { type: 'number', attrs: ' min="1" max="60"' }),
    [{ label: 'Cancelar' }, ...(s ? [{ label: 'Eliminar', cls: 'bad', fn: () => { mut(o => { liveRes(o).filter(r => r.sectorId === s.id).forEach(r => assign(o, r, null)); o.sectores = o.sectores.filter(x => x.id !== s.id); o.equipos.forEach(e => { if (e.sectorId === s.id) e.sectorId = ''; }); logEv(o, 'Sector eliminado: ' + s.nombre, 'sector'); }); } }] : []), {
      label: 'Guardar', cls: 'primary', fn: () => {
        const f = fdata(); if (!f.nombre) return merr('Ingresá el nombre del sector.');
        mut(o => { if (s) { Object.assign(secOf(o, s.id), { nombre: f.nombre, tipo: f.tipo, lider: f.lider, objetivo: f.objetivo, parMin: f.parMin ? +f.parMin : null }); logEv(o, 'Sector actualizado: ' + f.nombre, 'sector'); } else { o.sectores.push({ id: uid(), nombre: f.nombre, tipo: f.tipo || 'Sector', lider: f.lider, objetivo: f.objetivo, parMin: f.parMin ? +f.parMin : null, parLast: now(), parAlerted: false }); logEv(o, 'Sector creado: ' + f.nombre, 'sector'); } });
      }
    }], { focus: true });
};

/* ---------- Recursos ---------- */
function oRecursos(op, ed) {
  let h = ed ? '<div class="row" style="margin-bottom:12px"><button type="button" class="btn primary" data-act="res-add">➕ Agregar recursos</button></div>' : '';
  [['unidad', '🚒 Unidades'], ['personal', '👤 Personal'], ['externo', '🤝 Otras instituciones']].forEach(k => {
    const l = op.recursos.filter(r => r.kind === k[0]);
    h += '<section class="card mb"><h3>' + k[1] + ' (' + l.filter(r => r.estado !== 'Retirado').length + ' activos / ' + l.length + ')</h3>' + (l.length ? '<div class="tscroll"><table class="t"><thead><tr><th>Recurso</th><th>Estado</th><th>Sector</th><th>En escena</th><th>Retiro</th></tr></thead><tbody>' +
      l.map(r => '<tr data-act="res-open" data-id="' + r.id + '" style="cursor:pointer"><td><b>' + esc(r.nombre) + '</b><br><small class="muted">' + esc([r.institucion, r.detalle].filter(Boolean).join(' · ')) + '</small></td><td><span class="chip">' + esc(r.estado) + '</span></td><td>' + esc((secOf(op, r.sectorId) || {}).nombre || '—') + '</td><td>' + (r.arrivedAt ? hhmm(r.arrivedAt).slice(0, 5) : '—') + '</td><td>' + (r.leftAt ? hhmm(r.leftAt).slice(0, 5) : '—') + '</td></tr>').join('') + '</tbody></table></div>' : '<div class="empty">Sin registros.</div>') + '</section>';
  });
  return h;
}
ACT['res-add'] = () => {
  const c = C(), op = OPx(); if (!isEditor(op)) return; const inOp = new Set(op.recursos.map(r => r.refId).filter(Boolean));
  const units = c.units.filter(x => !inOp.has(x.id)), pers = c.users.filter(x => x.activo !== false && !inOp.has(x.id)).sort((a, b) => (a.apellido + a.nombre).localeCompare(b.apellido + b.nombre));
  modal('Agregar recursos', '<div class="field"><label>Estado inicial</label><div class="row"><label class="btn rad"><input type="radio" name="estado" value="En camino" checked> En camino</label><label class="btn rad"><input type="radio" name="estado" value="En escena"> En escena</label></div></div>' +
    '<h4>🚒 Unidades</h4>' + (units.length ? '<div class="pickgrid">' + units.map(x => '<label class="pick"><input type="checkbox" name="u[]" value="' + x.id + '">' + (x.foto ? '<img alt="" src="' + x.foto + '">' : '<span class="uph ph">🚒</span>') + '<span><b>' + esc(x.nombre) + '</b><small>' + esc(x.tipo || '') + (x.fuera ? ' · FUERA DE SERVICIO' : '') + '</small></span></label>').join('') + '</div>' : '<div class="muted"><small>No hay más unidades para agregar.</small></div>') +
    '<h4>👤 Personal</h4><input type="search" id="flt" placeholder="Buscar por nombre o legajo…" style="margin-bottom:8px"><div id="plist" class="pickgrid">' + (pers.length ? pers.map(x => '<label class="pick" data-q="' + esc((uFull(x) + ' ' + (x.legajo || '')).toLowerCase()) + '"><input type="checkbox" name="p[]" value="' + x.id + '"><span class="uph ph">👤</span><span><b>' + esc(uFull(x)) + '</b><small>' + esc(x.jerarquia || '') + '</small></span></label>').join('') : '<div class="muted"><small>No hay más personal para agregar.</small></div>') + '</div>' +
    '<details><summary>🤝 Otra institución o cuartel (policía, hospital, ambulancia…)</summary><div class="field"><label>Institución</label><input type="text" name="ext_inst" list="dl-inst" placeholder="Elegí o escribí"></div>' + F.list('dl-inst', INSTITUCIONES) + '<div class="frow">' + F.text('Nombre (cuartel / móvil / unidad)', 'ext_nombre', '', { attrs: ' placeholder="B.V. Villaguay – Autobomba 2"' }) + F.text('Detalle', 'ext_det', '') + F.text('Personal', 'ext_dot', '', { type: 'number', attrs: ' min="0" inputmode="numeric"' }) + F.text('Teléfono de contacto', 'ext_tel', '', { type: 'tel' }) + '</div><div class="field"><label>Foto (opcional)</label><input type="file" name="ext_foto" accept="image/*"></div></details>',
    [{ label: 'Cancelar' }, {
      label: 'Agregar', cls: 'primary', fn: async () => {
        const f = fdata(), us = checked('u[]'), ps = checked('p[]'), est = f.estado || 'En camino', mk = o => Object.assign({ id: uid(), sectorId: null, lastSectorId: null, estado: est, addedAt: now(), arrivedAt: est === 'En escena' ? now() : null, leftAt: null, workStart: null, rehabStart: null, hist: [{ ts: now(), estado: est }] }, o), items = [];
        us.forEach(id => { const x = c.units.find(q => q.id === id); if (x) items.push(mk({ kind: 'unidad', refId: x.id, nombre: x.nombre, detalle: [x.tipo, x.patente].filter(Boolean).join(' · '), dotacion: x.dotacion || '' })); });
        ps.forEach(id => { const x = uById(id); if (x) items.push(mk({ kind: 'personal', refId: x.id, nombre: uFull(x), detalle: x.jerarquia || '', dotacion: '' })); });
        if (f.ext_nombre) { let foto = null; const file = $('#mf [name=ext_foto]').files[0]; if (file) { try { foto = await fileToJpeg(file, 480, 0.78); } catch (e) { return merr('No se pudo leer la foto.'); } } items.push(mk({ kind: 'externo', refId: null, nombre: f.ext_nombre, institucion: f.ext_inst || '', detalle: f.ext_det || '', dotacion: f.ext_dot || '', tel: f.ext_tel || '', foto })); }
        if (!items.length) return merr('Elegí al menos un recurso.');
        mut(o => { items.forEach(i => o.recursos.push(i)); logEv(o, 'Ingresan a la operación (' + est + '): ' + items.map(i => i.nombre).join(', '), 'recurso'); });
      }
    }], { wide: true, onOpen: m => { const i = $('#flt', m); if (i) i.addEventListener('input', () => { const q = i.value.toLowerCase(); $$('#plist [data-q]', m).forEach(l => l.style.display = l.dataset.q.includes(q) ? '' : 'none'); }); } });
};
ACT['res-open'] = el => {
  const op = OPx(), r = op.recursos.find(x => x.id === el.dataset.id); if (!r) return; const ed = isEditor(op), ph = unitFoto(r);
  const info = (ph ? '<img class="gimg" style="max-height:200px;object-fit:cover;margin-bottom:8px" alt="" src="' + ph + '">' : '') + '<p class="muted">' + resIcon(r) + ' ' + esc(r.kind) + (r.detalle ? ' · ' + esc(r.detalle) : '') + (r.institucion ? ' · ' + esc(r.institucion) : '') + (r.tel ? ' · <a href="tel:' + esc(r.tel.replace(/[^\d+]/g, '')) + '">📞 ' + esc(r.tel) + '</a>' : '') + '</p><p><small class="muted">Alerta: ' + hhmm(r.addedAt) + ' · En escena: ' + (r.arrivedAt ? hhmm(r.arrivedAt) : '—') + ' · Retiro: ' + (r.leftAt ? hhmm(r.leftAt) : '—') + '</small></p>';
  if (!ed) return modal(esc(r.nombre), info + '<p>Estado: <b>' + esc(r.estado) + '</b><br>Sector: <b>' + esc((secOf(op, r.sectorId) || {}).nombre || 'Sin asignar') + '</b></p>', [{ label: 'Cerrar', cls: 'primary' }]);
  modal(esc(r.nombre), info + '<div class="field"><label>Estado</label><div class="row">' + ESTADOS.map(e => '<label class="btn rad sm"><input type="radio" name="estado" value="' + e + '"' + (e === r.estado ? ' checked' : '') + '> ' + e + '</label>').join('') + '</div></div>' +
    F.sel('Sector asignado (si está En escena)', 'sector', [['', 'Sin asignar / En espera'], ...op.sectores.map(s => [s.id, s.nombre])], r.sectorId || '') + (r.kind !== 'personal' ? F.text('Dotación (personas)', 'dotacion', r.dotacion, { type: 'number', attrs: ' min="0"' }) : ''),
    [{ label: 'Cancelar' }, { label: 'Guardar', cls: 'primary', fn: () => { const f = fdata(); mut(o => { const x = o.recursos.find(q => q.id === r.id); if (f.dotacion !== undefined) x.dotacion = f.dotacion; if (f.estado && f.estado !== x.estado) setEstado(o, x, f.estado); if (!['Retirado', 'En rehabilitación'].includes(x.estado) && (f.sector || null) !== (x.sectorId || null)) assign(o, x, f.sector || null); }); } }]);
};

/* ---------- Estructura ---------- */
function oEstructura(op, ed) {
  const act = op.estado === 'activa', pers = C().users.filter(u => u.activo !== false).map(uFull), canCmd = act && !op._follow && (isIC(op) || isAdmin());
  return '<section class="card mb"><h3>🔒 Acceso de edición al tablero</h3><div class="grid g2"><div class="card flat"><small class="tag">Comandante del incidente</small><div class="big"><b>' + esc(uName(op.editors[0])) + '</b></div></div><div class="card flat"><small class="tag">Operador de comando</small><div class="big"><b>' + (op.editors[1] ? esc(uName(op.editors[1])) : '—') + '</b></div></div></div>' +
    '<p class="muted"><small>Solo estas personas modifican el tablero. El resto lo consulta en solo lectura.</small></p>' + (canCmd ? '<button type="button" class="btn" data-act="cmd-assign">🔁 Cambiar comandante / operador</button>' : '') + '</section>' +
    '<section class="card mb"><h3>Estrategia</h3><div class="row">' + ESTRATEGIAS.map(e => '<button type="button" class="btn ' + (op.estrategia === e ? 'primary' : '') + '" data-act="estrategia" data-e="' + e + '"' + (ed ? '' : ' disabled') + '>' + e + '</button>').join('') + '</div></section>' +
    '<section class="card"><h3>Estructura del Sistema de Comando de Incidentes</h3><form id="rf" autocomplete="off"><div class="grid g2">' + ROLES_SCI.map(r => '<div class="field"><label>' + r[1] + '</label><input type="text" name="' + r[0] + '" list="dl-pers2" value="' + esc(op.roles[r[0]]) + '"' + (ed ? '' : ' disabled') + '></div>').join('') + '</div>' + F.list('dl-pers2', pers) + (ed ? '<button type="submit" class="btn primary">Guardar estructura</button>' : '') + '</form></section>';
}
ACT['estrategia'] = el => mut(op => { if (op.estrategia !== el.dataset.e) { op.estrategia = el.dataset.e; logEv(op, 'Estrategia: ' + op.estrategia, 'cmd'); } });
D.addEventListener('submit', e => {
  if (e.target.id !== 'rf') return; e.preventDefault(); const f = {}; new FormData(e.target).forEach((v, k) => f[k] = String(v).trim());
  mut(op => { const ch = ROLES_SCI.filter(r => (op.roles[r[0]] || '') !== f[r[0]]); ROLES_SCI.forEach(r => op.roles[r[0]] = f[r[0]]); if (ch.length) logEv(op, 'Estructura actualizada: ' + ch.map(r => r[1] + ' = ' + (f[r[0]] || '—')).join('; '), 'cmd'); }); toast('Estructura guardada ✔');
});
ACT['cmd-assign'] = () => {
  const op = OPx(), cmds = C().users.filter(canCommand);
  modal('Comando y operador', '<p class="muted">Solo habilitados para comando reciben acceso de edición. Si cambiás el comandante, vos podrías quedar en solo lectura. Si la otra persona usa <b>otro dispositivo</b>, usá 📤 Traspasar.</p>' + F.sel('Comandante del incidente', 'ic', cmds.map(x => [x.id, uName(x.id)]), op.editors[0]) + F.sel('Operador de comando', 'op2', [['', 'Ninguno'], ...cmds.map(x => [x.id, uName(x.id)])], op.editors[1] || ''),
    [{ label: 'Cancelar' }, { label: 'Aplicar', cls: 'primary', fn: () => { const f = fdata(); if (!f.ic) return merr('Elegí un comandante.'); if (f.ic === f.op2) return merr('El comandante y el operador deben ser personas distintas.'); mutCmd(o => { const was = isIC(o); o.editors = [f.ic].concat(f.op2 ? [f.op2] : []); logEv(o, (was ? '' : '(Reasignado por administrador) ') + 'Comando: ' + uName(o.editors[0]) + (o.editors[1] ? ' · Operador: ' + uName(o.editors[1]) : ''), 'cmd'); }); } }]);
};

/* ---------- Objetivos, hitos y pedidos ---------- */
function oObjetivos(op, ed) {
  const hs = op.hitos, done = hs.filter(h => h.hecho).length, cats = ['Recursos', 'Personal', 'Logística', 'Médico', 'Equipo', 'Otro'];
  return '<section class="card mb"><div class="row between"><h3>✅ Hitos tácticos (' + done + '/' + hs.length + ')</h3>' + (ed ? '<button type="button" class="btn sm" data-act="hito-load">Sugeridos para «' + esc(op.tipo) + '»</button>' : '') + '</div><div class="bar"><i style="width:' + (hs.length ? Math.round(done / hs.length * 100) : 0) + '%"></i></div>' +
    '<p class="muted"><small>Tocá cada hito cuando se cumple: queda la hora en la bitácora y en el PDF.</small></p>' + (ed ? '<form id="hitf" class="row nowrap"><input type="text" name="t" placeholder="Agregar hito propio…"><button class="btn primary" type="submit">Agregar</button></form>' : '') +
    (hs.length ? '<div class="grid g2" style="margin-top:10px">' + hs.map(h => '<label class="res hito' + (h.hecho ? ' done' : '') + '"><input type="checkbox" ' + (h.hecho ? 'checked ' : '') + 'data-act="hito-toggle" data-id="' + h.id + '"' + (ed ? '' : ' disabled') + '><div class="rn"><b>' + esc(h.texto) + '</b></div>' + (h.hecho ? '<span class="wt">' + hhmm(h.doneAt).slice(0, 5) + '</span>' : (ed ? '<button type="button" class="icon" data-act="hito-del" data-id="' + h.id + '" title="Quitar">✕</button>' : '')) + '</label>').join('') + '</div>' : '<div class="empty">Sin hitos.</div>') + '</section>' +
    '<div class="grid g2"><section class="card"><h3>🎯 Objetivos tácticos</h3>' + (ed ? '<form id="obf" class="row nowrap"><input type="text" name="t" placeholder="Nuevo objetivo…"><button class="btn primary" type="submit">Agregar</button></form>' : '') +
    (op.objetivos.length ? '<div class="list">' + op.objetivos.map(o => '<div class="row between"><label class="check grow"><input type="checkbox" ' + (o.hecho ? 'checked ' : '') + 'data-act="obj-toggle" data-id="' + o.id + '"' + (ed ? '' : ' disabled') + '> <span' + (o.hecho ? ' class="strike"' : '') + '>' + esc(o.texto) + '</span></label>' + (ed ? '<button type="button" class="icon" data-act="obj-del" data-id="' + o.id + '">✕</button>' : '') + '</div>').join('') + '</div>' : '<div class="empty">Sin objetivos.</div>') + '</section>' +
    '<section class="card"><h3>📦 Pedidos de recursos</h3>' + (ed ? '<form id="pdf2"><div class="row nowrap"><input type="text" name="t" placeholder="Qué se necesita…"><select name="cat" style="max-width:150px">' + cats.map(c => '<option>' + c + '</option>').join('') + '</select></div><button class="btn primary block" type="submit" style="margin-top:8px">Registrar pedido</button></form>' : '') +
    (op.pedidos.length ? '<div class="list">' + op.pedidos.map(p => '<div class="row between"><label class="check grow"><input type="checkbox" ' + (p.atendido ? 'checked ' : '') + 'data-act="ped-toggle" data-id="' + p.id + '"' + (ed ? '' : ' disabled') + '> <span' + (p.atendido ? ' class="strike"' : '') + '>' + esc(p.texto) + ' <span class="chip">' + esc(p.categoria) + '</span></span></label>' + (ed ? '<button type="button" class="icon" data-act="ped-del" data-id="' + p.id + '">✕</button>' : '') + '</div>').join('') + '</div>' : '<div class="empty">Sin pedidos.</div>') + '</section></div>';
}
D.addEventListener('submit', e => {
  const id = e.target.id; if (!['obf', 'pdf2', 'hitf', 'lgf'].includes(id)) return; e.preventDefault(); const t = e.target.t.value.trim(); if (!t) return;
  if (id === 'obf') mut(op => { op.objetivos.push({ id: uid(), texto: t, hecho: false, ts: now() }); logEv(op, 'Objetivo: ' + t, 'obj'); });
  if (id === 'pdf2') mut(op => { op.pedidos.push({ id: uid(), texto: t, categoria: e.target.cat.value, atendido: false, ts: now() }); logEv(op, 'Pedido (' + e.target.cat.value + '): ' + t, 'pedido'); });
  if (id === 'hitf') mut(op => { op.hitos.push({ id: uid(), texto: t, hecho: false, ts: now() }); });
  if (id === 'lgf') mut(op => logEv(op, t, 'nota'));
});
ACT['obj-toggle'] = el => mut(op => { const o = op.objetivos.find(x => x.id === el.dataset.id); if (o) { o.hecho = !o.hecho; o.doneAt = o.hecho ? now() : null; logEv(op, 'Objetivo ' + (o.hecho ? 'cumplido' : 'reabierto') + ': ' + o.texto, 'obj'); } });
ACT['obj-del'] = el => mut(op => { op.objetivos = op.objetivos.filter(x => x.id !== el.dataset.id); });
ACT['ped-toggle'] = el => mut(op => { const p = op.pedidos.find(x => x.id === el.dataset.id); if (p) { p.atendido = !p.atendido; logEv(op, 'Pedido ' + (p.atendido ? 'atendido' : 'reabierto') + ': ' + p.texto, 'pedido'); } });
ACT['ped-del'] = el => mut(op => { op.pedidos = op.pedidos.filter(x => x.id !== el.dataset.id); });
ACT['hito-toggle'] = el => mut(op => { const h = op.hitos.find(x => x.id === el.dataset.id); if (h) { h.hecho = !h.hecho; h.doneAt = h.hecho ? now() : null; logEv(op, 'Hito ' + (h.hecho ? 'cumplido' : 'reabierto') + ': ' + h.texto, 'hito'); } });
ACT['hito-del'] = el => mut(op => { op.hitos = op.hitos.filter(x => x.id !== el.dataset.id); });
ACT['hito-load'] = () => mut(op => { const have = new Set(op.hitos.map(h => h.texto)); hitosFor(op.tipo).filter(h => !have.has(h.texto)).forEach(h => op.hitos.push(h)); });

/* ---------- Bitácora ---------- */
let logFilter = '';
function oBitacora(op, ed) {
  const types = [['', 'Todo'], ['equipo', 'Equipos'], ['mayday', 'MAYDAY / evac.'], ['nota', 'Notas'], ['par', 'PAR']];
  const logs = op.log.slice().sort((a, b) => b.ts - a.ts).filter(l => !logFilter || l.type === logFilter || (logFilter === 'mayday' && l.type === 'evac'));
  return '<section class="card">' + (ed ? '<form id="lgf" class="micwrap"><input type="text" name="t" id="lgt" placeholder="Anotar novedad…" autocomplete="off">' + micBtn('#lgt') + '<button class="btn primary" type="submit">Registrar</button></form><div class="qbtns">' + QUICK_LOG.map(q => '<button type="button" class="btn sm" data-act="qlog" data-t="' + esc(q) + '">' + esc(q) + '</button>').join('') + '</div>' : '') +
    '<div class="row between"><h3>Bitácora (' + op.log.length + ')</h3><div class="row seg">' + types.map(t => '<button type="button" class="btn sm' + (logFilter === t[0] ? ' primary' : '') + '" data-act="logf" data-f="' + t[0] + '">' + t[1] + '</button>').join('') + '</div></div>' +
    '<div>' + (logs.length ? logs.map(l => '<div class="logrow ' + (l.type === 'mayday' || l.type === 'evac' ? 'mayday' : l.type === 'equipo' ? 'eqlog' : '') + '"><time>' + hhmm(l.ts) + '</time><div>' + (l.type === 'mayday' ? '🆘 ' : l.type === 'evac' ? '🚨 ' : '') + esc(l.text) + '<span class="by">' + esc(uName(l.by)) + '</span></div></div>').join('') : '<div class="empty">Sin eventos con ese filtro.</div>') + '</div></section>';
}
ACT['qlog'] = el => { mut(op => logEv(op, el.dataset.t, 'nota')); if ($('#modal:not(.hidden)')) closeModal(); toast('Registrado ✔'); };
ACT['logf'] = el => { logFilter = el.dataset.f; render(); };

/* ---------- MAYDAY ---------- */
ACT['mayday'] = () => {
  const op = OPx(); if (!op || op.estado !== 'activa' || op._follow) return;
  if (op.mayday && op.mayday.active) return ACT['mayday-detail']();
  op.mayday = { active: true, ts: now(), by: S.userId, detalle: '' }; logEv(op, 'MAYDAY declarado', 'mayday'); save(); beep(5, 1100); render(); ACT['mayday-detail']();
};
ACT['mayday-detail'] = () => {
  const op = OPx(); if (!op || !op.mayday) return;
  modal('🆘 MAYDAY', '<p>Indicá <b>quién</b> está en problemas y <b>dónde</b>. Usá el esquema <b>LUNAR</b>: Lugar, Unidad, Nombre, Aire restante, Recursos que necesita.</p>' + F.area('Detalle', 'det', op.mayday.detalle, 3, true),
    [{ label: 'Cerrar' }, ...((isEditor(op) || op.mayday.by === S.userId) && !op._follow ? [{ label: 'Falsa activación', fn: () => { op.mayday.active = false; logEv(op, 'MAYDAY anulado (falsa activación)', 'mayday'); save(); render(); } }] : []), ...(op._follow ? [] : [{ label: 'Guardar detalle', cls: 'bad', fn: () => { const t = fdata().det; if (t !== op.mayday.detalle) { op.mayday.detalle = t; logEv(op, 'MAYDAY — detalle: ' + t, 'mayday'); save(); render(); } } }])], { focus: true });
};
ACT['mayday-end'] = () => mut(op => { if (op.mayday) { op.mayday.active = false; op.mayday.resolvedAt = now(); logEv(op, 'MAYDAY resuelto', 'mayday'); } });

/* ---------- Orden de evacuación ---------- */
function evacAck(op) { const eqs = op.equipos || []; if (!eqs.length || !op.evac) return ''; const ok = eqs.filter(e => e.evacAck && e.evacAck >= op.evac.ts).length; return ' · <b>' + ok + '/' + eqs.length + ' equipos confirmaron</b>'; }
ACT['evac'] = () => {
  const op = OPx(); if (!isEditor(op)) return toast('Solo el comando puede ordenar la evacuación.', 'bad');
  modal('🚨 Orden de evacuación', '<p>Se muestra en rojo en todos los equipos conectados por QR (pantalla completa, sonido y vibración) y queda registrada. Pedí confirmación por radio igual.</p>' + F.text('Instrucción', 'texto', 'Todo el personal a zona segura. Abandonar el interior.'),
    [{ label: 'Cancelar' }, { label: '🚨 ORDENAR EVACUACIÓN', cls: 'bad', fn: () => { const t = fdata().texto; mut(o => { o.evac = { active: true, ts: now(), text: t }; logEv(o, 'ORDEN DE EVACUACIÓN: ' + t, 'evac'); }); beep(6, 950); if (typeof teamsPush === 'function') teamsPush(); } }]);
};
ACT['evac-end'] = () => { mut(op => { if (op.evac) { op.evac.active = false; op.evac.endTs = now(); logEv(op, 'Orden de evacuación levantada', 'evac'); } }); if (typeof teamsPush === 'function') teamsPush(); };

/* ---------- Cierre ---------- */
ACT['op-close'] = () => {
  const op = OPx(); if (!isEditor(op)) return; const pend = liveRes(op).length, c = op.cierre || {}, hp = op.hitos.filter(h => !h.hecho).length;
  modal('✅ Cerrar operación', '<p>Se <b>bloquea el tablero</b>, se registra la hora de cierre y se genera el <b>PDF</b> para RUBA.</p><ul class="chk">' + (pend ? '<li>⚠ ' + pend + ' recurso(s) figuran activos: se marcarán como retirados.</li>' : '<li>✅ Todos los recursos retirados.</li>') + (hp ? '<li>⚠ ' + hp + ' hito(s) sin marcar.</li>' : '') + (op.equipos.length ? '<li>👥 Los equipos conectados verán que la operación terminó.</li>' : '') + '</ul>' +
    F.sel('Resultado final *', 'resultado', RESULTADOS, c.resultado) + F.text('Causa probable (preliminar)', 'causa', c.causa) + F.area('Daños y pérdidas', 'danios', c.danios, 2, true) + F.area('Observaciones', 'observaciones', c.observaciones, 3, true) + '<label class="check"><input type="checkbox" name="ok"> Revisé recursos, víctimas y bitácora</label>',
    [{ label: 'Volver' }, {
      label: 'Cerrar y generar PDF', cls: 'primary', fn: () => {
        const f = fdata(); if (!f.ok) return merr('Confirmá que revisaste los datos antes de cerrar.');
        const o = OPx(); croFlush(); if (o.mayday && o.mayday.active) { o.mayday.active = false; logEv(o, 'MAYDAY cerrado junto con la operación', 'mayday'); }
        if (o.evac && o.evac.active) { o.evac.active = false; o.evac.endTs = now(); }
        liveRes(o).forEach(r => setEstado(o, r, 'Retirado', true));
        o.estado = 'cerrada'; o.closedAt = now(); o.cierre = { resultado: f.resultado, causa: f.causa, danios: f.danios, observaciones: f.observaciones };
        if (o.croquis) { delete o.croquis.base; delete o.croquis.draw; }
        logEv(o, 'Operación cerrada — ' + f.resultado, 'info'); save(); render(); exportPdf(o);
        if (typeof teamsPush === 'function') teamsPush(o); if (typeof cloudClose === 'function') cloudClose(o);
        modal('Operación cerrada', '<p>✔ La operación <b>' + esc(o.num) + '</b> quedó cerrada y guardada en el historial. Se descargó el PDF; si no lo ves, usá estos botones.</p>',
          [{ label: '📄 Descargar PDF', cls: 'primary', fn: () => { exportPdf(o); return false; } }, { label: '📤 Compartir', fn: () => { exportPdf(o, true); return false; } }, { label: 'Ir al historial', fn: () => { go({ view: 'cuartel', tab: 'hist', opId: null }); } }]);
      }
    }]);
};
