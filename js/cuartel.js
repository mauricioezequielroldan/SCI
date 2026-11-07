/* SCI Bomberos – inicio, cuarteles, ingreso, personal, unidades, perfil y ajustes */
'use strict';
const themeBtn = () => '<button class="btn sm" data-act="theme" title="Tema claro / oscuro" aria-label="Cambiar tema" type="button">🌓</button>';
const helpBtn = () => '<button class="btn sm" data-act="ayuda" title="Ayuda" aria-label="Ayuda" type="button">?</button>';

/* ---------- Inicio: elegir cuartel ---------- */
function vHome() {
  const list = Object.values(db.cuarteles).sort((a, b) => a.nombre.localeCompare(b.nombre));
  return '<header class="top"><div class="brand"><div class="logo">🚒</div><div><b>SCI Bomberos</b><small>Comando de incidentes · v' + APP_VERSION + '</small></div></div><div class="who">' + helpBtn() + themeBtn() + '</div></header><main class="stack narrow">' +
    (list.length ? '<section class="card"><h2>Elegí tu cuartel</h2><div class="grid g2">' + list.map(c =>
      '<button type="button" class="userbtn ccard" data-act="open-cuartel" data-id="' + c.id + '" style="--cc:' + c.color + '"><div class="row" style="flex-wrap:nowrap">' + logoHTML(c) + '<div style="min-width:0"><b>' + esc(c.nombre) + '</b><small>' + esc([c.localidad, c.provincia].filter(Boolean).join(', ')) + '</small></div></div>' +
      '<span class="pill' + (c.ops.some(o => o.estado === 'activa') ? ' bad' : '') + '">' + c.users.filter(u => u.activo !== false).length + ' integrantes · ' + c.ops.filter(o => o.estado === 'activa').length + ' operación(es) activa(s)</span></button>').join('') + '</div></section>'
      : '<section class="card hero"><div class="hero-ico">🚒</div><h2>Tablero de comando de incidentes</h2><p class="muted big">Para incendios, rescates y emergencias. Funciona en computadora, tablet y celular, incluso sin señal.</p>' +
      '<ol class="steps"><li><b>Creá tu cuartel</b><span>Nombre, logo y un administrador.</span></li><li><b>Cargá personal y unidades</b><span>Con foto de cada móvil.</span></li><li><b>Abrí una operación</b><span>Tablero, equipos con QR, croquis y PDF final.</span></li></ol></section>') +
    '<div class="grid g3"><button type="button" class="btn primary giant" data-act="new-cuartel">➕ Crear cuartel</button><button type="button" class="btn giant" data-act="demo">🎬 Probar con datos de ejemplo</button><button type="button" class="btn giant" data-act="import">📥 Importar respaldo (.json)</button></div>' +
    '<input type="file" id="imp" accept=".json,application/json" class="hidden">' +
    '<p class="muted center"><small>Los datos quedan en este dispositivo. Para usarla en varios equipos, exportá el respaldo del cuartel (Ajustes) e importalo en los demás.</small></p></main>';
}
ACT['open-cuartel'] = el => go({ view: 'login', cuartelId: el.dataset.id, userId: null });
ACT['theme'] = () => { const h = D.documentElement, t = h.dataset.theme === 'dark' ? 'light' : 'dark'; h.dataset.theme = t; localStorage.setItem(TKEY, t); };
ACT['import'] = () => $('#imp').click();
D.addEventListener('change', async e => {
  if (e.target.id !== 'imp' || !e.target.files[0]) return;
  try {
    const j = JSON.parse(await e.target.files[0].text());
    if (j.kind !== 'sci-cuartel' || !j.cuartel || !j.cuartel.id || !Array.isArray(j.cuartel.users)) throw new Error('formato');
    const ex = db.cuarteles[j.cuartel.id];
    if (ex && !(await ask('Cuartel ya existente', 'Ya existe «' + esc(ex.nombre) + '» en este dispositivo. ¿Reemplazarlo con el respaldo?', 'Reemplazar', 'bad'))) { e.target.value = ''; return; }
    db.cuarteles[j.cuartel.id] = j.cuartel; migrate(db); save(true); toast('Cuartel importado ✔'); render();
  } catch (err) { toast('El archivo no es un respaldo válido de SCI Bomberos.', 'bad'); }
  e.target.value = '';
});
ACT['ayuda'] = () => modal('Guía rápida', '<div class="help">' +
  '<h4>1 · Antes de la emergencia</h4><p>Creá el cuartel, cargá el <b>personal</b> (marcá quién puede ser comandante) y las <b>unidades</b> con su foto. En Ajustes poné los teléfonos útiles, hospitales y el correo del cuartel.</p>' +
  '<h4>2 · Al llegar al siniestro</h4><p>Tocá <b>🚨 Nueva operación</b>. La app te guía con los <b>primeros pasos</b>: ubicación, recursos, sectores, viento y equipos.</p>' +
  '<h4>3 · Equipos con QR</h4><p>En <b>👥 Equipos</b> creá cada equipo de trabajo y mostrale su <b>QR</b>. El jefe de equipo lo escanea con la cámara del celular y desde ahí manda su recorrido, reportes, fotos y PAR. Necesita el <b>respaldo en la nube</b> activado (Ajustes); sin él, el equipo guarda todo y lo envía al final.</p>' +
  '<h4>4 · Durante la operación</h4><p><b>📺 General</b> muestra todo de un vistazo. El botón <b>＋</b> agrega rápido notas, recursos, hitos, pedidos o fotos. <b>🆘 MAYDAY</b> y <b>Orden de evacuación</b> están siempre a mano.</p>' +
  '<h4>5 · Al terminar</h4><p><b>✅ Cerrar operación</b> bloquea el tablero y genera el <b>PDF</b> para RUBA. Si el comandante se tiene que ir, usá <b>📤 Traspasar</b>.</p></div>', [{ label: 'Entendido', cls: 'primary' }], { wide: true });

