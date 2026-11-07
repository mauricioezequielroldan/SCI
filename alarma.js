/* SCI Bomberos – Alarma del cuartel y adhesión por QR (v2.6)
   Se carga AL FINAL. No necesita cambiar el script de Google.
   - La alarma sale por ntfy (app gratuita de alertas; en Android puede sonar aunque el celular esté en «No molestar»)
     y, si se configura, por un grupo de Telegram con un bot.
   - Cada bombero se adhiere escaneando el QR del cuartel; el administrador ve las adhesiones y las aprueba.
   - Es un COMPLEMENTO de la sirena, la radio y otros sistemas: nunca el único aviso. */
'use strict';
const NTFY = window.SCI_NTFY || 'https://ntfy.sh', TGAPI = window.SCI_TG || 'https://api.telegram.org';
const ALA = () => { const c = C(); return c && c.alarma && c.alarma.topic ? c.alarma : null; };
const slug = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 12);
function genTopic() { const a = new Uint8Array(8); crypto.getRandomValues(a); return 'sci-' + (slug(C().nombre) || 'cuartel') + '-' + Array.from(a, b => 'abcdefghijkmnopqrstuvwxyz23456789'[b % 33]).join(''); }
const canAlarm = () => { const u = U(); return !!(u && (u.admin || canCommand(u))); };

/* ---------- Envío ---------- */
async function ntfyPub(obj) {
  try { const r = await fetch(NTFY + '/', { method: 'POST', body: JSON.stringify(obj) }); return r.ok; } catch (e) { return false; }
}
const tgKB = aid => ({ inline_keyboard: [[{ text: '🚒 Voy', callback_data: 'r|v|' + aid }, { text: '❌ No puedo', callback_data: 'r|n|' + aid }]] });
async function tgSend(text, markup) {
  const t = (ALA() || {}).tg; if (!t || !t.token || !t.chat) return null;
  const url = TGAPI + '/bot' + t.token + '/sendMessage';
  try { const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ chat_id: t.chat, text }, markup ? { reply_markup: markup } : {})) }); const j = await r.json(); return j.ok ? (j.result && j.result.message_id) || true : false; }
  catch (e) { try { await fetch(url + '?chat_id=' + encodeURIComponent(t.chat) + '&text=' + encodeURIComponent(text), { mode: 'no-cors' }); return true; } catch (e2) { return false; } }
}
async function sendAlarm(d) {
  const a = ALA(), c = C(), prueba = !!d.prueba;
  const title = (prueba ? '🧪 PRUEBA — ' : '🚨 ALARMA — ') + c.nombre;
  const msg = [d.tipo, d.direccion, d.mensaje].filter(Boolean).join('\n') + (prueba ? '\n(Esto es una prueba, no hay salida)' : '');
  const p = GEO.parse(d.coords || ''), click = p && !p.error ? GEO.links(p.lat, p.lon).google : location.href.split('#')[0];
  const r1 = await ntfyPub({ topic: a.topic, title, message: msg, priority: prueba ? 4 : 5, tags: [prueba ? 'test_tube' : 'rotating_light'], click });
  const aid = uid().slice(-8), live = !!(a.tg && a.tg.live), bot = (a.tg && a.tg.bot) || '';
  const tgText = title + '\n' + msg + (p && !p.error ? '\n📍 ' + click : '') + (live ? '\n\nTocá 🚒 Voy o ❌ No puedo.' + (bot ? ' Si vas, compartí tu ubicación en tiempo real con @' + bot + '.' : '') : '');
  const r2 = await tgSend(tgText, live ? tgKB(aid) : null);
  (a.hist = a.hist || []).unshift({ ts: now(), aid, by: S.userId, tipo: d.tipo, direccion: d.direccion, coords: d.coords || '', mensaje: d.mensaje, prueba, ntfy: r1, tg: !!r2, tgMsg: typeof r2 === 'number' ? r2 : 0, tgText: live ? tgText : '' }); a.hist = a.hist.slice(0, 50); save(true);
  if (typeof tvPoll === 'function') setTimeout(() => { render(); tvPoll(true); }, 300);
  return { r1, r2: r2 === null ? null : !!r2 };
}
function resultTxt(r) { return (r.r1 ? '✔ ntfy enviado' : '✖ ntfy no salió (¿sin internet?)') + (r.r2 === null ? '' : r.r2 ? ' · ✔ Telegram enviado' : ' · ✖ Telegram no salió'); }

