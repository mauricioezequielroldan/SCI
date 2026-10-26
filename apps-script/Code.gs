/**
 * SCI Bomberos — nube del cuartel (Google Apps Script) · v2.5
 *
 * QUÉ HACE
 *  - Conecta en vivo los equipos que escanean el QR con el tablero del comando.
 *  - Guarda en Google Drive una copia de cada operación (respaldo, traspaso y «seguir en vivo»).
 *  - Registra los CONSENTIMIENTOS (términos, privacidad, dato de salud) en la planilla «Consentimientos».
 *  - Al CERRAR una operación, manda por correo el informe en PDF.
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
    // ---- Consentimientos ----
    if (d.action === 'consent') return withLock_(function () { return out_({ ok: true, added: consAdd_(d.records) }); });
    // ---- Comando: equipos, instrucciones, viento y evacuación ----
    if (d.action === 'teams') {
      return withLock_(function () {
        var name = 'eq_' + safe_(d.cuartelId) + '_' + safe_(d.opId) + '.json', T = read_(f, name) || { teams: {}, events: [], seq: 0 };
        T.op = d.op || {}; T.cuartelNombre = d.cuartelNombre || T.cuartelNombre || ''; T.teams = {}; (d.teams || []).forEach(function (t) { T.teams[t.id] = t; });
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
    if (p.action === 'ping') return out_({ ok: true, version: '2.5' });
    if (p.action === 'get') { var r = read_(f, 'op_' + key + '.json'); return out_(r ? { ok: true, op: r.op } : { ok: false, error: 'No existe esa operación' }); }
    if (p.action === 'feed') { var T = read_(f, 'eq_' + key + '.json') || { events: [], seq: 0 }, s = Number(p.since || 0); return out_({ ok: true, events: T.events.filter(function (x) { return x.seq > s; }).slice(0, 300), seq: T.seq }); }
    if (p.action === 'photo') { var ph = find_(f, 'ph_' + key + '_' + safe_(p.id) + '.txt'); return out_(ph ? { ok: true, data: ph.getBlob().getDataAsString() } : { ok: false, error: 'No existe la foto' }); }
    var list = [], it = f.getFiles(), prefix = 'op_' + safe_(p.cuartel) + '_';
    while (it.hasNext()) { var x = it.next(); if (x.getName().indexOf(prefix) !== 0) continue; var rr = JSON.parse(x.getBlob().getDataAsString()); list.push({ id: rr.op.id, num: rr.op.num, nombre: rr.op.nombre, estado: rr.op.estado, updatedAt: rr.updatedAt }); }
    return out_({ ok: true, ops: list });
  } catch (err) { return out_({ ok: false, error: String(err) }); }
}
