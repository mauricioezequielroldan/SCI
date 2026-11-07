/* SCI Bomberos – Beta: privacidad, términos y condiciones, aviso de beta y reporte de problemas.
   Un solo archivo que se carga DESPUÉS de main.js. Reemplaza a privacidad.js y terminos.js. */
/* SCI Bomberos – Privacidad (v2.1)
   Se carga DESPUÉS de main.js. Cambia, sin tocar los demás archivos:
   1) Víctimas: sin nombre ni edad exacta. Código (V-01), franja de edad, tipo de lesión de una lista.
   2) Borrado automático del detalle de víctimas 30 días después de cerrar la operación.
   3) Aviso de privacidad que cada integrante acepta al entrar (queda registrado con fecha).
   4) Grupo sanguíneo solo con consentimiento aparte. 5) «Descargar mis datos» en Mi perfil. */
'use strict';
const PRIV_VER = 'p1', PRIV_DIAS = 30;
const FRANJAS = ['Menor (0-17)', 'Adulto (18-64)', 'Mayor (65+)', 'No determinada'];
const LESIONES = ['Quemadura', 'Inhalación de humo', 'Trauma / golpe', 'Fractura', 'Herida cortante', 'Intoxicación', 'Crisis / descompensación', 'Sin lesiones visibles', 'Otra'];
const franjaDe = edad => { const n = parseInt(edad, 10); return isNaN(n) ? (FRANJAS.includes(edad) ? edad : 'No determinada') : n < 18 ? FRANJAS[0] : n < 65 ? FRANJAS[1] : FRANJAS[2]; };

function privMigrate() {
  let cambios = false; const lim = now() - PRIV_DIAS * 86400000;
  Object.values(db.cuarteles).forEach(c => (c.ops || []).forEach(op => {
    (op.victimasReg || []).forEach((v, i) => {
      if (v.priv === PRIV_VER) return;
      v.codigo = v.codigo || 'V-' + pad(i + 1); v.nombre = v.codigo; v.edad = franjaDe(v.edad);
      v.lesion = (v.lesiones && v.lesiones.length) ? v.lesiones.join(', ') : (v.lesion ? 'Otra' : ''); v.priv = PRIV_VER; cambios = true;
    });
    if (op.estado === 'cerrada' && op.closedAt && op.closedAt < lim && (op.victimasReg || []).length) {
      op.victimasPurga = { ts: now(), n: op.victimasReg.length }; op.victimasReg = [];
      op.log.push({ id: uid(), ts: now(), by: 'sistema', text: 'Detalle de víctimas borrado automáticamente (' + PRIV_DIAS + ' días después del cierre). Se conservan los totales.', type: 'info' }); cambios = true;
    }
  }));
  if (cambios) save(true);
}

