/* Informe de intervención (PDF). Estructura inspirada en los formularios SCI-201, SCI-207 y SCI-211.
   opts: { anon: ocultar nombres de víctimas, trackImg: JPEG (dataURL) con los recorridos de los equipos } */
(function (root) {
  'use strict';
  var PDF = root.SCI_PDF || (typeof require !== 'undefined' ? require('./pdf.js') : null);
  function p2(n) { return ('0' + n).slice(-2); }
  function fdate(ts) { if (!ts) return '-'; var d = new Date(ts); return p2(d.getDate()) + '/' + p2(d.getMonth() + 1) + '/' + d.getFullYear(); }
  function ftime(ts) { if (!ts) return '-'; var d = new Date(ts); return p2(d.getHours()) + ':' + p2(d.getMinutes()) + ':' + p2(d.getSeconds()); }
  function fdt(ts) { return ts ? fdate(ts) + ' ' + ftime(ts) : '-'; }
  function fdur(ms) { if (ms == null || isNaN(ms)) return '-'; var s = Math.round(ms / 1000), m = Math.floor(s / 60), h = Math.floor(m / 60); return h ? h + ' h ' + p2(m % 60) + ' min' : m ? m + ' min ' + p2(s % 60) + ' s' : s + ' s'; }
  function uname(users, id) { var u = (users || []).filter(function (x) { return x.id === id; })[0]; if (!u) return id ? '(usuario eliminado)' : '-'; return [u.jerarquia, u.nombre, u.apellido].filter(Boolean).join(' '); }
  function safe(s) { return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9_-]+/g, '_').replace(/^_+|_+$/g, ''); }
  function fit(s, w, size, bold) { s = PDF.enc(s); if (PDF.tw(s, size, bold) <= w) return s; while (s.length > 1 && PDF.tw(s + '...', size, bold) > w) s = s.slice(0, -1); return s + '...'; }
  function dist(a, b) { var R = 6371000, t = Math.PI / 180, dl = (b[0] - a[0]) * t, dn = (b[1] - a[1]) * t, x = Math.pow(Math.sin(dl / 2), 2) + Math.cos(a[0] * t) * Math.cos(b[0] * t) * Math.pow(Math.sin(dn / 2), 2); return 2 * R * Math.asin(Math.sqrt(x)); }
  function trackLen(tr) { var m = 0; for (var i = 1; i < (tr || []).length; i++) m += dist([tr[i - 1][1], tr[i - 1][2]], [tr[i][1], tr[i][2]]); return m; }
  var TRIAGE = { rojo: 'Rojo - inmediato', amarillo: 'Amarillo - diferido', verde: 'Verde - leve', negro: 'Negro - fallecido' };
  var MARKS = 'PC = Puesto de comando; ZS = Zona segura; AG = Agua / hidrante; FR = Frente de fuego; AT = Linea de ataque; AN = Punto de anclaje; PM = Puesto medico; RH = Rehabilitacion; PE = Peligro; AC = Acceso / ingreso';
  function windTxt(c) { return c && c.dir ? 'del ' + c.dir + (c.kmh ? ' a ' + c.kmh + ' km/h' : '') : ''; }

  function orgChart(doc, op, icName) {
    var roles = op.roles || {}, W = doc.width(), x0 = doc.mx, bh = 30, gap = 15, secs = (op.sectores || []).slice(0, 8);
    doc.ensure(bh * 3 + gap * 2 + 14 + (secs.length ? secs.length * 15 + 8 : 0));
    var y = doc.y + 2, mid = x0 + W / 2, y2 = y + bh + gap, y3 = y2 + bh + gap, yb = y3 - gap / 2, sw = 112, sg = 6, secW = (W - 24) / 4, lc = { color: '#8a96a3', lw: 0.8 };
    function box(x, yy, w, title, nm, fill) { doc.rect(x, yy, w, bh, { fill: fill || '#f6f8fa', stroke: '#8a96a3', lw: 0.7 }); doc.text(fit(title, w - 8, 6.8, true), x + w / 2, yy + 11, { size: 6.8, bold: true, align: 'center', color: '#445' }); doc.text(fit(nm || '-', w - 8, 8.5, false), x + w / 2, yy + 23, { size: 8.5, align: 'center' }); }
    doc.line(mid, y + bh, mid, yb, lc); var sx = [mid - 10 - sw - sg - sw, mid - 10 - sw, mid + 10];
    doc.line(sx[0] + sw, y2 + bh / 2, sx[2], y2 + bh / 2, lc);
    var cx = []; for (var i = 0; i < 4; i++) cx.push(x0 + i * (secW + 8) + secW / 2);
    doc.line(cx[0], yb, cx[3], yb, lc); cx.forEach(function (c) { doc.line(c, yb, c, y3, lc); });
    box(mid - 95, y, 190, 'COMANDANTE DEL INCIDENTE', icName, '#fde8e8');
    box(sx[0], y2, sw, 'OF. DE SEGURIDAD', roles.seguridad); box(sx[1], y2, sw, 'OF. DE ENLACE', roles.enlace); box(sx[2], y2, sw, 'OF. INFORMACION PUBLICA', roles.info);
    [['JEFE DE OPERACIONES', roles.operaciones], ['JEFE DE PLANIFICACION', roles.planificacion], ['JEFE DE LOGISTICA', roles.logistica], ['JEFE DE FINANZAS Y ADM.', roles.finanzas]].forEach(function (s, k) { box(x0 + k * (secW + 8), y3, secW, s[0], s[1], k === 0 ? '#e9f1fb' : '#f6f8fa'); });
    var yy = y3 + bh;
    if (secs.length) { doc.line(x0 + 8, yy, x0 + 8, yy + 2 + secs.length * 15, lc); secs.forEach(function (s, k) { var ty = yy + 6 + k * 15; doc.rect(x0 + 14, ty, secW - 14, 12, { fill: '#ffffff', stroke: '#b8c1cb', lw: 0.5 }); doc.text(fit((s.tipo || 'Sector') + ': ' + s.nombre, secW - 22, 7, false), x0 + 18, ty + 9, { size: 7 }); }); yy += 6 + secs.length * 15; }
    doc.y = yy + 8;
  }
  function imageBlock(doc, url, maxH, H, title, caption) {
    var im = doc.addJpeg(url); if (im == null) return false; var sz = doc.imgSize(im), w = doc.width(), h = w * sz.h / sz.w; if (h > maxH) { h = maxH; w = h * sz.w / sz.h; }
    doc.ensure(h + 60); if (title) H(title); doc.ensure(h + 8); var x = doc.mx + (doc.width() - w) / 2;
    doc.rect(x, doc.y, w, h, { stroke: '#8a96a3', lw: 0.8 }); doc.image(im, x, doc.y, w, h); doc.y += h + 6; if (caption) doc.para(caption, { size: 8, color: '#6b7785', gap: 1 }); return true;
  }

  function build(cuartel, op, users, opts) {
    opts = opts || {};
    var partial = op.estado === 'activa', color = cuartel.color || '#d62828';
    var doc = new PDF({
      title: (partial ? 'Parte parcial' : 'Informe de intervención') + ' ' + op.num + ' - ' + cuartel.nombre,
      footer: cuartel.nombre + ' - Intervención ' + op.num + ' - Generado ' + fdt(Date.now()),
      onNewPage: function (d) { d.rect(0, 0, d.pw, 22, { fill: partial ? '#8a5a00' : color }); d.text(cuartel.nombre + '  |  Intervención ' + op.num, d.mx, 15, { size: 8.5, bold: true, color: '#ffffff' }); d.text(partial ? 'PARTE PARCIAL - operación en curso' : 'Informe de intervención (SCI)', d.pw - d.mx, 15, { size: 8.5, color: '#ffffff', align: 'right' }); d.y = 36; }
    });
    doc.rect(0, 0, doc.pw, 82, { fill: partial ? '#8a5a00' : color });
    var logo = cuartel.logo ? doc.addJpeg(cuartel.logo) : null, tx = doc.mx;
    if (logo != null) { doc.rect(doc.mx, 14, 54, 54, { fill: '#ffffff' }); doc.image(logo, doc.mx + 2, 16, 50, 50); tx = doc.mx + 66; }
    doc.text(cuartel.nombre, tx, 34, { size: 17, bold: true, color: '#ffffff' });
    doc.text([cuartel.localidad, cuartel.provincia].filter(Boolean).join(', ') + (cuartel.federacion ? '  -  ' + cuartel.federacion : ''), tx, 50, { size: 9.5, color: '#ffffff' });
    doc.text(partial ? 'PARTE PARCIAL - OPERACION EN CURSO (al ' + fdt(Date.now()) + ')' : 'INFORME DE INTERVENCION - SISTEMA DE COMANDO DE INCIDENTES', tx, 68, { size: 9.5, bold: true, color: '#ffffff' });
    doc.y = 96;
    var recs = op.recursos || [], secs = op.sectores || [], n = 0, cl = op.clima || {}, eqs = op.equipos || [];
    function H(t) { n++; doc.h2(n + '. ' + t, color); }
    var dur = (op.closedAt || Date.now()) - op.alarmAt, arr = recs.map(function (r) { return r.arrivedAt; }).filter(Boolean), first = arr.length ? Math.min.apply(null, arr) : null;
    var icIni = op.icInicial || (op.editors && op.editors[0]), icFin = op.editors && op.editors[0], deleg = op.editors && op.editors[1];

    H('Datos generales (resumen del incidente)');
    doc.kv([['Intervención N°', op.num], ['Nombre / referencia', op.nombre], ['Tipo de siniestro', op.tipo], ['Resultado final', op.cierre && op.cierre.resultado], ['Dirección / lugar', op.direccion], ['Localidad', [op.localidad, cuartel.provincia].filter(Boolean).join(', ')],
      ['Coordenadas', op.coords], ['Solicitante', [op.solicitante, op.telSolicitante].filter(Boolean).join(' - ')], ['Hora de alarma', fdt(op.alarmAt)], ['Primera unidad / recurso en escena', first ? ftime(first) : '-'],
      ['Tiempo de respuesta', first ? fdur(first - op.alarmAt) : '-'], ['Hora de cierre', fdt(op.closedAt)], ['Duración total', fdur(dur)], ['Estrategia', op.estrategia || 'Sin definir']], 2);
    if (cl.dir || cl.temp || cl.hum || cl.nota) doc.kv([['Viento (de dónde viene)', windTxt(cl)], ['Temperatura / humedad', [cl.temp !== '' && cl.temp != null ? cl.temp + ' °C' : '', cl.hum !== '' && cl.hum != null ? 'HR ' + cl.hum + '%' : ''].filter(Boolean).join(' / ')], ['Observación del tiempo', cl.nota]], 3);
    if (op.descripcion) doc.para('Descripción inicial: ' + op.descripcion, { size: 9.5 });
    if (op.evac && op.evac.ts) doc.para('ORDEN DE EVACUACION emitida a las ' + ftime(op.evac.ts) + (op.evac.text ? ': ' + op.evac.text : '') + (op.evac.active ? ' (vigente)' : ' (levantada ' + ftime(op.evac.endTs) + ')'), { size: 9.5, bold: true, color: '#b00020' });

    H('Estructura de comando');
    doc.kv([['Comandante del incidente (inicial)', uname(users, icIni)], ['Comandante del incidente (al cierre)', uname(users, icFin)], ['Operador / delegado de comando', deleg ? uname(users, deleg) : '-']], 3);
    orgChart(doc, op, uname(users, icFin));

    if (op.croquis && op.croquis.img) imageBlock(doc, op.croquis.img, 330, H, 'Croquis de la situación', 'Croquis guardado a las ' + ftime(op.croquis.ts) + (cl.dir ? '. Viento ' + windTxt(cl) + '.' : '.') + ' Referencias: ' + MARKS + '.');

    if (eqs.length) {
      H('Equipos de trabajo y recorridos');
      doc.table([{ t: 'Equipo', w: 20 }, { t: 'Sector / tarea', w: 22 }, { t: 'Integrantes', w: 26 }, { t: 'Recorrido', w: 12 }, { t: 'Últ. posición', w: 11 }, { t: 'Reportes', w: 9 }],
        eqs.map(function (e) {
          var s = secs.filter(function (x) { return x.id === e.sectorId; })[0], mem = (e.miembros || []).map(function (id) { var r = recs.filter(function (x) { return x.id === id; })[0]; return r ? r.nombre : ''; }).filter(Boolean).join(', ');
          var len = trackLen(e.track); return [e.nombre + (e.era && e.era.start ? ' (ERA)' : ''), [s && s.nombre, e.tarea].filter(Boolean).join(' - '), mem, (e.track || []).length > 1 ? (len >= 1000 ? (len / 1000).toFixed(2) + ' km' : Math.round(len) + ' m') : '-', e.last ? ftime(e.last.ts).slice(0, 5) : '-', String((e.reportes || []).length)];
        }), { size: 8 });
      if (opts.trackImg) imageBlock(doc, opts.trackImg, 300, null, null, 'Recorridos registrados por los equipos (punto blanco = inicio; punto lleno = última posición; ! = siniestro).');
      var reps = []; eqs.forEach(function (e) { (e.reportes || []).forEach(function (r) { reps.push([r.ts, e.nombre, r.text]); }); });
      reps.sort(function (a, b) { return a[0] - b[0]; });
      if (reps.length) doc.table([{ t: 'Hora', w: 12 }, { t: 'Equipo', w: 22 }, { t: 'Reporte desde el terreno', w: 66 }], reps.map(function (r) { return [ftime(r[0]), r[1], r[2]]; }), { size: 8 });
    }
    var fotos = (op.fotos || []).filter(function (f) { return f.img; }).slice(0, 8);
    if (fotos.length) {
      H('Fotos del terreno'); var cw = (doc.width() - 12) / 2, chh = cw * 0.66;
      for (var i = 0; i < fotos.length; i += 2) {
        doc.ensure(chh + 26);
        for (var j = 0; j < 2 && i + j < fotos.length; j++) { var f = fotos[i + j], im = doc.addJpeg(f.img), x = doc.mx + j * (cw + 12); if (im == null) continue; var sz = doc.imgSize(im), k = Math.min(cw / sz.w, chh / sz.h); doc.rect(x, doc.y, cw, chh, { fill: '#f1f3f5' }); doc.image(im, x + (cw - sz.w * k) / 2, doc.y + (chh - sz.h * k) / 2, sz.w * k, sz.h * k); doc.text(fit(ftime(f.ts).slice(0, 5) + ' - ' + (f.equipo || '') + (f.text ? ': ' + f.text : ''), cw, 7.5, false), x, doc.y + chh + 10, { size: 7.5, color: '#444' }); }
        doc.y += chh + 18;
      }
    }

    H('Sectores / divisiones y recursos asignados');
    if (!secs.length) doc.para('No se crearon sectores.', { size: 9, color: '#6b7785' });
    secs.forEach(function (s) {
      var rs = recs.filter(function (r) { return r.lastSectorId === s.id || r.sectorId === s.id; }); doc.ensure(40);
      doc.para((s.tipo || 'Sector') + ': ' + s.nombre + (s.lider ? '   |   Líder: ' + s.lider : ''), { size: 10, bold: true, gap: 1 });
      if (s.objetivo) doc.para('Tarea: ' + s.objetivo, { size: 9, gap: 2, color: '#444' });
      doc.table([{ t: 'Recurso', w: 34 }, { t: 'Tipo', w: 14 }, { t: 'En escena', w: 14 }, { t: 'Retiro', w: 14 }, { t: 'Estado final', w: 24 }], rs.map(function (r) { return [r.nombre + (r.detalle ? ' (' + r.detalle + ')' : ''), r.kind, ftime(r.arrivedAt), ftime(r.leftAt), r.estado]; }), { empty: 'Sin recursos asignados a este sector.' });
    });

    H('Registro y control de recursos (formato SCI-211)');
    var kindLbl = { unidad: 'Unidad', personal: 'Personal', externo: 'Externo' };
    function userOf(r) { return (users || []).filter(function (u) { return u.id === r.refId; })[0]; }
    doc.table([{ t: 'Recurso', w: 27 }, { t: 'Tipo', w: 9 }, { t: 'Legajo / institución', w: 19 }, { t: 'Dot.', w: 6 }, { t: 'Alerta', w: 13 }, { t: 'En escena', w: 13 }, { t: 'Retiro', w: 13 }],
      recs.map(function (r) { var u = userOf(r), ref = r.kind === 'personal' ? (u && u.legajo ? 'Leg. ' + u.legajo : '') : r.kind === 'externo' ? [r.institucion, r.tel].filter(Boolean).join(' - ') : cuartel.nombre; return [r.nombre + (r.detalle ? ' (' + r.detalle + ')' : ''), kindLbl[r.kind] || r.kind, ref, r.dotacion || '', ftime(r.addedAt), ftime(r.arrivedAt), ftime(r.leftAt)]; }), { empty: 'No se registraron recursos.', size: 8 });
    var nU = recs.filter(function (r) { return r.kind === 'unidad'; }).length, nP = recs.filter(function (r) { return r.kind === 'personal'; }).length, nE = recs.filter(function (r) { return r.kind === 'externo'; }).length;
    doc.para('Total: ' + nU + ' unidades, ' + nP + ' bomberos, ' + nE + ' recursos externos.', { size: 9, color: '#444' });

    var v = op.victimas || {}, vr = op.victimasReg || [];
    if (opts.anon) vr = vr.map(function (x) { return Object.assign({}, x, { nombre: x.nombre ? 'Reservado' : '' }); });
    H('Víctimas (formato SCI-207)');
    doc.kv([['Heridos', v.heridos || 0], ['Fallecidos', v.fallecidos || 0], ['Rescatados', v.rescatados || 0], ['Evacuados', v.evacuados || 0]], 4);
    if (vr.length) doc.table([{ t: 'Hora', w: 9 }, { t: 'Víctima', w: 24 }, { t: 'Edad/Sexo', w: 10 }, { t: 'Triage', w: 15 }, { t: 'Lesiones', w: 20 }, { t: 'Destino / traslado', w: 22 }], vr.map(function (x) { return [ftime(x.ts).slice(0, 5), x.nombre || 'Sin identificar', [x.edad, x.sexo].filter(Boolean).join(' / '), TRIAGE[x.triage] || x.triage, x.lesion, [x.destino, x.transporte].filter(Boolean).join(' - ')]; }), { size: 8 });
    else doc.para('No se cargó un registro individual de víctimas.', { size: 9, color: '#6b7785' });

    H('Objetivos, hitos y pedidos de recursos');
    doc.table([{ t: 'Hito táctico', w: 70 }, { t: 'Estado', w: 15 }, { t: 'Hora', w: 15 }], (op.hitos || []).map(function (h) { return [h.texto, h.hecho ? 'Cumplido' : 'No cumplido', h.hecho ? ftime(h.doneAt) : '-']; }), { empty: 'Sin hitos.', size: 8 });
    doc.table([{ t: 'Objetivo', w: 70 }, { t: 'Estado', w: 15 }, { t: 'Hora', w: 15 }], (op.objetivos || []).map(function (o) { return [o.texto, o.hecho ? 'Cumplido' : 'Pendiente', o.hecho ? ftime(o.doneAt) : ftime(o.ts)]; }), { empty: 'Sin objetivos cargados.' });
    doc.table([{ t: 'Pedido', w: 56 }, { t: 'Categoría', w: 16 }, { t: 'Estado', w: 15 }, { t: 'Hora', w: 13 }], (op.pedidos || []).map(function (p) { return [p.texto, p.categoria, p.atendido ? 'Atendido' : 'Pendiente', ftime(p.ts)]; }), { empty: 'Sin pedidos de recursos.' });

    var c = op.cierre || {};
    H('Cierre de la operación');
    doc.kv([['Resultado', c.resultado], ['Causa probable (preliminar)', c.causa]], 2); doc.kv([['Daños y pérdidas', c.danios]], 1); doc.kv([['Observaciones', c.observaciones]], 1);

    H('Bitácora cronológica');
    doc.table([{ t: 'Hora', w: 13 }, { t: 'Registró', w: 24 }, { t: 'Evento', w: 63 }], (op.log || []).slice().sort(function (a, b) { return a.ts - b.ts; }).map(function (l) { return [ftime(l.ts), l.by === 'sistema' ? 'Sistema' : l.by && l.by.indexOf('eq:') === 0 ? 'Equipo ' + l.by.slice(3) : uname(users, l.by), (l.type === 'mayday' && !/^MAYDAY/.test(l.text) ? '[MAYDAY] ' : '') + l.text]; }), { size: 8, empty: 'Sin eventos.' });

    H('Resumen para carga en RUBA (ayuda memoria)');
    var units = recs.filter(function (r) { return r.kind === 'unidad'; }), pers = recs.filter(function (r) { return r.kind === 'personal'; }), insts = {};
    recs.filter(function (r) { return r.kind === 'externo'; }).forEach(function (r) { insts[r.institucion || r.nombre] = 1; });
    doc.kv([['Fecha del servicio', fdate(op.alarmAt)], ['Tipo de siniestro', op.tipo], ['Hora de alarma', ftime(op.alarmAt)], ['Hora de llegada (1.ª unidad)', first ? ftime(first) : '-'], ['Hora de finalización', ftime(op.closedAt)], ['Duración', fdur(dur)],
      ['Lugar', [op.direccion, op.localidad, cuartel.provincia].filter(Boolean).join(', ')], ['Resultado', c.resultado], ['Coordenadas', op.coords], ['Cantidad de unidades', units.length], ['Cantidad de bomberos', pers.length]], 2);
    doc.para('Unidades: ' + (units.length ? units.map(function (r) { return r.nombre + ' (escena ' + ftime(r.arrivedAt).slice(0, 5) + ', retiro ' + ftime(r.leftAt).slice(0, 5) + ')'; }).join('; ') : '-'), { size: 9 });
    doc.para('Personal interviniente: ' + (pers.length ? pers.map(function (r) { var u = userOf(r); return (u ? u.apellido + ' ' + u.nombre : r.nombre) + (u && u.legajo ? ' (Leg. ' + u.legajo + ')' : ''); }).join('; ') : '-'), { size: 9 });
    doc.para('Instituciones intervinientes (además del cuartel): ' + (Object.keys(insts).length ? Object.keys(insts).join('; ') : '-'), { size: 9 });
    doc.para('Este resumen es una ayuda memoria. Los campos del formulario vigente de RUBA pueden ser distintos: verificá los datos antes de cargarlos.', { size: 8, color: '#6b7785' });

    doc.ensure(90); doc.y += 28; var w3 = doc.width() / 2 - 20;
    doc.line(doc.mx, doc.y, doc.mx + w3, doc.y, { color: '#333', lw: 0.7 }); doc.line(doc.mx + w3 + 40, doc.y, doc.mx + 2 * w3 + 40, doc.y, { color: '#333', lw: 0.7 });
    doc.text('Comandante del incidente', doc.mx + w3 / 2, doc.y + 12, { size: 8.5, align: 'center' }); doc.text(uname(users, icFin), doc.mx + w3 / 2, doc.y + 23, { size: 8, align: 'center', color: '#555' });
    doc.text('Jefe de cuartel', doc.mx + w3 + 40 + w3 / 2, doc.y + 12, { size: 8.5, align: 'center' }); doc.y += 40;
    doc.para((partial ? 'PARTE PARCIAL: la operación sigue en curso y los datos pueden cambiar. ' : '') + 'Documento generado automáticamente por la aplicación SCI Bomberos como respaldo de la intervención. Debe ser verificado antes de cargarse o adjuntarse en el sistema oficial (RUBA).' + (opts.anon ? ' Los nombres de las víctimas fueron ocultados.' : ''), { size: 7.5, color: '#6b7785' });
    return { bytes: doc.finish(), filename: (partial ? 'Parte_PARCIAL_' : 'Intervencion_') + safe(op.num) + '_' + safe(cuartel.nombre) + '_' + fdate(op.alarmAt).split('/').reverse().join('-') + '.pdf' };
  }
  var API = { build: build, fdt: fdt, fdate: fdate, ftime: ftime, fdur: fdur, uname: uname, trackLen: trackLen };
  root.SCI_REPORT = API; if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