/* ---------- Crear cuartel ---------- */
ACT['new-cuartel'] = () => {
  modal('Crear cuartel',
    F.text('Nombre del cuartel *', 'nombre', '', { attrs: ' placeholder="Bomberos Voluntarios de …"' }) +
    '<div class="frow">' + F.text('Localidad', 'localidad', '') + F.sel('Provincia', 'provincia', PROVINCIAS, 'Entre Ríos') + '</div>' + F.text('Federación / Asociación', 'federacion', '') +
    '<div class="field"><label>Color del cuartel</label><div class="swatches" id="sws">' + COLORES.map((c, i) => '<span class="sw' + (i ? '' : ' on') + '" data-col="' + c + '" style="background:' + c + '"></span>').join('') + '</div><input type="hidden" name="color" value="' + COLORES[0] + '"></div>' +
    '<div class="field"><label>Logo (opcional)</label><input type="file" name="logo" accept="image/*"></div>' +
    '<div class="sep"></div><h4>Administrador del cuartel</h4><div class="frow">' + F.text('Nombre *', 'a_nombre', '') + F.text('Apellido *', 'a_apellido', '') + '</div>' +
    '<div class="frow"><div class="field"><label>Jerarquía</label><input type="text" name="a_jerarquia" list="dl-jer" value="Comandante"></div>' + F.text('Legajo', 'a_legajo', '') + '</div>' + F.list('dl-jer', JERARQUIAS) +
    '<div class="frow">' + F.text('PIN (4 a 6 números) *', 'a_pin', '', { type: 'password', attrs: ' inputmode="numeric" maxlength="6"' }) + F.text('Repetir PIN *', 'a_pin2', '', { type: 'password', attrs: ' inputmode="numeric" maxlength="6"' }) + '</div>',
    [{ label: 'Cancelar' }, {
      label: 'Crear cuartel', cls: 'primary', fn: async () => {
        const f = fdata();
        if (!f.nombre) return merr('Ingresá el nombre del cuartel.'); if (!f.a_nombre || !f.a_apellido) return merr('Ingresá nombre y apellido del administrador.');
        if (!validPin(f.a_pin)) return merr('El PIN debe tener entre 4 y 6 números.'); if (f.a_pin !== f.a_pin2) return merr('Los PIN no coinciden.');
        let logo = null; const file = $('#mf input[name=logo]').files[0];
        if (file) { try { logo = await fileToJpeg(file, 220); } catch (e) { return merr('No se pudo leer la imagen del logo.'); } }
        const admin = await mkUser({ nombre: f.a_nombre, apellido: f.a_apellido, jerarquia: f.a_jerarquia, legajo: f.a_legajo, admin: true, comando: true }, f.a_pin);
        const c = migrate({ cuarteles: { x: { id: uid(), codigo: Math.random().toString(36).slice(2, 8).toUpperCase(), nombre: f.nombre, localidad: f.localidad, provincia: f.provincia, federacion: f.federacion, color: f.color || COLORES[0], logo, users: [admin], units: [], ops: [], opSeq: 0, createdAt: now() } } }).cuarteles.x;
        db.cuarteles[c.id] = c; save(true); S.cuartelId = c.id; S.userId = admin.id; go({ view: 'cuartel', tab: 'inicio' }); toast('Cuartel creado ✔ Ahora cargá personal y unidades.', '', 4500);
      }
    }],
    { focus: true, onOpen: m => m.addEventListener('click', ev => { const s = ev.target.closest('#sws .sw'); if (!s) return; $$('#sws .sw', m).forEach(x => x.classList.remove('on')); s.classList.add('on'); $('input[name=color]', m).value = s.dataset.col; }) });
};
async function mkUser(f, pin) {
  const salt = uid();
  return { id: uid(), nombre: f.nombre, apellido: f.apellido, jerarquia: f.jerarquia || '', legajo: f.legajo || '', dni: f.dni || '', tel: f.tel || '', email: f.email || '', sangre: f.sangre || '', contacto: f.contacto || '', contactoTel: f.contactoTel || '', especialidades: f.especialidades || '', notas: f.notas || '', admin: !!f.admin, comando: !!f.comando, activo: true, salt, pin: await hashPin(pin, salt) };
}

