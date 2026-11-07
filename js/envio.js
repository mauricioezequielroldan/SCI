/* SCI Bomberos – traspaso de comando, envío (correo / WhatsApp / archivos), recuperar, respaldo en la nube y seguimiento en vivo */
'use strict';
const PKG_KIND = 'sci-operacion';
const CLOUD_DELAY = Number(localStorage.getItem('sci-cloud-delay')) || 15000;
const lastTs = op => (op.log || []).reduce((m, l) => Math.max(m, l.ts || 0), op.alarmAt || 0);
function b64(bytes) { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s); }
function hash(str) { let h = 5381; for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0; return h.toString(36) + ':' + str.length; }
const cleanOp = op => { const o = JSON.parse(JSON.stringify(op)); delete o._follow; delete o._pollTs; delete o.cloud; return o; };
function opPackage(op) { return JSON.stringify({ kind: PKG_KIND, v: 2, exportedAt: now(), cuartelId: C().id, cuartelNombre: C().nombre, op: cleanOp(op) }); }
const pkgName = op => 'Traspaso_' + fsafe(op.num) + '_' + fsafe(C().nombre) + '.sci.json';
function dlPdf(op) { try { const r = R.build(C(), op, C().users, pdfOpts(op)); download(r.bytes, r.filename, 'application/pdf'); toast('PDF descargado ✔'); } catch (e) { console.error(e); toast('No se pudo generar el PDF.', 'bad'); } }
function dlPkg(op) { download(new TextEncoder().encode(opPackage(op)), pkgName(op), 'application/json'); toast('Archivo de traspaso descargado ✔'); }
async function shareFiles(op) {
  if (!navigator.share || !navigator.canShare) return false; let pdf, pk;
  try { const r = R.build(C(), op, C().users, pdfOpts(op)); pdf = new File([r.bytes], r.filename, { type: 'application/pdf' }); pk = new File([opPackage(op)], pkgName(op), { type: 'application/json' }); } catch (e) { return false; }
  const meta = { title: C().nombre + ' — Operación ' + op.num, text: 'Operación ' + op.num + ' — ' + op.tipo + ' en ' + (op.direccion || '') };
  for (const [files, res] of [[[pdf, pk], 'both'], [[pdf], 'pdf']]) { try { if (navigator.canShare({ files })) { await navigator.share(Object.assign({ files }, meta)); return res; } } catch (e) { if (e && e.name === 'AbortError') return res; } }
  return false;
}
function mailtoFor(op) {
  const c = C(), subj = '[' + c.nombre + '] ' + (op.estado === 'cerrada' ? 'Operación cerrada ' : 'Parte de operación ') + op.num + ' — ' + op.tipo, lines = sitText(op).split('\n'); let cut = false;
  const mk = () => 'mailto:' + (c.emailParte || '') + '?subject=' + encodeURIComponent(subj) + '&body=' + encodeURIComponent(lines.join('\n') + (cut ? '\n\n(Parte resumido. El informe completo está en el PDF.)' : ''));
  while (mk().length > 1800 && lines.length > 6) { lines.splice(Math.floor(lines.length / 2), 1); cut = true; } return mk();
}

