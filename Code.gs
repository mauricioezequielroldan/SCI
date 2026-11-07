/**
 * SCI Bomberos — nube del cuartel (Google Apps Script) · v2.7
 *
 * QUÉ HACE
 *  - Conecta en vivo los equipos que escanean el QR con el tablero del comando.
 *  - Guarda en Google Drive una copia de cada operación (respaldo, traspaso y «seguir en vivo»).
 *  - Registra los CONSENTIMIENTOS (términos, privacidad, dato de salud) en la planilla «Consentimientos».
 *  - Al CERRAR una operación, manda por correo el informe en PDF.
 *  - (v2.7) Lee el bot de Telegram del cuartel: ubicación en vivo del personal y respuestas «Voy / No puedo».
 *
 * INSTALACIÓN: usá el «Asistente de nube» de la app (Ajustes → Nube): te da este código con la clave
 * ya puesta y te guía. Implementar como «Aplicación web», Ejecutar como «Yo», Acceso «Cualquier persona».
 * Si cambiás este código: Implementar → Administrar implementaciones → ✎ → Nueva versión.
 */
var TOKEN = 'CAMBIAR-ESTA-CLAVE-POR-UNA-LARGA';
var EMAIL_TO = 'jefe@micuartel.org';          // varios, separados por coma
var CARPETA = 'SCI Bomberos';                 // carpeta de Drive donde se guarda todo

function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function folder_() { var it = DriveApp.getFoldersByName(CARPETA); return it.hasNext() ? it.next() : DriveApp.createFolder(CARPETA); }
function safe_(s) { return String(s || '').replace(/[^A-Za-z0-9_-]+/g, '_'); }
function find_(f, name) { var it = f.getFilesByName(name); return it.hasNext() ? it.next() : null; }
function read_(f, name) { var x = find_(f, name); return x ? JSON.parse(x.getBlob().getDataAsString()) : null; }
function write_(f, name, obj) { var x = find_(f, name), t = JSON.stringify(obj); if (x) x.setContent(t); else f.createFile(name, t, MimeType.PLAIN_TEXT); }
function withLock_(fn) { var l = LockService.getScriptLock(); l.waitLock(20000); try { return fn(); } finally { l.releaseLock(); } }
function brief_(T, t) {
  var tm = T.teams[t], o = T.op || {};
  return { valid: true, nombre: tm.nombre, color: tm.color, tarea: tm.tarea || '', sector: tm.sector || '', miembros: tm.miembros || [], msgs: tm.msgs || [], clima: o.clima || null, evac: o.evac || null, closed: !!o.closed, opNum: o.num };
}

/* ---------- Planilla de consentimientos ---------- */
var CONS_HEAD = ['ID', 'Fecha y hora', 'Cuartel', 'ID cuartel', 'Integrante', 'Legajo', 'Tipo', 'Versión', 'Dispositivo', 'Recibido'];
function consSheet_() {
  var f = folder_(), x = find_(f, 'Consentimientos'), ss;
  if (x) ss = SpreadsheetApp.open(x);
  else { ss = SpreadsheetApp.create('Consentimientos'); DriveApp.getFileById(ss.getId()).moveTo(f); var sh0 = ss.getSheets()[0]; sh0.setName('Registro'); sh0.appendRow(CONS_HEAD); sh0.setFrozenRows(1); }
  return ss.getSheets()[0];
}
function consAdd_(recs) {
  if (!recs || !recs.length) return 0;
  var sh = consSheet_(), last = sh.getLastRow(), seen = {};
  if (last > 1) sh.getRange(2, 1, last - 1, 1).getValues().forEach(function (r) { seen[r[0]] = 1; });
  var rows = [];
  recs.slice(0, 200).forEach(function (r) {
    if (!r || !r.id || seen[r.id]) return; seen[r.id] = 1;
    rows.push([String(r.id), new Date(Number(r.ts) || Date.now()), String(r.cuartel || '').slice(0, 120), String(r.cuartelId || '').slice(0, 60), String(r.nombre || '').slice(0, 120), String(r.legajo || '').slice(0, 40), String(r.tipo || '').slice(0, 40), String(r.version || '').slice(0, 20), String(r.dispositivo || '').slice(0, 60), new Date()]);
  });
  if (rows.length) sh.getRange(sh.getLastRow() + 1, 1, rows.length, CONS_HEAD.length).setValues(rows);
  return rows.length;
}