ACT['vict-edit'] = el => {
  const op = OPx(); if (!isEditor(op)) return; const id = el.dataset.id, x = id ? op.victimasReg.find(v => v.id === id) : null;
  const cod = x ? x.codigo : 'V-' + pad(op.victimasReg.length + 1), les = x ? (x.lesiones || []) : [];
  modal((x ? 'Editar ' : 'Registrar ') + 'víctima ' + esc(cod),
    '<p class="muted"><small>🔒 Por privacidad no se cargan nombre, DNI ni edad exacta: la identificación la hace el hospital. Usá el código <b>' + esc(cod) + '</b> en la radio y en la entrega.</small></p>' +
    '<div class="field"><label>Triage</label><div class="row">' + TRIAGE.map(t => '<label class="btn rad sm tri-' + t[0] + '"><input type="radio" name="triage" value="' + t[0] + '"' + ((x ? x.triage : 'verde') === t[0] ? ' checked' : '') + '> ' + t[1] + '</label>').join('') + '</div></div>' +
    '<div class="frow">' + F.sel('Franja de edad', 'franja', FRANJAS, x ? x.edad : 'No determinada') + F.sel('Sexo (opcional)', 'sexo', ['', 'F', 'M', 'X'], x && x.sexo) + '</div>' +
    '<div class="field"><label>Tipo de lesión</label><div class="pickgrid">' + LESIONES.map(l => '<label class="check"><input type="checkbox" name="les[]" value="' + esc(l) + '"' + (les.includes(l) ? ' checked' : '') + '> ' + esc(l) + '</label>').join('') + '</div></div>' +
    '<div class="frow"><div class="field"><label>Destino</label><input type="text" name="destino" list="dl-hosp" value="' + esc(x && x.destino) + '"></div>' + F.list('dl-hosp', C().hospitales || []) + F.text('Traslado a cargo de', 'transporte', x && x.transporte, { attrs: ' placeholder="Ambulancia, unidad…"' }) + '</div>',
    [{ label: 'Cancelar' }, ...(x ? [{ label: 'Eliminar', cls: 'bad', fn: () => { mut(o => { o.victimasReg = o.victimasReg.filter(v => v.id !== x.id); logEv(o, 'Víctima ' + x.codigo + ' eliminada del registro', 'vic'); }); } }] : []), {
      label: 'Guardar', cls: 'primary', fn: () => {
        const f = fdata(), tri = f.triage || 'verde', l = checked('les[]'), t = TRIAGE.find(q => q[0] === tri)[1];
        const d = { codigo: cod, nombre: cod, edad: f.franja, sexo: f.sexo, triage: tri, lesiones: l, lesion: l.join(', '), destino: f.destino, transporte: f.transporte, priv: PRIV_VER };
        mut(o => { if (x) { Object.assign(o.victimasReg.find(v => v.id === x.id), d); logEv(o, 'Víctima ' + cod + ' actualizada (' + t + ')', 'vic'); } else { o.victimasReg.push(Object.assign({ id: uid(), ts: now() }, d)); logEv(o, 'Víctima ' + cod + ' registrada: ' + t, 'vic'); } });
      }
    }]);
};

function avisoHTML(c) {
  return '<div class="help"><p><b>Responsable de los datos:</b> ' + esc(c.nombre) + (c.emailParte ? ' (' + esc(c.emailParte) + ')' : '') + ', a través de su administrador.</p>' +
    '<p><b>Qué datos:</b> nombre, jerarquía, legajo, contacto, especialidades y la actividad en las operaciones (horarios, ubicación durante el servicio cuando se comparte por QR).</p>' +
    '<p><b>Para qué:</b> organizar al personal, coordinar las intervenciones y elaborar los informes del cuartel. No se usan para otro fin ni se venden.</p>' +
    '<p><b>Dónde se guardan:</b> en los dispositivos del cuartel y, si el cuartel lo activa, en su propia cuenta de nube.</p>' +
    '<p><b>Datos de salud:</b> el grupo sanguíneo es opcional y solo se guarda si das un consentimiento aparte en «Mi perfil».</p>' +
    '<p><b>Tus derechos:</b> podés ver, corregir o pedir que se borren tus datos en cualquier momento (Ley 25.326, arts. 14 a 16). En «Mi perfil» podés descargarlos. La Agencia de Acceso a la Información Pública es el órgano de control.</p></div>';
}
function checkConsent() {
  if (typeof isTeamLink === 'function' && isTeamLink()) return; const u = U(), c = C();
  if (!u || !c || S.view === 'login' || S.view === 'home' || (u.privacidad && u.privacidad.v === PRIV_VER) || !$('#modal').classList.contains('hidden')) return;
  modal('🔒 Aviso de privacidad', avisoHTML(c) + '<label class="check"><input type="checkbox" name="acepto"> Leí el aviso y acepto que el cuartel trate mis datos con esos fines.</label>',
    [{ label: 'No acepto (salir)', fn: () => { ACT['lock'](); } }, { label: 'Aceptar', cls: 'primary', fn: () => { if (!fdata().acepto) return merr('Marcá la casilla para aceptar.'); const x = U(); x.privacidad = { v: PRIV_VER, ts: now() }; save(true); toast('Gracias ✔'); } }], { lock: true });
  const b = $('#modal .box'); if (b) b.classList.add('lockx');
}