/* ---------- Disparar ---------- */
ACT['alarma'] = () => {
  if (!ALA()) return toast('Primero el administrador activa la alarma en Ajustes.', 'bad', 5000);
  if (!canAlarm()) return toast('Solo el administrador o quien puede comandar dispara la alarma.', 'bad');
  modal('🚨 Disparar alarma', '<p class="wc"><small>⚠ Complemento: activá también la sirena y avisá por radio.</small></p>' +
    F.sel('Tipo de salida', 'tipo', TIPOS_SINIESTRO, TIPOS_SINIESTRO[0]) + F.text('Dirección / lugar', 'direccion', '', { attrs: ' placeholder="Ruta 12 km 47"' }) + coordField('') + F.text('Mensaje corto (opcional)', 'mensaje', '', { attrs: ' placeholder="Presentarse en el cuartel"' }),
    [{ label: 'Cancelar' }, {
      label: '🚨 DISPARAR', cls: 'bad', fn: async () => {
        const f = fdata(); if (!f.direccion) return merr('Poné la dirección o el lugar.');
        const cc = readCoords(f.coords); if (!cc.ok) return merr('No entiendo las coordenadas.');
        toast('Enviando alarma…', '', 4000); const r = await sendAlarm({ tipo: f.tipo, direccion: f.direccion, coords: cc.text, mensaje: f.mensaje });
        modal(r.r1 || r.r2 ? '✔ Alarma enviada' : '✖ La alarma no salió', '<p>' + resultTxt(r) + '</p>' + (r.r1 || r.r2 ? '' : '<p class="ec"><b>Usá la sirena y la radio.</b></p>'),
          [{ label: 'Cerrar' }, { label: '🚨 Abrir operación', cls: 'primary', fn: () => { setTimeout(() => { ACT['new-op'](); setTimeout(() => { const m = $('#mf'); if (!m) return; m.direccion.value = f.direccion; if (m.coords) { m.coords.value = cc.text; m.coords.dispatchEvent(new Event('change', { bubbles: true })); } const rb = $$('#mf input[name=tipo]').find(x => x.value === f.tipo); if (rb) rb.checked = true; else if (m.tipo2) m.tipo2.value = f.tipo; }, 60); }, 30); } }]);
      }
    }]);
};
ACT['alarma-test'] = async () => { toast('Enviando prueba…', '', 3000); const r = await sendAlarm({ tipo: 'Prueba de alarma', direccion: '', mensaje: '', prueba: true }); toast(resultTxt(r), r.r1 || r.r2 ? '' : 'bad', 6000); };

/* ---------- Inicio: botón grande ---------- */
const _tInicioA = tInicio;
tInicio = function () {
  let h = _tInicioA(); const u = U();
  if (ALA() && canAlarm()) h = '<button type="button" class="btn giant bad" data-act="alarma">🚨 DISPARAR ALARMA</button>' + h;
  else if (!ALA() && u && u.admin) h = h.replace('<div class="strip">', '<section class="card"><button type="button" class="todo" data-act="tab" data-t="ajustes">⬜ Activá la alarma del cuartel y el QR de adhesión (Ajustes) →</button></section><div class="strip">');
  return h;
};