/* ---------- Ingreso con PIN ---------- */
let loginSel = null;
function vLogin() {
  const c = C(); if (!c) return vHome();
  const users = c.users.filter(u => u.activo !== false).sort((a, b) => (a.apellido + a.nombre).localeCompare(b.apellido + b.nombre));
  return '<header class="top"><div class="brand">' + logoHTML(c) + '<div><b>' + esc(c.nombre) + '</b><small>' + esc([c.localidad, c.provincia].filter(Boolean).join(', ')) + '</small></div></div><div class="who">' + themeBtn() + '<button class="btn sm" data-act="to-home" type="button">Cuarteles</button></div></header>' +
    '<main class="stack narrow">' + (c.demo ? '<div class="closed-banner">🎬 Cuartel de ejemplo: todos los PIN son <b>1234</b>.</div>' : '') + '<section class="card"><h2>¿Quién sos?</h2><div class="grid g3">' +
    users.map(u => '<button type="button" class="userbtn' + (loginSel === u.id ? ' sel' : '') + '" data-act="pick-user" data-id="' + u.id + '"><b>' + esc(uFull(u)) + '</b><small>' + esc(u.jerarquia || 'Sin jerarquía') + (u.comando ? ' · 🎖 Comando' : '') + '</small></button>').join('') + '</div></section>' +
    '<section class="card ' + (loginSel ? '' : 'hidden') + '" id="pinbox"><form id="lf" autocomplete="off"><div class="field"><label>PIN de ' + esc(loginSel && uById(loginSel) ? uFull(uById(loginSel)) : '') + '</label><input type="password" id="pin" inputmode="numeric" maxlength="6" placeholder="••••" class="pinin"></div><div class="err" id="lerr"></div><button class="btn primary block" type="submit" style="min-height:58px">Entrar</button></form></section></main>';
}
ACT['to-home'] = () => { loginSel = null; go({ view: 'home', cuartelId: null, userId: null }); };
ACT['pick-user'] = el => { loginSel = el.dataset.id; render(); const p = $('#pin'); if (p) { p.focus(); p.scrollIntoView({ block: 'center' }); } };
D.addEventListener('submit', async e => {
  if (e.target.id === 'lf') {
    e.preventDefault(); const u = uById(loginSel), pin = $('#pin').value; if (!u) return;
    if ((await hashPin(pin, u.salt)) !== u.pin) { $('#lerr').textContent = 'PIN incorrecto.'; $('#pin').value = ''; return; }
    S.userId = u.id; loginSel = null; go({ view: 'cuartel', tab: 'inicio' });
    const act = C().ops.filter(o => o.estado === 'activa'); if (act.length) toast('Hay ' + act.length + ' operación(es) activa(s).');
  } else if (e.target.id === 'mf') { e.preventDefault(); const m = $('#modal'), p = m._actions && m._actions.filter(a => a.cls && /primary|bad|ok/.test(a.cls)).pop(); if (p) runModalAction(m._actions.indexOf(p)); }
});

/* ---------- Cuartel ---------- */
function vCuartel() {
  const c = C(), u = U(); if (!c || !u) return vLogin();
  const tabs = [['inicio', '🏠', 'Inicio'], ['hist', '📋', 'Historial'], ['personal', '👥', 'Personal'], ['unidades', '🚒', 'Unidades'], ['perfil', '🙍', 'Mi perfil']];
  if (u.admin) tabs.push(['ajustes', '⚙', 'Ajustes']);
  const body = { hist: tHist, personal: tPersonal, unidades: tUnidades, perfil: tPerfil, ajustes: u.admin ? tAjustes : tInicio }[S.tab] || tInicio;
  return '<header class="top"><div class="brand">' + logoHTML(c) + '<div><b>' + esc(c.nombre) + '</b><small>' + esc(uName(u.id)) + '</small></div></div><div class="who">' + helpBtn() + themeBtn() + '<button class="btn sm" data-act="lock" type="button">Salir</button></div></header>' +
    '<nav class="tabs" role="tablist">' + tabs.map(t => '<button type="button" role="tab" class="tab' + (S.tab === t[0] ? ' on' : '') + '" data-act="tab" data-t="' + t[0] + '"><span>' + t[1] + '</span> ' + t[2] + '</button>').join('') + '</nav><main class="stack">' + body() + '</main>';
}
ACT['tab'] = el => go({ tab: el.dataset.t });
ACT['lock'] = () => { if (typeof croFlush === 'function') croFlush(); loginSel = null; go({ view: 'login', userId: null, opId: null }); };