ACT['envio'] = () => {
  const op = OPx(); if (!op) return; const c = C(), act = op.estado === 'activa' && !op._follow, canTr = act && (isIC(op) || isAdmin()), cfg = cloudCfg(), cmds = c.users.filter(x => canCommand(x) && x.id !== op.editors[0]);
  let h = '<p class="muted"><small>Los datos están en este dispositivo. Estas opciones los sacan de acá, para que no se pierdan si el comando se tiene que ir o el equipo falla.</small></p>';
  h += '<h4>👥 Traspasar el comando a otro dispositivo</h4>' + (canTr ? (cmds.length ? '<div class="frow">' + F.sel('Nuevo comandante', 'ic', cmds.map(x => [x.id, uName(x.id)]), cmds[0].id) + F.sel('Operador (opcional)', 'op2', [['', 'Ninguno'], ...cmds.map(x => [x.id, uName(x.id)])], '') + '</div><p class="muted"><small>Tu copia pasa a solo lectura (para que no haya dos versiones) y se genera el archivo para la otra persona' + (cfg ? '; también queda en la nube' : '') + '. Los equipos con QR siguen conectados.</small></p>' : '<p class="muted"><small>No hay otros integrantes habilitados para comando.</small></p>') : '<p class="muted"><small>' + (act ? 'Solo el comandante o un administrador pueden traspasar.' : 'No disponible.') + '</small></p>');
  h += '<h4>📨 Enviar el ' + (op.estado === 'activa' ? 'parte' : 'informe') + '</h4><div class="grid g2"><a class="btn block" href="' + esc(mailtoFor(op)) + '">✉ Correo (resumen)</a><button type="button" class="btn block" data-act="env-share">📎 Compartir PDF + archivo</button><button type="button" class="btn block" data-act="share-sit">🟢 WhatsApp / texto</button><button type="button" class="btn block" data-act="env-pdf">⬇ PDF' + (op.estado === 'activa' ? ' parcial' : '') + '</button><button type="button" class="btn block" data-act="env-pkg">⬇ Archivo de traspaso</button></div>';
  h += '<h4>☁ Respaldo en la nube</h4>' + (cfg ? '<div class="row">' + cloudPill(op) + (act ? '<button type="button" class="btn sm" data-act="env-cloud">Enviar respaldo ahora</button>' : '') + '</div><p class="muted"><small>Se envía solo cada pocos segundos mientras hay cambios y conexión' + (cfg.anon !== false ? '; los nombres de víctimas se ocultan' : '') + '. Al cerrar llega el informe por correo.</small></p>' : '<p class="muted"><small>Sin configurar (Ajustes del cuartel).</small></p>');
  modal('📤 Enviar, respaldar y traspasar', h, [{ label: 'Cerrar' }, ...(canTr && cmds.length ? [{
    label: 'Traspasar y enviar archivo', cls: 'primary', fn: async () => {
      const f = fdata(); if (!f.ic) return merr('Elegí quién recibe el comando.'); if (f.ic === f.op2) return merr('El comandante y el operador deben ser personas distintas.');
      if (!mutCmd(o => { o.editors = [f.ic].concat(f.op2 ? [f.op2] : []); logEv(o, 'TRASPASO de comando: ' + uName(f.ic) + (f.op2 ? ' · Operador: ' + uName(f.op2) : ''), 'cmd'); })) return false;
      const o2 = OPx(); if (cloudCfg()) cloudPush(o2.id, 'sync', true); const sh = await shareFiles(o2); if (sh !== 'both') dlPkg(o2);
      modal('✔ Comando traspasado', '<p><b>' + esc(uName(f.ic)) + '</b> es ahora el comandante. Tu copia quedó en <b>solo lectura</b>.</p><ol><li>Abre la app en su dispositivo (con el cuartel cargado) y entra con su PIN.</li><li>En Inicio toca <b>«Recuperar una operación»</b>.</li><li>Elige el archivo de traspaso' + (cloudCfg() ? ' o la busca en la nube' : '') + '.</li></ol>', [{ label: 'Cerrar', cls: 'primary' }, { label: '📎 Volver a enviar', fn: async () => { if ((await shareFiles(o2)) !== 'both') dlPkg(o2); return false; } }]);
      return false;
    }
  }] : [])]);
};
ACT['env-share'] = async () => { const op = OPx(), r = await shareFiles(op); if (!r) { dlPdf(op); dlPkg(op); toast('Este dispositivo no permite compartir archivos: se descargaron para adjuntarlos a mano.', '', 6000); } else if (r === 'pdf') { dlPkg(op); toast('Se compartió el PDF; el archivo de traspaso quedó descargado.', '', 5000); } };
ACT['env-pdf'] = () => dlPdf(OPx());
ACT['env-pkg'] = () => dlPkg(OPx());
ACT['env-cloud'] = async () => { const op = OPx(); toast('☁ Enviando…', '', 2500); cloudToast(await cloudPush(op.id, op.estado === 'cerrada' ? 'cerrar' : 'sync', true)); };