/* ---------- Ajustes ---------- */
const _tAjustesA = tAjustes;
tAjustes = function () {
  const a = ALA(); let h = '<section class="card narrow"><h2>🚨 Alarma del cuartel</h2>';
  if (!a) h += '<p class="muted">Cuando se dispara, les llega a todos los adheridos: por la app <b>ntfy</b> (gratis; en Android suena aunque esté en «No molestar») y, si querés, por un <b>grupo de Telegram</b>.</p><button type="button" class="btn primary" data-act="ala-on">Activar alarma</button>';
  else {
    const pend = (a.altas || []).filter(x => !x.ok && !x.no), ok = (a.altas || []).filter(x => x.ok);
    h += '<p><span class="pill ok">✔ Activa</span> <span class="pill">' + ok.length + ' adheridos</span>' + (pend.length ? ' <span class="pill warn">' + pend.length + ' pendientes</span>' : '') + (a.tg && a.tg.chat ? ' <span class="pill info">Telegram: ' + esc(a.tg.title || 'grupo') + '</span>' : '') + '</p>' +
      '<div class="row"><button type="button" class="btn primary" data-act="ala-qr">📱 QR para adherirse</button><button type="button" class="btn" data-act="alarma-test">🧪 Probar alarma</button><button type="button" class="btn" data-act="ala-altas">👥 Adhesiones</button></div>' +
      '<details><summary>Telegram (opcional)</summary>' + tgSetupHTML(a) + '</details>' +
      '<details><summary>Avanzado</summary><p class="muted"><small>Canal ntfy: <b class="mono">' + esc(a.topic) + '</b>. Quien conoce el canal puede recibir y también enviar avisos. Si se filtra o alguien deja el cuartel, cambialo: todos tienen que volver a escanear el QR.</small></p><button type="button" class="btn sm bad" data-act="ala-rotate">🔄 Cambiar canal</button></details>';
  }
  return h + '</section>' + _tAjustesA();
};
ACT['ala-on'] = () => { const c = C(); c.alarma = { topic: genTopic(), altas: [], hist: [], tg: {} }; save(true); render(); toast('✔ Alarma activada. Mostrá el QR al personal.', '', 5000); };
ACT['ala-rotate'] = async () => { if (!(await ask('Cambiar canal', 'Nadie va a recibir alarmas hasta volver a escanear el QR nuevo.', 'Cambiar', 'bad'))) return; const a = ALA(); a.topic = genTopic(); a.altas = []; a.since = 0; save(true); render(); };

/* ---------- QR de adhesión ---------- */
function joinCode() { const a = ALA(), c = C(); return nb64(JSON.stringify({ c: c.id, n: c.nombre, t: a.topic, g: (a.tg && a.tg.invite) || '', b: (a.tg && a.tg.live && a.tg.bot) || '' })); }
const joinLink = () => location.href.split('#')[0].split('?')[0] + '#unirse=' + joinCode();
ACT['ala-qr'] = () => {
  const link = joinLink(); let svg = ''; try { svg = QR.svg(link); } catch (e) { }
  modal('📱 QR para adherirse a ' + esc(C().nombre), '<div class="qrwrap"><div class="qrbox" style="--ec:#d62828">' + svg + '<b>Alarma del cuartel</b><small>' + esc(C().nombre) + '</small></div><div><ol class="steps sm"><li><b>Escaneá con la cámara</b><span>y tocá el enlace.</span></li><li><b>Poné tu nombre</b><span>y aceptá los términos.</span></li><li><b>Instalá ntfy y suscribite</b><span>la página te guía (1 minuto).</span></li><li><b>Hacé la prueba</b><span>con el celular en silencio.</span></li></ol><p class="muted"><small>Imprimilo y pegalo en el cuartel. Quien tenga el QR puede recibir las alarmas: no lo publiques.</small></p></div></div>',
    [{ label: 'Cerrar' }, { label: '📋 Copiar enlace', fn: () => { copyText(link); return false; } }, { label: '🟢 WhatsApp', fn: () => { window.open('https://wa.me/?text=' + encodeURIComponent('Alarma de ' + C().nombre + ' — abrí este enlace para adherirte: ' + link), '_blank', 'noopener'); return false; } }, { label: '🖨 Imprimir', cls: 'primary', fn: () => { printQR(svg, { nombre: 'Alarma — ' + C().nombre, tarea: 'Escaneá para recibir las alarmas del cuartel' }, { num: '', tipo: '' }); return false; } }], { wide: true });
};