function tInicio() {
  const c = C(), u = U(), act = c.ops.filter(o => o.estado === 'activa');
  let h = '';
  act.forEach(op => {
    const ed = isEditor(op);
    h += '<section class="card live"><div class="row between"><div style="min-width:0"><span class="dot"></span> <b>OPERACIÓN ACTIVA · ' + esc(op.num) + '</b>' + (op._follow ? ' <span class="pill info">siguiendo desde la nube</span>' : '') + '<h2 style="margin-top:6px">' + esc(op.nombre) + '</h2><div class="muted">' + esc(op.tipo) + ' · ' + esc(op.direccion || 'sin dirección') + '</div></div><div class="clock"><small>Tiempo</small><span data-since="' + op.alarmAt + '">00:00</span></div></div>' +
      '<p class="muted" style="margin:8px 0">Comando: <b>' + esc(uName(op.editors[0])) + '</b>' + (op.editors[1] ? ' · Operador: <b>' + esc(uName(op.editors[1])) + '</b>' : '') + ' · ' + (op.equipos || []).length + ' equipo(s)</p>' +
      '<div class="row"><span class="pill ' + (ed ? 'ok' : 'info') + '">' + (ed ? '✏ Tenés acceso de edición' : '👁 Solo lectura') + '</span><span class="grow"></span><button type="button" class="btn primary" data-act="open-op" data-id="' + op.id + '">Abrir operación →</button></div></section>';
  });
  h += canCommand(u) ? '<button type="button" class="btn primary giant pulse" data-act="new-op">🚨 NUEVA OPERACIÓN</button>' : '<div class="card muted">Tu usuario no está habilitado para abrir operaciones de comando. Pedile al administrador que te habilite.</div>';
  h += '<div class="grid g2"><button type="button" class="btn block" data-act="recuperar">📥 Recuperar una operación (traspaso o nube)</button><button type="button" class="btn block" data-act="seguir">📡 Seguir una operación en vivo (solo lectura)</button></div>';
  const faltan = []; if (!c.units.length) faltan.push(['unidades', 'Cargá las unidades del cuartel (con foto)']); if (c.users.length < 2) faltan.push(['personal', 'Cargá al personal y marcá quién puede comandar']); if (u.admin && !(c.cloud && c.cloud.on)) faltan.push(['ajustes', 'Activá el respaldo en la nube para usar los QR de equipos en vivo']);
  if (faltan.length) h += '<section class="card"><h3>Para dejar el cuartel listo</h3>' + faltan.map(f => '<button type="button" class="todo" data-act="tab" data-t="' + f[0] + '">⬜ ' + f[1] + ' →</button>').join('') + '</section>';
  h += '<div class="strip"><div class="stat"><b>' + c.users.filter(x => x.activo !== false).length + '</b><small>Integrantes</small></div><div class="stat"><b>' + c.units.length + '</b><small>Unidades</small></div><div class="stat"><b>' + act.length + '</b><small>Activas</small></div><div class="stat"><b>' + c.ops.filter(o => o.estado === 'cerrada').length + '</b><small>Cerradas</small></div></div>';
  return h;
}
ACT['open-op'] = el => go({ view: 'op', opId: el.dataset.id, optab: 'general' });

/* ---------- Historial ---------- */
function tHist() {
  const ops = C().ops.filter(o => !o._follow).sort((a, b) => b.alarmAt - a.alarmAt);
  if (!ops.length) return '<div class="card empty">Todavía no hay operaciones registradas.</div>';
  return '<section class="card"><h2>Historial de operaciones</h2><div class="list">' + ops.map(o =>
    '<div class="row between"><div style="min-width:0"><b>' + esc(o.num) + ' · ' + esc(o.nombre) + '</b><div class="muted"><small>' + esc(o.tipo) + ' · ' + R.fdt(o.alarmAt) + (o.closedAt ? ' · ' + R.fdur(o.closedAt - o.alarmAt) : '') + '</small></div></div>' +
    '<div class="row"><span class="pill ' + (o.estado === 'activa' ? 'bad' : '') + '">' + (o.estado === 'activa' ? 'ACTIVA' : 'Cerrada') + '</span>' + (o.estado === 'cerrada' ? '<button type="button" class="btn sm" data-act="op-pdf" data-id="' + o.id + '">📄 PDF</button>' : '') +
    '<button type="button" class="btn sm" data-act="open-op" data-id="' + o.id + '">Ver</button>' + (isAdmin() && o.estado === 'cerrada' ? '<button type="button" class="icon" data-act="op-del" data-id="' + o.id + '" title="Eliminar del dispositivo">🗑</button>' : '') + '</div></div>').join('') + '</div></section>';
}
ACT['op-pdf'] = el => { const op = C().ops.find(o => o.id === el.dataset.id); if (op) exportPdf(op); };
ACT['op-del'] = async el => { const c = C(), op = c.ops.find(o => o.id === el.dataset.id); if (!op) return; if (await ask('Eliminar operación', 'Se borra <b>' + esc(op.num) + '</b> de este dispositivo (liberás espacio). Descargá antes el PDF si lo necesitás.', 'Eliminar', 'bad')) { c.ops = c.ops.filter(o => o.id !== op.id); save(true); render(); } };
function pdfOpts(op) { let trackImg = null; try { if ((op.equipos || []).some(e => (e.track || []).length || e.last)) trackImg = MAP.drawStatic(mapData(op), 1000, 620).toDataURL('image/jpeg', 0.82); } catch (e) { } return { trackImg }; }
function exportPdf(op, share) {
  try {
    const r = R.build(C(), op, C().users, pdfOpts(op));
    if (share && navigator.canShare) { const file = new File([r.bytes], r.filename, { type: 'application/pdf' }); if (navigator.canShare({ files: [file] })) { navigator.share({ files: [file], title: r.filename }).catch(() => { }); return; } }
    download(r.bytes, r.filename, 'application/pdf'); toast('PDF generado ✔');
  } catch (e) { console.error(e); toast('No se pudo generar el PDF.', 'bad'); }
}