/* ---------- Telegram: ubicación en vivo y respuesta «Voy / No puedo» (v2.7) ----------
   La nube es la ÚNICA que lee a Telegram (getUpdates) y reparte a todas las tablets del comando.
   El token del bot queda guardado acá (Propiedades del script), no hace falta webhook. */
function tgProp_(k, v) { var p = PropertiesService.getScriptProperties(); if (v === undefined) return p.getProperty(k); if (v === null) p.deleteProperty(k); else p.setProperty(k, String(v)); }
function tgApi_(method, payload) {
  var tok = tgProp_('TG_TOKEN'); if (!tok) throw new Error('Telegram no está activado en la nube');
  var r = UrlFetchApp.fetch('https://api.telegram.org/bot' + tok + '/' + method, { method: 'post', contentType: 'application/json', payload: JSON.stringify(payload || {}), muteHttpExceptions: true });
  return JSON.parse(r.getContentText());
}
function tgName_(u) { return String(((u.first_name || '') + ' ' + (u.last_name || '')).trim() || u.username || 'Sin nombre').slice(0, 60); }
function tgParse_(u) {
  var out = [], m = u.message || u.edited_message, cq = u.callback_query;
  if (m && m.location && m.from && !m.from.is_bot) {
    var L = m.location, lp = Number(L.live_period || 0);
    out.push({ id: 'l' + u.update_id, type: 'loc', uid: String(m.from.id), name: tgName_(m.from), user: m.from.username || '', ts: (m.edit_date || m.date) * 1000, lat: L.latitude, lon: L.longitude, acc: Math.round(L.horizontal_accuracy || 0), live: lp ? (lp >= 2147483647 ? 4102444800000 : (m.date + lp) * 1000) : 0, stop: !!(u.edited_message && !lp) });
  }
  if (cq && /^r\|[vn]\|/.test(cq.data || '')) {
    var p = cq.data.split('|');
    out.push({ id: 'c' + u.update_id, type: 'resp', uid: String(cq.from.id), name: tgName_(cq.from), user: cq.from.username || '', ts: Date.now(), st: p[1] === 'v' ? 'voy' : 'no', alarm: p[2] || '', cq: cq.id });
  }
  return out;
}
function tgAnswer_(ev) {
  var bot = tgProp_('TG_BOT') || '';
  var txt = ev.st === 'voy' ? '✔ Registrado: VAS. Compartí tu ubicación en tiempo real con @' + bot + ' (📎 → Ubicación → En tiempo real) para que el comando te vea llegar.' : '✔ Registrado: no podés ir. Gracias por avisar.';
  try { tgApi_('answerCallbackQuery', { callback_query_id: ev.cq, text: txt.slice(0, 200), show_alert: true }); } catch (e) { }
}
function tgPoll_(f, cuartelId) {
  var name = 'tg_' + safe_(cuartelId) + '.json', S = read_(f, name) || { seq: 0, events: [], lastLoc: {} }, changed = false;
  var last = Number(tgProp_('TG_LAST') || 0);
  if (tgProp_('TG_TOKEN') && Date.now() - last > 3000) {
    tgProp_('TG_LAST', Date.now());
    var off = Number(tgProp_('TG_OFF') || 0);
    var j = tgApi_('getUpdates', { offset: off || undefined, timeout: 0, limit: 100, allowed_updates: ['message', 'edited_message', 'callback_query'] });
    if (j && j.ok) {
      j.result.forEach(function (u) {
        off = u.update_id + 1;
        tgParse_(u).forEach(function (ev) {
          if (ev.type === 'loc') { var lt = S.lastLoc[ev.uid] || 0; if (!ev.stop && ev.ts - lt < 8000) return; S.lastLoc[ev.uid] = ev.ts; }
          if (ev.type === 'resp') { tgAnswer_(ev); delete ev.cq; }
          S.seq += 1; ev.seq = S.seq; S.events.push(ev); changed = true;
        });
      });
      tgProp_('TG_OFF', off);
    } else if (j && j.error_code === 409) { try { tgApi_('deleteWebhook', {}); } catch (e) { } }
    if (S.events.length > 20000) S.events = S.events.slice(-15000);
    if (changed) write_(f, name, S);
  }
  return S;
}