const _userFormHTML0 = userFormHTML;
userFormHTML = function (u, adminMode) {
  u = u || {}; let h = _userFormHTML0(u, adminMode);
  const own = !adminMode && u.id === S.userId, ok = !!(u.salud && u.salud.ok);
  const re = /<div class="field"><label>Grupo sanguíneo<\/label><input[^>]*><\/div>/;
  const rep = own ? (ok ? '<div class="field"><label>Grupo sanguíneo (dato de salud)</label><input type="text" name="sangre" value="' + esc(u.sangre) + '"></div>' : '<div class="field"><label>Grupo sanguíneo</label><p class="muted"><small>Dato de salud: solo se guarda con tu consentimiento.</small></p></div>') + '<label class="check"><input type="checkbox" name="saludok"' + (ok ? ' checked' : '') + '> Doy mi consentimiento para que el cuartel guarde mi grupo sanguíneo, para usarlo solo en emergencias.</label>'
    : '<div class="field"><label>Grupo sanguíneo</label><p class="muted"><small>' + (ok ? '✔ Cargado por el integrante con su consentimiento.' : 'Solo lo carga cada integrante, con su consentimiento, desde «Mi perfil».') + '</small></p></div>';
  return h.replace(re, rep);
};
D.addEventListener('submit', e => {
  if (e.target.id !== 'pf') return; const u = U(); if (!u) return; const ok = !!(e.target.saludok && e.target.saludok.checked);
  setTimeout(() => { u.salud = ok ? { ok: true, ts: (u.salud && u.salud.ts) || now() } : null; if (!ok) u.sangre = ''; save(true); render(); }, 0);
}, true);
D.addEventListener('click', e => { const b = e.target.closest('[data-mi]'); if (!b || !$('#mf [name=apellido]') || $('#mf [name=sangre]')) return; const id = (Object.values(db.cuarteles).flatMap(c => c.users).find(x => x.nombre === ($('#mf [name=nombre]') || {}).value && x.apellido === $('#mf [name=apellido]').value) || {}); if (id.sangre && id.salud && id.salud.ok) { const keep = id.sangre; setTimeout(() => { id.sangre = keep; save(true); }, 50); } }, true);

const _tPerfil0 = tPerfil;
tPerfil = function () {
  const u = U(); return _tPerfil0() + '<section class="card narrow"><h3>🔒 Privacidad</h3><p class="muted"><small>Aviso aceptado: ' + (u.privacidad ? R.fdt(u.privacidad.ts) : '—') + '</small></p><div class="row"><button type="button" class="btn sm" data-act="priv-aviso">Ver aviso</button><button type="button" class="btn sm" data-act="priv-mis-datos">⬇ Descargar mis datos</button></div></section>';
};
ACT['priv-aviso'] = () => modal('🔒 Aviso de privacidad', avisoHTML(C()), [{ label: 'Cerrar', cls: 'primary' }]);
ACT['priv-mis-datos'] = () => { const u = Object.assign({}, U()); delete u.pin; delete u.salt; download(new TextEncoder().encode(JSON.stringify({ cuartel: C().nombre, exportado: new Date().toISOString(), datos: u }, null, 2)), 'Mis_datos_' + fsafe(uFull(u)) + '.json', 'application/json'); };

const _tPersonal0 = tPersonal;
tPersonal = function () {
  const us = C().users.filter(u => u.activo !== false), ok = us.filter(u => u.privacidad && u.privacidad.v === PRIV_VER).length;
  return _tPersonal0() + '<p class="muted"><small>🔒 Aviso de privacidad aceptado por ' + ok + ' de ' + us.length + ' integrantes (se pide al entrar).</small></p>';
};

const _render0 = render;
render = function () { _render0(); setTimeout(checkConsent, 0); };


/* SCI Bomberos – Términos y condiciones de uso (v2.2)
   Se carga DESPUÉS de privacidad.js. Pide aceptar los términos:
   1) en cada dispositivo, antes de usar la app; 2) a cada integrante al entrar con su PIN (queda la fecha);
   3) al jefe de equipo que entra por QR. Si cambia TERM_VER, se vuelven a pedir. */