/* ---------- Personal ---------- */
function tPersonal() {
  const users = C().users.slice().sort((a, b) => (b.activo !== false) - (a.activo !== false) || (a.apellido + a.nombre).localeCompare(b.apellido + b.nombre));
  return '<section class="card"><div class="row between"><h2>Personal (' + users.filter(u => u.activo !== false).length + ')</h2>' + (isAdmin() ? '<button type="button" class="btn primary" data-act="user-edit" data-id="">➕ Agregar</button>' : '') + '</div><div class="list">' +
    users.map(u => '<div class="row between"' + (u.activo === false ? ' style="opacity:.5"' : '') + '><div style="min-width:0"><b>' + esc(uFull(u)) + '</b><div class="muted"><small>' + esc(u.jerarquia || '—') + (u.legajo ? ' · Leg. ' + esc(u.legajo) : '') + (u.especialidades ? ' · ' + esc(u.especialidades) : '') + '</small></div></div>' +
      '<div class="row">' + (u.admin ? '<span class="pill info">Admin</span>' : '') + (u.comando ? '<span class="pill ok">🎖 Comando</span>' : '') + (u.activo === false ? '<span class="pill">Baja</span>' : '') + (u.tel ? '<a class="btn sm" href="tel:' + esc(u.tel) + '">📞</a>' : '') + (isAdmin() ? '<button type="button" class="btn sm" data-act="user-edit" data-id="' + u.id + '">Editar</button>' : '') + '</div></div>').join('') + '</div></section>';
}
function userFormHTML(u, adminMode) {
  u = u || {};
  return '<div class="frow">' + F.text('Nombre *', 'nombre', u.nombre) + F.text('Apellido *', 'apellido', u.apellido) + '</div>' +
    '<div class="frow"><div class="field"><label>Jerarquía</label><input type="text" name="jerarquia" list="dl-jer" value="' + esc(u.jerarquia) + '"></div>' + F.text('Legajo', 'legajo', u.legajo) + '</div>' + F.list('dl-jer', JERARQUIAS) +
    '<div class="frow">' + F.text('DNI', 'dni', u.dni, { attrs: ' inputmode="numeric"' }) + F.text('Teléfono', 'tel', u.tel, { type: 'tel' }) + '</div>' +
    '<div class="frow">' + F.text('Email', 'email', u.email, { type: 'email' }) + F.text('Grupo sanguíneo', 'sangre', u.sangre) + '</div>' +
    '<div class="frow">' + F.text('Contacto de emergencia', 'contacto', u.contacto) + F.text('Tel. de emergencia', 'contactoTel', u.contactoTel, { type: 'tel' }) + '</div>' +
    F.text('Especialidades / cursos (SCI, HAZMAT, rescate…)', 'especialidades', u.especialidades) + F.area('Observaciones', 'notas', u.notas, 2) +
    (adminMode ? '<div class="sep"></div>' + F.chk('Administrador del cuartel', 'admin', u.admin) + F.chk('Habilitado para comando de incidentes', 'comando', u.comando) + (u.id ? F.chk('Activo (desmarcar = dar de baja)', 'activo', u.activo !== false) : '') : '');
}
const USER_FIELDS = ['nombre', 'apellido', 'jerarquia', 'legajo', 'dni', 'tel', 'email', 'sangre', 'contacto', 'contactoTel', 'especialidades', 'notas'];
ACT['user-edit'] = el => {
  const id = el.dataset.id, u = id ? uById(id) : null, c = C();
  modal(u ? 'Editar integrante' : 'Agregar integrante', userFormHTML(u, true) + '<div class="sep"></div>' + F.text(u ? 'Nuevo PIN (vacío = no cambiar)' : 'PIN inicial (4 a 6 números) *', 'pin', '', { type: 'password', attrs: ' inputmode="numeric" maxlength="6"' }),
    [{ label: 'Cancelar' }, {
      label: 'Guardar', cls: 'primary', fn: async () => {
        const f = fdata();
        if (!f.nombre || !f.apellido) return merr('Nombre y apellido son obligatorios.'); if ((!u || f.pin) && !validPin(f.pin)) return merr('El PIN debe tener entre 4 y 6 números.');
        if (u && !(c.users.filter(x => x.admin && x.activo !== false && x.id !== u.id).length + (f.admin && f.activo !== false ? 1 : 0))) return merr('Tiene que quedar al menos un administrador activo.');
        if (u && u.id === S.userId && f.activo === false) return merr('No podés dar de baja tu propio usuario.');
        if (!u) c.users.push(await mkUser(f, f.pin));
        else { USER_FIELDS.forEach(k => u[k] = f[k] || ''); u.admin = !!f.admin; u.comando = !!f.comando; u.activo = f.activo !== false; if (f.pin) { u.salt = uid(); u.pin = await hashPin(f.pin, u.salt); } }
        save(true); render(); toast('Guardado ✔');
      }
    }], { focus: true });
};
function tPerfil() {
  const u = U();
  return '<section class="card narrow"><h2>Mi perfil</h2><p class="muted">Cargá o actualizá tus datos. Los ve el administrador del cuartel.</p><form id="pf" autocomplete="off">' + userFormHTML(u, false) +
    '<div class="row"><button type="submit" class="btn primary">Guardar mis datos</button><button type="button" class="btn" data-act="change-pin">🔑 Cambiar mi PIN</button></div></form>' +
    '<p class="muted"><small>Rol: ' + (u.admin ? 'Administrador · ' : '') + (u.comando ? 'Habilitado para comando de incidentes' : 'Sin habilitación de comando') + '</small></p></section>';
}
D.addEventListener('submit', e => {
  if (e.target.id !== 'pf') return; e.preventDefault(); const u = U(), f = {}; new FormData(e.target).forEach((v, k) => f[k] = String(v).trim());
  if (!f.nombre || !f.apellido) return toast('Nombre y apellido son obligatorios.', 'bad');
  USER_FIELDS.forEach(k => u[k] = f[k] || ''); save(true); render(); toast('Perfil actualizado ✔');
});
ACT['change-pin'] = () => modal('Cambiar mi PIN', F.text('PIN actual', 'old', '', { type: 'password', attrs: ' inputmode="numeric" maxlength="6"' }) + F.text('Nuevo PIN (4 a 6 números)', 'n1', '', { type: 'password', attrs: ' inputmode="numeric" maxlength="6"' }) + F.text('Repetir nuevo PIN', 'n2', '', { type: 'password', attrs: ' inputmode="numeric" maxlength="6"' }),
  [{ label: 'Cancelar' }, { label: 'Cambiar PIN', cls: 'primary', fn: async () => { const f = fdata(), u = U(); if ((await hashPin(f.old, u.salt)) !== u.pin) return merr('El PIN actual no es correcto.'); if (!validPin(f.n1)) return merr('El nuevo PIN debe tener entre 4 y 6 números.'); if (f.n1 !== f.n2) return merr('Los PIN nuevos no coinciden.'); u.salt = uid(); u.pin = await hashPin(f.n1, u.salt); save(true); toast('PIN actualizado ✔'); } }], { focus: true });