function doPost(e) {
  try {
    var d = JSON.parse(e.postData.contents), f = folder_();
    // ---- Equipo (QR): usa la clave del equipo, no el TOKEN ----
    if (d.action === 'team-post') {
      return withLock_(function () {
        var name = 'eq_' + safe_(d.cuartelId) + '_' + safe_(d.opId) + '.json', T = read_(f, name);
        if (!T || !T.teams[d.teamId] || T.teams[d.teamId].key !== d.key) return out_({ ok: false, error: 'QR no válido' });
        var seen = {}, cons = []; T.events.forEach(function (x) { seen[x.id] = 1; });
        (d.events || []).slice(0, 60).forEach(function (ev) {
          if (!ev || !ev.id || seen[ev.id]) return;
          ev.teamId = d.teamId; T.seq += 1; ev.seq = T.seq;
          if (ev.img) { f.createFile('ph_' + safe_(d.cuartelId) + '_' + safe_(d.opId) + '_' + safe_(ev.id) + '.txt', ev.img, MimeType.PLAIN_TEXT); delete ev.img; ev.photoId = ev.id; }
          if (ev.text) ev.text = String(ev.text).slice(0, 500);
          if (ev.type === 'consent') cons.push({ id: 'eq|' + ev.id, ts: ev.ts, cuartel: T.cuartelNombre || '', cuartelId: d.cuartelId, nombre: 'Equipo ' + T.teams[d.teamId].nombre + ' (op. ' + ((T.op || {}).num || '') + ')', tipo: 'terminos-equipo', version: ev.text || '', dispositivo: ev.dev || '' });
          T.events.push(ev);
        });
        if (T.events.length > 20000) T.events = T.events.slice(-15000);
        write_(f, name, T);
        if (cons.length) try { consAdd_(cons); } catch (er) { }
        return out_({ ok: true, brief: brief_(T, d.teamId) });
      });
    }
    if (d.token !== TOKEN) return out_({ ok: false, error: 'Clave incorrecta' });
    // ---- Telegram: activar / desactivar ubicación en vivo ----
    if (d.action === 'tg-setup') {
      if (!d.tgToken) { ['TG_TOKEN', 'TG_OFF', 'TG_LAST', 'TG_BOT'].forEach(function (k) { tgProp_(k, null); }); return out_({ ok: true, off: true }); }
      tgProp_('TG_TOKEN', d.tgToken); tgProp_('TG_OFF', null);
      var me = tgApi_('getMe', {}); if (!me || !me.ok) { tgProp_('TG_TOKEN', null); return out_({ ok: false, error: 'Token de Telegram inválido' }); }
      try { tgApi_('deleteWebhook', {}); } catch (er) { }
      tgProp_('TG_BOT', me.result.username || ''); return out_({ ok: true, bot: me.result.username || '' });
    }
    // ---- Consentimientos ----
    if (d.action === 'consent') return withLock_(function () { return out_({ ok: true, added: consAdd_(d.records) }); });
    // ---- Comando: equipos, instrucciones, viento y evacuación ----
    if (d.action === 'teams') {
      return withLock_(function () {
        var name = 'eq_' + safe_(d.cuartelId) + '_' + safe_(d.opId) + '.json', T = read_(f, name) || { teams: {}, events: [], seq: 0 };
        // v2.6: si hay dos dispositivos de comando, uno con datos viejos no debe borrar lo que mandó el otro.
        var oldEvac = (T.op || {}).evac || null, oldTeams = T.teams || {};
        var evTs = function (v) { return v ? Math.max(Number(v.ts) || 0, Number(v.endTs) || 0) : 0; };
        T.op = d.op || {}; if (evTs(oldEvac) > evTs(T.op.evac)) T.op.evac = oldEvac;
        T.cuartelNombre = d.cuartelNombre || T.cuartelNombre || ''; T.teams = {};
        (d.teams || []).forEach(function (t) {
          var o = oldTeams[t.id], byId = {};
          ((o && o.msgs) || []).concat(t.msgs || []).forEach(function (m) { if (m && m.id) byId[m.id] = m; });
          t.msgs = Object.keys(byId).map(function (k) { return byId[k]; }).sort(function (a, b) { return a.ts - b.ts; }).slice(-20);
          T.teams[t.id] = t;
        });
        write_(f, name, T); return out_({ ok: true });
      });
    }
    // ---- Respaldo de la operación (sync / cerrar) ----
    if (!d.op || !d.op.id || !d.cuartelId) return out_({ ok: false, error: 'Datos incompletos' });
    return withLock_(function () {
      var name = 'op_' + safe_(d.cuartelId) + '_' + safe_(d.op.id) + '.json', old = read_(f, name);
      if (!d.op.croquis && old && old.op && old.op.croquis) d.op.croquis = old.op.croquis;
      var rec = { cuartelId: d.cuartelId, cuartelNombre: d.cuartelNombre, op: d.op, updatedAt: new Date().getTime(), mailSent: old ? !!old.mailSent : false };
      if (d.action === 'cerrar' && d.pdf) {
        var pdf = Utilities.newBlob(Utilities.base64Decode(d.pdf), 'application/pdf', d.pdfName || 'informe.pdf');
        if (!find_(f, pdf.getName())) f.createFile(pdf);
        if (!rec.mailSent) {
          MailApp.sendEmail({ to: EMAIL_TO, subject: '[' + d.cuartelNombre + '] Operación cerrada ' + d.op.num + ' — ' + d.op.tipo,
            body: 'Se cerró la operación ' + d.op.num + ' (' + d.op.tipo + ') en ' + (d.op.direccion || '') + '.\n\nAdjuntamos el informe en PDF. Verificá los datos antes de cargarlo en RUBA.\n\nEnviado automáticamente por SCI Bomberos.', attachments: [pdf] });
          rec.mailSent = true;
        }
      }
      write_(f, name, rec); return out_({ ok: true });
    });
  } catch (err) { return out_({ ok: false, error: String(err) }); }
}