'use strict';
const TERM_VER = 't1', TERM_FECHA = '26/10/2026', TERM_DEV = 'Mauricio Ezequiel Roldán';
const TERM_DKEY = 'sci-terminos', TERM_TKEY = 'sci-terminos-equipo';

function terminosHTML() {
  return '<div class="help terms"><p class="muted"><small>Versión ' + TERM_VER + ' · vigente desde el ' + TERM_FECHA + '</small></p>' +
    '<h4>1. Qué es esta aplicación</h4><p>SCI Bomberos es una <b>herramienta de apoyo</b> gratuita para organizar información durante una intervención. <b>No reemplaza</b> los procedimientos operativos del cuartel, la capacitación en el Sistema de Comando de Incidentes, las comunicaciones por radio ni el criterio profesional de quien comanda.</p>' +
    '<h4>2. Responsabilidad del operador</h4><p>Todas las decisiones operativas, tácticas y de seguridad son <b>exclusiva responsabilidad del comandante del incidente, del cuartel y de quienes usan la aplicación</b>. Cada usuario debe verificar la información antes de actuar sobre ella.</p>' +
    '<h4>3. Comunicaciones críticas</h4><p>MAYDAY, órdenes de evacuación y cualquier aviso de seguridad <b>deben transmitirse siempre por radio y por los canales oficiales</b>. Lo que muestra la aplicación es un complemento y puede llegar tarde o no llegar.</p>' +
    '<h4>4. Sin garantía de funcionamiento</h4><p>La aplicación se entrega «tal cual está». Puede fallar o mostrar datos inexactos por causas como: falta de señal, batería, GPS impreciso o pausado, errores del dispositivo o del navegador, servicios de terceros (Google, OpenStreetMap) o errores del propio software. No se garantiza disponibilidad, exactitud ni continuidad.</p>' +
    '<h4>5. Datos</h4><p>Los datos se guardan en los dispositivos del cuartel y, si el cuartel lo activa, en su propia cuenta de nube. <b>El desarrollador no accede ni administra esos datos.</b> El cuartel, a través de su administrador, es el responsable de los datos personales que carga y de cumplir la Ley 25.326 (ver aviso de privacidad).</p>' +
    '<h4>6. Limitación de responsabilidad</h4><p>En la máxima medida permitida por la ley, el desarrollador (' + esc(TERM_DEV) + ') y quienes colaboran con el proyecto <b>no son responsables</b> por daños, pérdidas, lesiones, decisiones operativas, pérdida de datos ni consecuencias derivadas del uso o de la imposibilidad de uso de la aplicación.</p>' +
    '<h4>7. Cambios</h4><p>Estos términos pueden actualizarse. Si cambian, la aplicación los vuelve a mostrar para aceptarlos.</p>' +
    '<h4>8. Ley aplicable</h4><p>Se rigen por las leyes de la República Argentina.</p></div>';
}
function lockModal() { const b = $('#modal .box'); if (b) b.classList.add('lockx'); }
(function () { const st = D.createElement('style'); st.textContent = '#modal .box.lockx .mclose{display:none}.terms h4{margin:12px 0 2px}.terms p{margin:0 0 4px}.termfoot{text-align:center;margin:14px 0}'; D.head.appendChild(st); })();
D.addEventListener('keydown', e => { if (e.key === 'Escape' && $('#modal .box.lockx')) e.stopImmediatePropagation(); }, true);
const termOk = k => { try { const t = JSON.parse(localStorage.getItem(k) || 'null'); return !!(t && t.v === TERM_VER); } catch (e) { return false; } };
const termSave = k => { try { localStorage.setItem(k, JSON.stringify({ v: TERM_VER, ts: now() })); } catch (e) { } };

