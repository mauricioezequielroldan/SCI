/**
 * SCI Bomberos — nube del cuartel (Google Apps Script)
 *
 * QUÉ HACE
 *  - Conecta en vivo los equipos que escanean el QR (recorrido, reportes, fotos, PAR, MAYDAY, confirmación de evacuación)
 *    con el tablero del comando, y le lleva al equipo la tarea, el viento, los mensajes y las órdenes de evacuación.
 *  - Guarda en tu Google Drive una copia de cada operación (respaldo, traspaso y «seguir en vivo»).
 *  - Al CERRAR una operación, manda por correo el informe en PDF.
 *
 * INSTALACIÓN (una sola vez, con la cuenta de Google del cuartel) — ver docs/NUBE.md
 *  1. https://script.google.com → «Nuevo proyecto» → borrá lo que haya y pegá este archivo completo.
 *  2. Cambiá TOKEN (clave larga inventada por vos) y EMAIL_TO (a dónde llegan los informes).
 *  3. «Implementar» → «Nueva implementación» → tipo «Aplicación web». Ejecutar como: «Yo». Acceso: «Cualquier persona».
 *     Autorizá los permisos (Drive y Gmail) y copiá la URL que termina en /exec.
 *  4. En la app: Ajustes del cuartel → Nube → pegá la URL y la clave → «Probar conexión» → Guardar.
 *  Si cambiás este código: «Implementar» → «Administrar implementaciones» → editar → «Nueva versión».
 *
 * SEGURIDAD
 *  - Con URL + TOKEN se lee y escribe todo: usá una clave larga y compartila solo con dispositivos del cuartel.
 *  - Los QR de equipo NO llevan el TOKEN: llevan una clave propia de ese equipo, que solo permite enviar datos de ese equipo
 *    a esa operación y leer sus propias instrucciones. Al renovar el QR en la app, la clave anterior deja de servir.
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

function doPost(e) {
  try {
    var d = JSON.parse(e.postData.contents), f = folder_();
    // ---- Equipo (QR): no usa TOKEN, usa la clave del equipo ----
    if (d.action === 'team-post') {
      return withLock_(function () {
        var name = 'eq_' + safe_(d.cuartelId) + '_' + safe_(d.opId) + '.json', T = read_(f, name);
        if (!T || !T.teams[d.teamId] || T.teams[d.teamId].key !== d.key) return out_({ ok: false, error: 'QR no válido' });
        var seen = {}; T.events.forEach(function (x) { seen[x.id] = 1; });
        (d.events || []).slice(0, 60).forEach(function (ev) {
          if (!ev || !ev.id || seen[ev.id]) return;
          ev.teamId = d.teamId; T.seq += 1; ev.seq = T.seq;
          if (ev.img) { f.createFile('ph_' + safe_(d.cuartelId) + '_' + safe_(d.opId) + '_' + safe_(ev.id) + '.txt', ev.img, MimeType.PLAIN_TEXT); delete ev.img; ev.photoId = ev.id; }
          if (ev.text) ev.text = String(ev.text).slice(0, 500);
          T.events.push(ev);
        });
        if (T.events.length > 20000) T.events = T.events.slice(-15000);
        write_(f, name, T);
        return out_({ ok: true, brief: brief_(T, d.teamId) });
      });
    }
    if (d.token !== TOKEN) return out_({ ok: false, error: 'Clave incorrecta' });
    // ---- Comando: registra equipos, instrucciones, viento y evacuación ----
    if (d.action === 'teams') {
      return withLock_(function () {
        var name = 'eq_' + safe_(d.cuartelId) + '_' + safe_(d.opId) + '.json', T = read_(f, name) || { teams: {}, events: [], seq: 0 };
        T.op = d.op || {}; T.teams = {}; (d.teams || []).forEach(function (t) { T.teams[t.id] = t; });
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
    if (p.action === 'get') { var r = read_(f, 'op_' + key + '.json'); return out_(r ? { ok: true, op: r.op } : { ok: false, error: 'No existe esa operación' }); }
    if (p.action === 'feed') { var T = read_(f, 'eq_' + key + '.json') || { events: [], seq: 0 }, s = Number(p.since || 0); return out_({ ok: true, events: T.events.filter(function (x) { return x.seq > s; }).slice(0, 300), seq: T.seq }); }
    if (p.action === 'photo') { var ph = find_(f, 'ph_' + key + '_' + safe_(p.id) + '.txt'); return out_(ph ? { ok: true, data: ph.getBlob().getDataAsString() } : { ok: false, error: 'No existe la foto' }); }
    var list = [], it = f.getFiles(), prefix = 'op_' + safe_(p.cuartel) + '_';
    while (it.hasNext()) { var x = it.next(); if (x.getName().indexOf(prefix) !== 0) continue; var rr = JSON.parse(x.getBlob().getDataAsString()); list.push({ id: rr.op.id, num: rr.op.num, nombre: rr.op.nombre, estado: rr.op.estado, updatedAt: rr.updatedAt }); }
    return out_({ ok: true, ops: list });
  } catch (err) { return out_({ ok: false, error: String(err) }); }
}