/* ---------- Recuperar una operación ---------- */
ACT['recuperar'] = () => {
  const cfg = cloudCfg();
  modal('📥 Recuperar una operación', '<p class="muted"><small>Para continuar una operación que empezó otra persona o recuperarla si se perdió el dispositivo. Este equipo tiene que tener cargado el mismo cuartel.</small></p><div class="field"><label>Desde un archivo de traspaso (.json)</label><input type="file" id="pkgfile" accept=".json,application/json"></div>' +
    '<h4>☁ Desde la nube</h4>' + (cfg ? '<button type="button" class="btn block" data-act="cloud-list" data-mode="get">Buscar operaciones respaldadas</button><div id="cloudlist" class="list"></div>' : '<p class="muted"><small>La nube no está configurada en este cuartel (Ajustes).</small></p>'), [{ label: 'Cerrar' }]);
};
async function importPackage(txt) {
  let j; try { j = JSON.parse(txt); } catch (e) { return { err: 'No se pudo leer el archivo.' }; }
  if (!j || j.kind !== PKG_KIND || !j.op || !j.op.id || !Array.isArray(j.op.log)) return { err: 'Ese archivo no es un traspaso de SCI Bomberos.' };
  const c = db.cuarteles[j.cuartelId];
  if (!c) return { err: 'Este dispositivo no tiene el cuartel «' + (j.cuartelNombre || '?') + '». Primero importá el respaldo del cuartel (pantalla inicial) y repetí.' };
  if (c.id !== S.cuartelId) return { err: 'La operación es del cuartel «' + c.nombre + '». Entrá a ese cuartel para recuperarla.' };
  const op = j.op, i = c.ops.findIndex(o => o.id === op.id);
  if (i >= 0 && !c.ops[i]._follow) { const a = lastTs(c.ops[i]), b = lastTs(op); if (!(await ask('Ya existe en este dispositivo', 'Hay una copia de <b>' + esc(op.num) + '</b> con eventos hasta las ' + hhmm(a).slice(0, 5) + '. La recuperada llega hasta las ' + hhmm(b).slice(0, 5) + '.' + (b < a ? ' <b>La recuperada es más vieja que tu copia.</b>' : '') + ' ¿Reemplazar tu copia?', 'Reemplazar', 'bad'))) return { cancel: true }; c.ops[i] = op; }
  else if (i >= 0) c.ops[i] = op; else c.ops.push(op);
  c.opSeq = Math.max(c.opSeq || 0, parseInt(String(op.num).split('-')[1], 10) || 0); migrate(db); save(true);
  return { ok: true, op };
}
function afterImport(r) {
  if (r.err) { if ($('#merr')) merr(r.err); else toast(r.err, 'bad', 7000); return; } if (r.cancel) return;
  closeModal(); go({ view: 'op', opId: r.op.id, optab: 'general' }); teamsPush(r.op);
  toast(isEditor(r.op) ? 'Operación recuperada ✔ Tenés acceso de edición.' : 'Operación recuperada en solo lectura. Para editar, el comando debe asignarte.', '', 6000);
}
D.addEventListener('change', async e => { if (e.target.id !== 'pkgfile' || !e.target.files[0]) return; const txt = await e.target.files[0].text(); e.target.value = ''; afterImport(await importPackage(txt)); });
ACT['cloud-list'] = async el => {
  const box = $('#cloudlist'), mode = el.dataset.mode; if (!box) return; box.innerHTML = '<p class="muted">Buscando…</p>';
  try {
    const j = await cloudGet({ action: 'list', cuartel: C().id }); if (!j || !j.ok) throw new Error((j && j.error) || 'Respuesta inválida');
    const ops = j.ops.filter(o => mode !== 'follow' || o.estado === 'activa').sort((a, b) => b.updatedAt - a.updatedAt);
    box.innerHTML = ops.length ? ops.map(o => '<div class="row between"><div><b>' + esc(o.num) + ' · ' + esc(o.nombre) + '</b><br><small class="muted">' + esc(o.estado) + ' · actualizada ' + hhmm(o.updatedAt).slice(0, 5) + '</small></div><button type="button" class="btn sm primary" data-act="' + (mode === 'follow' ? 'follow' : 'cloud-get') + '" data-id="' + esc(o.id) + '">' + (mode === 'follow' ? '📡 Seguir' : 'Recuperar') + '</button></div>').join('') : '<p class="muted">No hay operaciones ' + (mode === 'follow' ? 'activas ' : '') + 'respaldadas de este cuartel.</p>';
  } catch (err) { box.innerHTML = '<p class="err">No se pudo consultar la nube: ' + esc(err.message || 'sin conexión') + '</p>'; }
};
ACT['cloud-get'] = async el => { try { const j = await cloudGet({ action: 'get', cuartel: C().id, op: el.dataset.id }); if (!j || !j.ok || !j.op) throw new Error((j && j.error) || 'Respuesta inválida'); afterImport(await importPackage(JSON.stringify({ kind: PKG_KIND, cuartelId: C().id, cuartelNombre: C().nombre, op: j.op }))); } catch (err) { toast('No se pudo recuperar: ' + (err.message || 'sin conexión'), 'bad', 6000); } };