function doGet(e) {
  try {
    var p = e.parameter || {}, f = folder_();
    if (p.token !== TOKEN) return out_({ ok: false, error: 'Clave incorrecta' });
    var key = safe_(p.cuartel) + '_' + safe_(p.op);
    if (p.action === 'ping') return out_({ ok: true, version: '2.7' });
    if (p.action === 'get') { var r = read_(f, 'op_' + key + '.json'); return out_(r ? { ok: true, op: r.op } : { ok: false, error: 'No existe esa operación' }); }
    if (p.action === 'feed') { var T = read_(f, 'eq_' + key + '.json') || { events: [], seq: 0 }, s = Number(p.since || 0); return out_({ ok: true, events: T.events.filter(function (x) { return x.seq > s; }).slice(0, 300), seq: T.seq }); }
    if (p.action === 'tg-feed') { return withLock_(function () { var S = tgPoll_(f, p.cuartel), s = Number(p.since || 0); return out_({ ok: true, events: S.events.filter(function (x) { return x.seq > s; }).slice(0, 400), seq: S.seq }); }); }
    if (p.action === 'photo') { var ph = find_(f, 'ph_' + key + '_' + safe_(p.id) + '.txt'); return out_(ph ? { ok: true, data: ph.getBlob().getDataAsString() } : { ok: false, error: 'No existe la foto' }); }
    var list = [], it = f.getFiles(), prefix = 'op_' + safe_(p.cuartel) + '_';
    while (it.hasNext()) { var x = it.next(); if (x.getName().indexOf(prefix) !== 0) continue; var rr = JSON.parse(x.getBlob().getDataAsString()); list.push({ id: rr.op.id, num: rr.op.num, nombre: rr.op.nombre, estado: rr.op.estado, updatedAt: rr.updatedAt }); }
    return out_({ ok: true, ops: list });
  } catch (err) { return out_({ ok: false, error: String(err) }); }
}