/* ---------- Adhesiones (llegan por ntfy al canal «-altas») ---------- */
async function pollAltas() {
  const a = ALA(); if (!a) return 0; let n = 0;
  const r = await fetch(NTFY + '/' + a.topic + '-altas/json?poll=1&since=' + (a.since || 'all')); const txt = await r.text();
  txt.split('\n').filter(Boolean).forEach(l => { let m; try { m = JSON.parse(l); } catch (e) { return; } if (m.event !== 'message') return; a.since = m.id; let j; try { j = JSON.parse(m.message); } catch (e) { return; } if (!j.id || (a.altas || []).some(x => x.id === j.id)) return; (a.altas = a.altas || []).push({ id: String(j.id).slice(0, 40), nombre: String(j.nombre || '').slice(0, 80), legajo: String(j.legajo || '').slice(0, 20), tel: String(j.tel || '').slice(0, 30), ts: Number(j.ts) || m.time * 1000, dev: String(j.dev || '').slice(0, 40) }); n++; });
  save(true); return n;
}
ACT['ala-altas'] = async () => {
  try { await pollAltas(); } catch (e) { toast('No se pudo consultar (¿sin internet?). Muestro lo guardado.', 'bad', 4000); }
  const L = (ALA().altas || []).slice().sort((x, y) => y.ts - x.ts);
  modal('👥 Adhesiones a la alarma', '<p class="muted"><small>Las solicitudes nuevas quedan disponibles 12 horas: revisalas seguido. Aprobar deja registro del consentimiento.</small></p>' +
    (L.length ? '<div class="list">' + L.map(x => '<div class="row between"><div><b>' + esc(x.nombre) + '</b>' + (x.legajo ? ' <small class="muted">Leg. ' + esc(x.legajo) + '</small>' : '') + '<br><small class="muted">' + R.fdt(x.ts) + ' · ' + esc(x.dev) + '</small></div><div class="row">' + (x.ok ? '<span class="pill ok">Aprobado</span>' : x.no ? '<span class="pill">Rechazado</span>' : '<button type="button" class="btn sm ok" data-act="ala-ok" data-id="' + esc(x.id) + '">✔ Aprobar</button><button type="button" class="btn sm" data-act="ala-no" data-id="' + esc(x.id) + '">✖</button>') + '</div></div>').join('') + '</div><p class="muted"><small>Rechazar no le corta la alarma (el canal es compartido). Para sacar a alguien, cambiá el canal en Ajustes → Avanzado.</small></p>' : '<div class="empty">Todavía no hay adhesiones.</div>'),
    [{ label: 'Cerrar', cls: 'primary' }]);
};
ACT['ala-ok'] = el => { const x = (ALA().altas || []).find(q => q.id === el.dataset.id); if (x) { x.ok = now(); save(true); if (typeof consentSync === 'function') consentSync(); } ACT['ala-altas'](); };
ACT['ala-no'] = el => { const x = (ALA().altas || []).find(q => q.id === el.dataset.id); if (x) { x.no = now(); save(true); } ACT['ala-altas'](); };
if (typeof consentRecords === 'function') { const _cr = consentRecords; consentRecords = function () { const out = _cr(), c = C(), a = ALA(); if (a) (a.altas || []).filter(x => x.ok).forEach(x => out.push({ id: c.id + '|alta|' + x.id, ts: x.ts, cuartel: c.nombre, cuartelId: c.id, nombre: x.nombre, legajo: x.legajo, tipo: 'adhesion-alarma', version: TERM_VER, dispositivo: x.dev })); return out; }; }