/* ---------- Seguir en vivo (solo lectura) ---------- */
ACT['seguir'] = () => {
  if (!cloudCfg()) return modal('📡 Seguir una operación en vivo', '<p>Sirve para que el jefe de cuartel, la central u otra autoridad vean el tablero de una operación que lleva otro dispositivo, actualizado cada 20 segundos.</p><p class="muted">Necesita el <b>respaldo en la nube</b> activado en Ajustes del cuartel (en los dos dispositivos).</p>', [{ label: 'Entendido', cls: 'primary' }]);
  modal('📡 Seguir una operación en vivo', '<p class="muted"><small>Ves el tablero en solo lectura y se actualiza solo cada 20 segundos.</small></p><button type="button" class="btn block" data-act="cloud-list" data-mode="follow">Buscar operaciones activas</button><div id="cloudlist" class="list"></div>', [{ label: 'Cerrar' }]);
};
async function fetchFollow(id) {
  const j = await cloudGet({ action: 'get', cuartel: C().id, op: id }); if (!j || !j.ok || !j.op) throw new Error((j && j.error) || 'Respuesta inválida');
  const c = C(), i = c.ops.findIndex(o => o.id === id); if (i >= 0 && !c.ops[i]._follow) throw new Error('Esa operación ya está en este dispositivo (sos quien la lleva o la recuperaste).');
  const op = migrate({ cuarteles: { x: { ops: [j.op] } } }).cuarteles.x.ops[0]; op._follow = true; op._pollTs = now();
  if (i >= 0) c.ops[i] = op; else c.ops.push(op); save(true); return op;
}
ACT['follow'] = async el => { try { const op = await fetchFollow(el.dataset.id); closeModal(); go({ view: 'op', opId: op.id, optab: 'general' }); toast('📡 Siguiendo en vivo (solo lectura)', '', 4000); } catch (err) { toast(err.message || 'No se pudo seguir.', 'bad', 6000); } };
ACT['unfollow'] = () => { const c = C(), op = OPx(); if (op && op._follow) { c.ops = c.ops.filter(o => o.id !== op.id); save(true); } go({ view: 'cuartel', opId: null, tab: 'inicio' }); };
let followBusy = false;
async function pollFollow() {
  const op = OPx(); if (followBusy || !op || !op._follow || !navigator.onLine) return; followBusy = true;
  try { await fetchFollow(op.id); softRender(); } catch (e) { const fi = $('[data-followinfo]'); if (fi) fi.textContent = '⚠ ' + (e.message || 'sin conexión'); } finally { followBusy = false; }
}