/* ---------- Unidades ---------- */
function tUnidades() {
  const us = C().units.slice().sort((a, b) => a.nombre.localeCompare(b.nombre));
  return '<section class="card"><div class="row between"><h2>Unidades (' + us.length + ')</h2>' + (isAdmin() ? '<button type="button" class="btn primary" data-act="unit-edit" data-id="">➕ Agregar</button>' : '') + '</div>' +
    (us.length ? '<div class="ugrid">' + us.map(x => '<div class="ucard st"' + (isAdmin() ? ' data-act="unit-edit" data-id="' + x.id + '" role="button" tabindex="0"' : '') + '>' + (x.foto ? '<img alt="" src="' + x.foto + '">' : '<div class="uph2">🚒</div>') + '<div class="un"><b>' + esc(x.nombre) + '</b><small>' + esc([x.tipo, x.patente].filter(Boolean).join(' · ')) + '</small><small>Dotación ' + (x.dotacion || '—') + (x.agua ? ' · ' + esc(x.agua) + ' L' : '') + '</small><span class="pill ' + (x.fuera ? 'bad' : 'ok') + '">' + (x.fuera ? 'Fuera de servicio' : 'Disponible') + '</span></div></div>').join('') + '</div>' : '<div class="empty">No hay unidades cargadas.' + (isAdmin() ? ' Tocá «Agregar» y sumá una foto de cada móvil: así se reconocen en el tablero.' : '') + '</div>') + '</section>';
}
ACT['unit-edit'] = el => {
  const id = el.dataset.id, x = id ? C().units.find(q => q.id === id) : null;
  modal(x ? 'Editar unidad' : 'Agregar unidad', F.text('Nombre / interno *', 'nombre', x && x.nombre, { attrs: ' placeholder="Autobomba 1"' }) +
    '<div class="frow"><div class="field"><label>Tipo</label><input type="text" name="tipo" list="dl-tu" value="' + esc(x && x.tipo) + '"></div>' + F.text('Patente', 'patente', x && x.patente) + '</div>' + F.list('dl-tu', TIPOS_UNIDAD) +
    '<div class="frow">' + F.text('Dotación (personas)', 'dotacion', x && x.dotacion, { type: 'number', attrs: ' min="0" inputmode="numeric"' }) + F.text('Capacidad de agua (litros)', 'agua', x && x.agua, { type: 'number', attrs: ' min="0" inputmode="numeric"' }) + '</div>' +
    '<div class="field"><label>Foto de la unidad</label>' + (x && x.foto ? '<img class="gimg" style="max-height:170px;object-fit:cover;margin-bottom:8px" alt="" src="' + x.foto + '">' : '') + '<input type="file" name="foto" accept="image/*">' + (x && x.foto ? '<label class="check"><input type="checkbox" name="quitarfoto"> Quitar la foto actual</label>' : '') + '</div>' + F.chk('Fuera de servicio', 'fuera', x && x.fuera),
    [{ label: 'Cancelar' }, ...(x ? [{ label: 'Eliminar', cls: 'bad', fn: () => { C().units = C().units.filter(q => q.id !== x.id); save(true); render(); } }] : []), {
      label: 'Guardar', cls: 'primary', fn: async () => {
        const f = fdata(); if (!f.nombre) return merr('Ingresá el nombre de la unidad.');
        let foto = (x && x.foto) || null; const file = $('#mf input[name=foto]').files[0];
        if (file) { try { foto = await fileToJpeg(file, 480, 0.78); } catch (e) { return merr('No se pudo leer la foto.'); } }
        if (f.quitarfoto) foto = null;
        const o = x || { id: uid() }; Object.assign(o, { nombre: f.nombre, tipo: f.tipo, patente: f.patente, dotacion: f.dotacion, agua: f.agua, fuera: !!f.fuera, foto }); if (!x) C().units.push(o); save(true); render();
      }
    }], { focus: true });
};