function termAsk(titulo, onOk, onNo, labelNo) {
  modal('📜 ' + titulo, terminosHTML() + '<label class="check"><input type="checkbox" name="acepto"> Leí y acepto los términos y condiciones. Entiendo que la aplicación es una herramienta de apoyo y que su uso es responsabilidad del operador.</label>',
    [{ label: labelNo || 'No acepto', fn: () => { onNo(); } }, { label: 'Acepto', cls: 'primary', fn: () => { if (!fdata().acepto) return merr('Marcá la casilla para aceptar.'); onOk(); setTimeout(render, 30); } }], { lock: true, wide: true });
  lockModal();
}
function blockedScreen(msg) { $('#app').innerHTML = '<main class="stack narrow"><section class="card hero"><div class="hero-ico">📜</div><h2>Términos no aceptados</h2><p class="muted">' + msg + '</p><button type="button" class="btn primary" data-act="term-retry">Ver los términos de nuevo</button></section></main>'; }
ACT['term-retry'] = () => location.reload();

/* 1) Dispositivo y 2) integrante */
function checkTerms() {
  if (typeof isTeamLink === 'function' && isTeamLink()) return;
  if (!$('#modal').classList.contains('hidden')) return;
  if (!termOk(TERM_DKEY)) return termAsk('Términos y condiciones de uso', () => termSave(TERM_DKEY), () => blockedScreen('Para usar SCI Bomberos en este dispositivo hay que aceptar los términos y condiciones.'));
  const u = U(); if (!u || S.view === 'login' || S.view === 'home') return;
  if (u.terminos && u.terminos.v === TERM_VER) return;
  termAsk('Términos y condiciones · ' + esc(uFull(u)), () => { const x = U(); if (x) { x.terminos = { v: TERM_VER, ts: now() }; save(true); } }, () => { ACT['lock'](); }, 'No acepto (salir)');
}
const _renderT0 = render;
render = function () { if (!(typeof isTeamLink === 'function' && isTeamLink())) setTimeout(checkTerms, 0); _renderT0(); };

/* 3) Jefe de equipo por QR */
function checkTeamTerms() {
  if (termOk(TERM_TKEY)) return;
  termAsk('Antes de conectarte con el comando', () => termSave(TERM_TKEY), () => { if (typeof tTrack === 'function') try { tTrack(false, true); } catch (e) { } blockedScreen('Para usar la pantalla de equipo hay que aceptar los términos. Coordiná con el comando por radio.'); });
}

/* Accesos visibles: inicio, ayuda, perfil y personal */
ACT['terminos'] = () => modal('📜 Términos y condiciones', terminosHTML(), [{ label: 'Cerrar', cls: 'primary' }], { wide: true });
const _vHomeT0 = vHome;
vHome = function () { return _vHomeT0().replace(/<\/main>$/, '<p class="termfoot"><small class="muted">Herramienta de apoyo: no reemplaza la radio ni los procedimientos del cuartel. </small><button type="button" class="btn sm ghost" data-act="terminos">📜 Términos y condiciones</button></p></main>'); };
const _tPerfilT0 = tPerfil;
tPerfil = function () { const u = U(); return _tPerfilT0() + '<section class="card narrow"><h3>📜 Términos y condiciones</h3><p class="muted"><small>Aceptados: ' + (u.terminos ? R.fdt(u.terminos.ts) + ' (versión ' + esc(u.terminos.v) + ')' : '—') + '</small></p><button type="button" class="btn sm" data-act="terminos">Ver términos</button></section>'; };
const _tPersonalT0 = tPersonal;
tPersonal = function () { const us = C().users.filter(u => u.activo !== false), ok = us.filter(u => u.terminos && u.terminos.v === TERM_VER).length; return _tPersonalT0() + '<p class="muted"><small>📜 Términos y condiciones aceptados por ' + ok + ' de ' + us.length + ' integrantes.</small></p>'; };
const _ayudaT0 = ACT['ayuda'];
ACT['ayuda'] = () => { _ayudaT0(); const h = $('#mf .help'); if (h) h.insertAdjacentHTML('beforeend', '<h4>Importante</h4><p>Es una herramienta de apoyo. MAYDAY y evacuación se transmiten siempre por radio. <button type="button" class="btn sm" data-act="terminos">📜 Ver términos</button></p>'); };