/* ---------- Nube: configuración y envíos ---------- */
const cloudCfg = () => { const c = C(); return c && c.cloud && c.cloud.on && c.cloud.url && c.cloud.token ? c.cloud : null; };
const cloudSig = {};
let cloudTimer = null;
function cloudPill(op) {
  if (!cloudCfg() || !op || op._follow) return ''; const k = op.cloud;
  if (!k || !k.ts) return '<span class="pill info" data-cloudpill>☁ pendiente</span>';
  if (k.ok === false) return '<span class="pill warn" data-cloudpill title="' + esc(k.error || '') + '">☁ sin respaldar · ' + esc(k.error || 'error') + '</span>';
  return '<span class="pill ' + (k.confirmed ? 'ok' : 'info') + '" data-cloudpill>☁ ' + (k.confirmed ? 'respaldado ' : 'enviado ') + hhmm(k.ts).slice(0, 5) + '</span>';
}
function updatePills() { const op = OPx(); $$('[data-cloudpill]').forEach(e => { e.outerHTML = cloudPill(op); }); }
function cloudHook() { const op = OPx(); if (!op || op.estado !== 'activa' || !isEditor(op) || !cloudCfg() || cloudTimer) return; cloudTimer = setTimeout(() => { cloudTimer = null; cloudPush(op.id, 'sync'); }, CLOUD_DELAY); }
window.addEventListener('online', () => { const op = OPx(); if (op && op.estado === 'activa' && isEditor(op) && cloudCfg()) { cloudPush(op.id, 'sync', true); pollTeams(true); } });
function cloudBody(op, action, withImages) {
  const c = C(), cfg = c.cloud, o = cleanOp(op);
  if (cfg.anon !== false) (o.victimasReg || []).forEach(v => { v.nombre = v.nombre ? 'Reservado' : ''; });
  (o.recursos || []).forEach(r => { delete r.foto; }); (o.equipos || []).forEach(e => { delete e.evIds; }); o.fotos = (o.fotos || []).map(f => ({ id: f.id, ts: f.ts, equipo: f.equipo, text: f.text }));
  if (!withImages) delete o.croquis; else if (o.croquis) { delete o.croquis.base; delete o.croquis.draw; }
  return { token: cfg.token, action, cuartelId: c.id, cuartelNombre: c.nombre, op: o, sentAt: now() };
}
async function cloudPost(body, cfg) {
  const payload = JSON.stringify(body), hdr = { 'Content-Type': 'text/plain;charset=utf-8' };
  try { const r = await fetch(cfg.url, { method: 'POST', headers: hdr, body: payload, redirect: 'follow' }), j = await r.json().catch(() => null); if (j && j.ok) return { ok: true, confirmed: true, data: j }; if (j && j.error) return { ok: false, error: j.error }; return { ok: false, error: 'Respuesta inesperada del script' }; }
  catch (e) { try { await fetch(cfg.url, { method: 'POST', mode: 'no-cors', headers: hdr, body: payload }); return { ok: true, confirmed: false }; } catch (e2) { return { ok: false, error: 'Sin conexión' }; } }
}
async function cloudGet(params, cfgArg) {
  const cfg = cfgArg || cloudCfg(); if (!cfg) throw new Error('Nube sin configurar');
  const u = new URL(cfg.url); Object.keys(params).forEach(k => u.searchParams.set(k, params[k])); if (cfg.token) u.searchParams.set('token', cfg.token);
  const r = await fetch(u.toString(), { method: 'GET', redirect: 'follow' }); return r.json();
}
async function cloudPush(opId, action, force) {
  const cfg = cloudCfg(), c = C(); if (!cfg || !c) return { ok: false, error: 'No configurado' };
  const op = c.ops.find(o => o.id === opId); if (!op || op._follow) return { ok: false, error: 'No existe la operación' };
  if (!navigator.onLine) { op.cloud = Object.assign({}, op.cloud, { ok: false, error: 'Sin conexión' }); save(true); updatePills(); return { ok: false, error: 'Sin conexión' }; }
  const incl = !!(op.croquis && (action === 'cerrar' || !op.cloud || op.cloud.croTs !== op.croquis.ts)), body = cloudBody(op, action, incl), sig = hash(JSON.stringify(Object.assign({}, body, { sentAt: 0 })));
  if (!force && action === 'sync' && cloudSig[op.id] === sig) return { ok: true, skipped: true };
  if (action === 'cerrar') { try { const rep = R.build(c, op, c.users, Object.assign(pdfOpts(op), { anon: cfg.anon !== false })); body.pdf = b64(rep.bytes); body.pdfName = rep.filename; } catch (e) { console.error(e); } }
  const r = await cloudPost(body, cfg), cur = c.ops.find(o => o.id === opId); if (!cur) return r;
  if (r.ok) { cloudSig[op.id] = sig; cur.cloud = Object.assign({}, cur.cloud, { ok: true, confirmed: !!r.confirmed, ts: now(), error: '' }, incl ? { croTs: op.croquis.ts } : {}); }
  else cur.cloud = Object.assign({}, cur.cloud, { ok: false, error: r.error });
  save(true); updatePills(); return r;
}
function cloudToast(r) { if (!r) return; if (r.ok && r.confirmed) toast('☁ Respaldo enviado y confirmado ✔', '', 4000); else if (r.ok && r.skipped) toast('☁ Sin cambios desde el último envío.', '', 3000); else if (r.ok) toast('☁ Enviado, pero el script no confirmó la recepción. Verificá que llegó.', '', 6000); else toast('⚠ No se pudo enviar el respaldo: ' + (r.error || 'error') + '.', 'bad', 7000); }
async function cloudClose(op) { if (!cloudCfg()) return; toast('☁ Enviando respaldo y correo…', '', 3500); cloudToast(await cloudPush(op.id, 'cerrar', true)); }
ACT['cloud-test'] = async () => {
  const f = $('#cf'), out = $('#cloudtest'); if (!f || !out) return; const url = f.cloud_url.value.trim(), token = f.cloud_token.value.trim();
  if (!url || !token) { out.textContent = 'Completá la URL y la clave.'; return; } out.textContent = 'Probando…';
  try { const j = await cloudGet({ action: 'list', cuartel: C().id }, { url, token }); out.innerHTML = j && j.ok ? '<span class="okc">✔ Conexión correcta</span>' : '<span class="ec">✖ ' + esc((j && j.error) || 'Respuesta inválida') + '</span>'; }
  catch (e) { out.innerHTML = '<span class="ec">✖ No responde (revisá la URL, que la implementación sea «Cualquier persona» y tu conexión).</span>'; }
};