/* ---------- Ajustes (administrador) ---------- */
function parseContactos(t) { return String(t || '').split(/\n/).map(l => { const p = l.split('|'); return p.length > 1 ? { nombre: p[0].trim(), tel: p.slice(1).join('|').trim() } : null; }).filter(x => x && x.nombre && x.tel); }
function tAjustes() {
  const c = C(), k = c.cloud || {};
  return '<section class="card narrow"><h2>Datos del cuartel</h2><p class="muted">Código del cuartel: <b>' + esc(c.codigo) + '</b></p><form id="cf" autocomplete="off">' +
    F.text('Nombre', 'nombre', c.nombre) + '<div class="frow">' + F.text('Localidad', 'localidad', c.localidad) + F.sel('Provincia', 'provincia', PROVINCIAS, c.provincia) + '</div>' + F.text('Federación / Asociación', 'federacion', c.federacion) +
    '<div class="field"><label>Color</label><div class="swatches" id="sws2">' + COLORES.map(x => '<span class="sw' + (x === c.color ? ' on' : '') + '" data-col="' + x + '" style="background:' + x + '"></span>').join('') + '</div><input type="hidden" name="color" value="' + esc(c.color) + '"></div>' +
    '<div class="field"><label>Logo</label><input type="file" name="logo" accept="image/*"></div>' + (c.logo ? '<label class="check"><input type="checkbox" name="quitarlogo"> Quitar logo actual</label>' : '') +
    '<div class="sep"></div>' + F.area('Teléfonos útiles (uno por línea: Nombre | número)', 'contactos', (c.contactos || []).map(x => x.nombre + ' | ' + x.tel).join('\n'), 5) + '<p class="muted"><small>Por defecto: 100, 911, 107 y 103. Verificá los de tu zona.</small></p>' +
    F.area('Hospitales y destinos de traslado (uno por línea)', 'hospitales', (c.hospitales || []).join('\n'), 3) + F.text('Correo del cuartel para recibir los partes', 'emailParte', c.emailParte, { type: 'email', attrs: ' placeholder="jefe@micuartel.org"' }) +
    '<div class="sep"></div><h3>☁ Respaldo en la nube y equipos en vivo</h3><p class="muted"><small>Conecta la app con un script en la cuenta de Google del cuartel. Sirve para: <b>QR de equipos en vivo</b> (recorrido, reportes y fotos), respaldo automático, seguir la operación desde otro dispositivo y recibir el informe por correo al cerrar. Instrucciones en <b>apps-script/Code.gs</b> (README).</small></p>' +
    F.chk('Activar', 'cloud_on', k.on) + F.text('Dirección del script (URL)', 'cloud_url', k.url, { type: 'url', attrs: ' placeholder="https://script.google.com/macros/s/…/exec" autocapitalize="off"' }) + F.text('Clave del script', 'cloud_token', k.token, { attrs: ' autocapitalize="off" autocomplete="off"' }) + F.chk('Ocultar nombres de las víctimas en lo que se envía', 'cloud_anon', k.anon !== false) +
    '<div class="row"><button type="button" class="btn sm" data-act="cloud-test">🔌 Probar conexión</button><span id="cloudtest" class="muted"></span></div>' +
    '<div class="sep"></div><h3>Valores por defecto de las operaciones</h3><div class="frow">' + F.text('Intervalo de PAR (min)', 'parMin', c.defaults.parMin, { type: 'number', attrs: ' min="1" max="60"' }) + F.text('Alerta de rotación de personal (min)', 'rotMin', c.defaults.rotMin, { type: 'number', attrs: ' min="1" max="120"' }) + '</div>' +
    '<button type="submit" class="btn primary">Guardar cambios</button></form></section>' +
    '<section class="card narrow"><h2>Respaldo del cuartel</h2><p class="muted">Incluye personal, unidades e historial (los PIN van cifrados; incluye la clave de la nube). Usalo para cargar el cuartel en otros dispositivos.</p><div class="row"><button type="button" class="btn" data-act="export-cuartel">📤 Exportar respaldo (.json)</button><button type="button" class="btn bad" data-act="del-cuartel">🗑 Eliminar cuartel de este dispositivo</button></div></section>';
}
D.addEventListener('click', e => { const s = e.target.closest('#sws2 .sw'); if (!s) return; $$('#sws2 .sw').forEach(x => x.classList.remove('on')); s.classList.add('on'); $('#cf input[name=color]').value = s.dataset.col; });
D.addEventListener('submit', async e => {
  if (e.target.id !== 'cf') return; e.preventDefault(); const c = C(), f = {}; new FormData(e.target).forEach((v, k) => f[k] = typeof v === 'string' ? v.trim() : v);
  if (!f.nombre) return toast('El nombre es obligatorio.', 'bad');
  Object.assign(c, { nombre: f.nombre, localidad: f.localidad, provincia: f.provincia, federacion: f.federacion, color: f.color });
  c.contactos = parseContactos(f.contactos); c.hospitales = String(f.hospitales || '').split(/\n/).map(x => x.trim()).filter(Boolean); c.emailParte = f.emailParte || '';
  c.cloud = { on: !!e.target.cloud_on.checked && !!f.cloud_url && !!f.cloud_token, url: f.cloud_url || '', token: f.cloud_token || '', anon: !!e.target.cloud_anon.checked };
  if (e.target.cloud_on.checked && !c.cloud.on) toast('Para activar la nube completá la URL y la clave.', 'bad', 5000);
  c.defaults.parMin = Math.max(1, Math.min(60, +f.parMin || 10)); c.defaults.rotMin = Math.max(1, Math.min(120, +f.rotMin || 20));
  const file = e.target.logo.files[0]; if (file) { try { c.logo = await fileToJpeg(file, 220); } catch (er) { return toast('No se pudo leer la imagen.', 'bad'); } }
  if (e.target.quitarlogo && e.target.quitarlogo.checked) c.logo = null;
  save(true); render(); toast('Cambios guardados ✔');
});
ACT['export-cuartel'] = () => { const c = C(), j = JSON.stringify({ kind: 'sci-cuartel', v: 2, exportedAt: now(), cuartel: Object.assign({}, c, { ops: c.ops.filter(o => !o._follow) }) }); download(new TextEncoder().encode(j), 'Respaldo_SCI_' + fsafe(c.nombre) + '_' + new Date().toISOString().slice(0, 10) + '.json', 'application/json'); toast('Respaldo descargado ✔'); };
ACT['del-cuartel'] = () => { const c = C(); modal('Eliminar cuartel', '<p>Se borrarán de este dispositivo <b>todos los datos</b> de «' + esc(c.nombre) + '». No se puede deshacer. <b>Exportá un respaldo antes.</b></p>' + F.text('Escribí el nombre del cuartel para confirmar', 'conf', ''), [{ label: 'Cancelar' }, { label: 'Eliminar definitivamente', cls: 'bad', fn: () => { if (fdata().conf !== c.nombre) return merr('El nombre no coincide.'); delete db.cuarteles[c.id]; save(true); go({ view: 'home', cuartelId: null, userId: null }); } }]); };