/* Arranque */


/* ===================== Ajustes de la beta ===================== */
const BETA_REPO = 'https://github.com/mauricioezequielroldan/SCI';
/* Víctimas: la tabla ya no muestra "años" (ahora es franja) y la nube conserva el código V-xx */
const _oDatosB = oDatos;
oDatos = function (op, ed) { return _oDatosB(op, ed).replace(/\) años/g, ')'); };
const _cloudBodyB = cloudBody;
cloudBody = function (op, action, withImages) { const b = _cloudBodyB(op, action, withImages); (b.op.victimasReg || []).forEach(v => { if (v.codigo) v.nombre = v.codigo; }); return b; };

/* Aviso "Versión beta" y botón para reportar problemas */
function reportarHTML() { return '<button type="button" class="btn sm ghost" data-act="reportar">🐞 Reportar un problema</button>'; }
ACT['reportar'] = () => {
  const info = 'Versión: ' + APP_VERSION + '-beta\nPantalla: ' + S.view + (S.view === 'op' ? ' / ' + S.optab : '') + '\nDispositivo: ' + navigator.userAgent + '\nFecha: ' + new Date().toLocaleString('es-AR');
  modal('🐞 Reportar un problema', '<p>Contanos qué pasó: qué estabas haciendo, qué esperabas y qué hizo la app. Si podés, sumá una captura de pantalla.</p>' + F.area('¿Qué pasó?', 'txt', '', 4, true) +
    '<p class="muted"><small>Se agregan datos técnicos (versión y tipo de dispositivo). <b>No pongas datos de víctimas ni del personal.</b></small></p>',
    [{ label: 'Cancelar' }, { label: '✉ Por correo', fn: () => { const t = fdata().txt; if (!t) return merr('Describí el problema.'); location.href = 'mailto:?subject=' + encodeURIComponent('[SCI Bomberos beta] Problema') + '&body=' + encodeURIComponent(t + '\n\n---\n' + info); } },
     { label: 'GitHub', cls: 'primary', fn: () => { const t = fdata().txt; if (!t) return merr('Describí el problema.'); window.open(BETA_REPO + '/issues/new?title=' + encodeURIComponent('Problema: ' + t.slice(0, 60)) + '&body=' + encodeURIComponent(t + '\n\n---\n' + info), '_blank', 'noopener'); } }]);
};
const _vHomeB = vHome;
vHome = function () { return _vHomeB().replace('<main class="stack narrow">', '<div class="betabar">🧪 <b>Versión beta</b> — en prueba con cuarteles. Usala como apoyo y avisanos si algo falla. ' + reportarHTML() + '</div><main class="stack narrow">'); };
const _ayudaB = ACT['ayuda'];
ACT['ayuda'] = () => { _ayudaB(); const h = $('#mf .help'); if (h) h.insertAdjacentHTML('beforeend', '<h4>Versión beta</h4><p>Si algo no funciona, ' + reportarHTML() + '</p>'); };
const _tPerfilB = tPerfil;
tPerfil = function () { return _tPerfilB() + '<section class="card narrow"><h3>🧪 Versión beta</h3><p class="muted"><small>Versión ' + APP_VERSION + '-beta. Recordá exportar el respaldo del cuartel seguido (Ajustes) e instalar la app en la pantalla de inicio: en iPhone, si se usa desde Safari sin instalar, los datos pueden borrarse tras días sin uso.</small></p>' + reportarHTML() + '</section>'; };
(function () { const st = D.createElement('style'); st.textContent = '.betabar{background:#5f3dc4;color:#fff;padding:8px 14px;font-size:.9rem;display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:center}.betabar .btn{color:#fff;min-height:34px}'; D.head.appendChild(st); })();

/* Arranque único */
if (typeof isTeamLink === 'function' && isTeamLink()) setTimeout(checkTeamTerms, 300); else { privMigrate(); render(); }