/* ---------- Telegram ---------- */
function tgSetupHTML(a) {
  const t = a.tg || {};
  return '<p class="muted"><small>Telegram es una app de mensajes como WhatsApp. La diferencia: permite un <b>«bot»</b> (un usuario automático) que publica la alarma en el grupo del cuartel. WhatsApp no lo permite gratis.</small></p>' +
    '<ol class="wizsteps"><li>En Telegram creá un <b>grupo</b> del cuartel y sumá al personal.</li><li>Buscá <b>@BotFather</b>, escribile <b>/newbot</b>, poné un nombre (ej. «Alarma Bomberos VD») y un usuario que termine en <b>bot</b>. Te da un <b>token</b>: copialo.</li><li>Agregá ese bot al grupo y escribí en el grupo <b>/start</b>.</li><li>Pegá el token acá y tocá <b>Detectar grupo</b>.</li></ol>' +
    '<div class="row nowrap"><input type="text" id="tgtok" value="' + esc(t.token || '') + '" placeholder="123456:ABC…" autocomplete="off" spellcheck="false"><button type="button" class="btn sm" data-act="tg-detect">Detectar grupo</button></div><div id="tgres" class="coordfb">' + (t.chat ? '<span class="okc">✔ Grupo: ' + esc(t.title || t.chat) + '</span>' : '') + '</div>' +
    '<div class="row nowrap"><input type="url" id="tginv" value="' + esc(t.invite || '') + '" placeholder="Enlace de invitación al grupo (opcional) https://t.me/+…"><button type="button" class="btn sm" data-act="tg-inv">Guardar</button></div><small class="muted">El enlace de invitación aparece en el QR de adhesión para que se sumen al grupo.</small>' + (typeof tvSetupHTML === 'function' && t.chat ? tvSetupHTML(a) : '');
}
ACT['tg-detect'] = async () => {
  const tok = ($('#tgtok') || {}).value.trim(), out = $('#tgres'); if (!/^\d+:[\w-]{20,}$/.test(tok)) { out.innerHTML = '<span class="ec">Ese token no parece válido. Copialo completo de @BotFather.</span>'; return; }
  out.textContent = 'Buscando…';
  try {
    const j = await (await fetch(TGAPI + '/bot' + tok + '/getUpdates')).json(); if (!j.ok) throw new Error(j.description || 'error');
    const chats = {}; (j.result || []).forEach(u => { const m = u.message || u.my_chat_member || u.channel_post; const ch = m && m.chat; if (ch && /group|channel/.test(ch.type)) chats[ch.id] = ch.title; });
    const ids = Object.keys(chats); if (!ids.length) { out.innerHTML = '<span class="ec">No encontré el grupo. Fijate que el bot esté en el grupo y escribí <b>/start</b> en el grupo; después probá de nuevo.</span>'; return; }
    let bot = ''; try { const me = await (await fetch(TGAPI + '/bot' + tok + '/getMe')).json(); bot = (me.ok && me.result.username) || ''; } catch (e) { }
    const a = ALA(); a.tg = Object.assign({}, a.tg, { token: tok, chat: ids[ids.length - 1], title: chats[ids[ids.length - 1]], bot }); save(true);
    out.innerHTML = '<span class="okc">✔ Grupo: ' + esc(a.tg.title) + '</span>'; const r = await tgSend('✅ SCI Bomberos conectado. Por acá van a llegar las alarmas de ' + C().nombre + '.'); if (!r) out.innerHTML += ' <span class="wc">(no pude mandar el mensaje de prueba)</span>';
  } catch (e) { out.innerHTML = '<span class="ec">No pude consultar a Telegram (' + esc(e.message || 'sin conexión') + '). Revisá el token y la conexión.</span>'; }
};
ACT['tg-inv'] = () => { const v = ($('#tginv') || {}).value.trim(); if (v && !/^https:\/\/t\.me\//.test(v)) return toast('El enlace tiene que empezar con https://t.me/', 'bad'); const a = ALA(); a.tg = Object.assign({}, a.tg, { invite: v }); save(true); toast('Guardado ✔'); };

/* ---------- Página de adhesión (#unirse=…) ---------- */
let JOIN = null;
(function () { const m = location.hash.match(/^#unirse=([A-Za-z0-9_-]+)/); if (!m) return; try { JOIN = JSON.parse(nunb64(m[1])); if (!JOIN.t || !/^[\w-]{6,64}$/.test(JOIN.t)) JOIN = null; } catch (e) { JOIN = null; } })();
const joinKey = () => 'sci-alarma-' + JOIN.t;
function joinView() {
  const st = JSON.parse(localStorage.getItem(joinKey()) || 'null'), host = NTFY.replace(/^https?:\/\//, '');
  let h = '<header class="top"><div class="brand"><div class="logo">🚨</div><div><b>Alarma del cuartel</b><small>' + esc(JOIN.n) + '</small></div></div></header><main class="stack narrow">';
  if (!st) return h + '<section class="card"><h2>Adherite a la alarma</h2><p>Vas a recibir en el celular las alarmas de <b>' + esc(JOIN.n) + '</b>.</p><form id="joinf" autocomplete="off">' +
    '<div class="field"><label>Nombre y apellido *</label><input type="text" name="nombre"></div><div class="frow"><div class="field"><label>Legajo</label><input type="text" name="legajo"></div><div class="field"><label>Teléfono (opcional)</label><input type="tel" name="tel"></div></div>' +
    '<label class="check"><input type="checkbox" name="acepto"> Entiendo que es un <b>complemento</b> de la sirena y la radio, que puede no llegar, y acepto los <a href="#" data-act="terminos">términos</a> y que el cuartel registre mi adhesión.</label><div class="err" id="joinerr"></div><button type="submit" class="btn primary block big">Adherirme</button></form></section></main>';
  return h + '<section class="card"><p><span class="pill ok">✔ Adherido como ' + esc(st.nombre) + '</span></p><h3>1 · Instalá ntfy</h3><div class="grid g2"><a class="btn block" target="_blank" rel="noopener" href="https://play.google.com/store/apps/details?id=io.heckel.ntfy">Android (Play Store)</a><a class="btn block" target="_blank" rel="noopener" href="https://apps.apple.com/app/ntfy/id1625396347">iPhone (App Store)</a></div>' +
    '<h3>2 · Suscribite al canal del cuartel</h3><a class="btn primary block big" href="ntfy://' + host + '/' + esc(JOIN.t) + '">🔔 Suscribirme (abre ntfy)</a><p class="muted"><small>Si no se abre: en ntfy tocá <b>＋</b> y escribí el canal:</small></p><div class="row nowrap"><input type="text" readonly value="' + esc(JOIN.t) + '" class="mono"><button type="button" class="btn sm" data-act="copy" data-t="' + esc(JOIN.t) + '">📋</button></div>' +
    '<h3>3 · Que suene aunque esté en silencio (Android)</h3><ol class="wizsteps"><li>En ntfy, entrá al canal → ⋮ → <b>Configuración de notificaciones</b>.</li><li>Elegí la categoría <b>prioridad máxima</b> (Max priority) → activá <b>Anular «No molestar»</b> y elegí un sonido fuerte.</li><li>En Ajustes del celular → Batería → ntfy → <b>Sin restricciones</b>.</li></ol><p class="muted"><small>En iPhone suena con el volumen normal: no rompe el modo silencio.</small></p>' +
    (JOIN.g ? '<h3>4 · Grupo de Telegram (respaldo)</h3><a class="btn block" target="_blank" rel="noopener" href="' + esc(JOIN.g) + '">Unirme al grupo de Telegram</a>' : '') +
    (JOIN.b ? '<h3>' + (JOIN.g ? '5' : '4') + ' · Que el comando te vea llegar</h3><a class="btn primary block" target="_blank" rel="noopener" href="https://t.me/' + esc(JOIN.b) + '">🛰 Abrir el bot del cuartel y tocar «Iniciar»</a><ol class="wizsteps"><li>Cuando llegue una alarma, tocá <b>🚒 Voy</b> o <b>❌ No puedo</b> en el mensaje de Telegram.</li><li>Si vas: en el chat con el bot tocá <b>📎 → Ubicación → Compartir ubicación en tiempo real</b> (8 horas).</li><li>Funciona aunque bloquees el celular. Al terminar, tocá <b>Dejar de compartir</b>.</li></ol><p class="muted"><small>Tu ubicación la ve solo el comando del cuartel, y solo mientras la compartís.</small></p>' : '') +
    '<h3>' + (4 + (JOIN.g ? 1 : 0) + (JOIN.b ? 1 : 0)) + ' · Probá</h3><p class="muted"><small>Pedile al administrador una <b>alarma de prueba</b> con tu celular boca abajo, en silencio y en otra habitación.</small></p></section></main>';
}
D.addEventListener('submit', async e => {
  if (e.target.id !== 'joinf') return; e.preventDefault(); const f = e.target, err = $('#joinerr'), nombre = f.nombre.value.trim();
  if (!nombre) return err.textContent = 'Poné tu nombre.'; if (!f.acepto.checked) return err.textContent = 'Marcá la casilla para continuar.';
  const rec = { id: uid(), nombre, legajo: f.legajo.value.trim(), tel: f.tel.value.trim(), ts: now(), dev: (typeof devName === 'function' ? devName() : '') };
  err.textContent = 'Enviando…';
  const ok = await ntfyPub({ topic: JOIN.t + '-altas', message: JSON.stringify(rec), priority: 2, title: 'Adhesión: ' + nombre });
  if (!ok) return err.textContent = 'No se pudo enviar (¿sin internet?). Probá de nuevo.';
  localStorage.setItem(joinKey(), JSON.stringify(rec)); render(); window.scrollTo(0, 0);
});
const _renderA = render;
render = function () {
  if (JOIN) { applyAccent(); $('#app').innerHTML = joinView(); if (typeof checkTerms === 'function') setTimeout(checkTerms, 0); return; }
  _renderA();
};
render();
