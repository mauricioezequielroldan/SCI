/* SCI Bomberos – Croquis sobre el mapa del lugar + equipos en vivo (v2.4)
   Se carga DESPUÉS de beta.js. Agrega al croquis:
   1) «🗺 Mapa del lugar» / «🛰 Satélite»: descarga el mapa alrededor del siniestro y lo usa como fondo (necesita internet).
   2) Capa «👥 Equipos en vivo»: recorridos y última posición de cada equipo dibujados sobre el croquis, ubicados en el mapa.
   Si el fondo se cambia por una foto o se quita, la capa de equipos se apaga sola (ya no hay coordenadas). */
'use strict';
const CM_SRC = window.SCI_TILES || {
  calles: { url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', max: 19, attr: '© OpenStreetMap' },
  satelite: { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', max: 18, attr: 'Imagen © Esri, Maxar, Earthstar Geographics' }
};
const cmWx = (lon, z) => (lon + 180) / 360 * 256 * Math.pow(2, z);
const cmWy = (lat, z) => { const r = lat * Math.PI / 180; return (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * 256 * Math.pow(2, z); };
const cmSig = u => u ? u.length + ':' + u.slice(-48) : '';
let cmShow = true;
function cmPoints(op) {
  const pts = [], p = GEO.parse(op.coords); if (p && !p.error) pts.push([p.lat, p.lon]);
  (op.equipos || []).forEach(e => { (e.track || []).forEach(q => pts.push([q[1], q[2]])); if (e.last) pts.push([e.last.lat, e.last.lon]); });
  return pts;
}
const cmGeoOk = op => !!(op && op.croMapa && croV && croV.baseUrl && cmSig(croV.baseUrl) === op.croMapa.sig);

/* ---------- Descargar el mapa y usarlo de fondo ---------- */
function cmNeedLoc(kind) {
  modal('📍 Falta la ubicación', '<p>Para traer el mapa necesito saber dónde es el siniestro.</p><p class="muted"><small>Podés usar el GPS de este dispositivo (si estás en el lugar) o cargar las coordenadas a mano.</small></p>',
    [{ label: 'Cancelar' }, { label: 'Cargar a mano', fn: () => { setTimeout(() => ACT['ubicacion'](), 30); } }, {
      label: '📍 Usar mi GPS', cls: 'primary', fn: () => {
        toast('Buscando ubicación…', '', 9000);
        gpsOnce(p => { mut(o => { o.coords = GEO.fmt(p.coords.latitude, p.coords.longitude); logEv(o, 'Ubicación tomada por GPS: ' + o.coords, 'info'); }); setTimeout(() => cmBuild(kind), 400); }, m => toast(m, 'bad', 7000));
      }
    }]);
}
async function cmBuild(kind) {
  const op = OPx(); if (!isEditor(op) || !croV) return;
  if (!navigator.onLine) return toast('Sin internet no se puede bajar el mapa. Usá «Imagen / captura» con una captura de pantalla.', 'bad', 7000);
  const src = CM_SRC[kind], pts = cmPoints(op); if (!pts.length) return cmNeedLoc(kind);
  const W = CRO_W, H = CRO_H, la = pts.map(p => p[0]), lo = pts.map(p => p[1]);
  const mnla = Math.min.apply(null, la), mxla = Math.max.apply(null, la), mnlo = Math.min.apply(null, lo), mxlo = Math.max.apply(null, lo);
  let z = Math.min(17, src.max); while (z > 3 && (cmWx(mxlo, z) - cmWx(mnlo, z) > W - 220 || cmWy(mnla, z) - cmWy(mxla, z) > H - 220)) z--;
  const x0 = Math.round((cmWx(mnlo, z) + cmWx(mxlo, z)) / 2 - W / 2), y0 = Math.round((cmWy(mxla, z) + cmWy(mnla, z)) / 2 - H / 2), n = Math.pow(2, z), jobs = [];
  toast('🗺 Descargando el mapa del lugar…', '', 9000);
  for (let tx = Math.floor(x0 / 256); tx <= Math.floor((x0 + W - 1) / 256); tx++) for (let ty = Math.floor(y0 / 256); ty <= Math.floor((y0 + H - 1) / 256); ty++) {
    if (ty < 0 || ty >= n) continue; const xx = ((tx % n) + n) % n;
    jobs.push(new Promise(res => { const im = new Image(), t = setTimeout(() => res(null), 12000); im.crossOrigin = 'anonymous'; im.onload = () => { clearTimeout(t); res({ im, tx, ty }); }; im.onerror = () => { clearTimeout(t); res(null); }; im.src = src.url.replace('{z}', z).replace('{x}', xx).replace('{y}', ty); }));
  }
  const got = (await Promise.all(jobs)).filter(Boolean);
  if (!got.length) return toast('No se pudo descargar el mapa (sin internet o el servicio de mapas no respondió). Usá «Imagen / captura» con una captura de pantalla.', 'bad', 8000);
  const cv = D.createElement('canvas'); cv.width = W; cv.height = H; const x = cv.getContext('2d');
  x.fillStyle = '#e9edf1'; x.fillRect(0, 0, W, H); got.forEach(g => x.drawImage(g.im, g.tx * 256 - x0, g.ty * 256 - y0, 256, 256));
  const lat0 = (mnla + mxla) / 2, mpp = 156543.03 * Math.cos(lat0 * Math.PI / 180) / n, nice = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000]; let m = nice[0]; nice.forEach(v => { if (v / mpp <= 170) m = v; });
  x.fillStyle = 'rgba(255,255,255,.85)'; x.fillRect(12, H - 46, m / mpp + 24, 36); x.fillStyle = '#111'; x.fillRect(24, H - 22, m / mpp, 6); x.font = 'bold 14px Arial'; x.textAlign = 'left'; x.fillText(m >= 1000 ? m / 1000 + ' km' : m + ' m', 24, H - 28);
  x.font = '12px Arial'; const aw = x.measureText(src.attr).width; x.fillStyle = 'rgba(255,255,255,.85)'; x.fillRect(W - aw - 14, H - 20, aw + 10, 18); x.fillStyle = '#222'; x.fillText(src.attr, W - aw - 9, H - 7);
  let url; try { url = cv.toDataURL('image/jpeg', 0.82); } catch (e) { return toast('El servicio de mapas no permitió copiar la imagen. Usá «Imagen / captura» con una captura de pantalla.', 'bad', 8000); }
  const im = new Image();
  im.onload = () => {
    const o = OPx(); if (!croV || !o || o.id !== op.id) return;
    croUndoPush(); croV.base = im; croV.baseUrl = url;
    o.croMapa = { z, x0, y0, kind, sig: cmSig(url), ts: now() };
    logEv(o, 'Croquis: mapa del lugar (' + (kind === 'satelite' ? 'satélite' : 'calles') + ')', 'nota');
    croCommit(); save(true); cmSyncUI();
    const nb = $('#nobase'); if (nb) nb.innerHTML = '<button type="button" class="btn sm" data-act="cro-nobase">✖ Quitar imagen</button>';
    toast(got.length < jobs.length ? '⚠ Mapa cargado con algunas partes faltantes (señal débil). Podés reintentar.' : '✔ Mapa del lugar cargado. Ahora marcá encima.', got.length < jobs.length ? 'bad' : '', 5000);
  };
  im.src = url;
}
ACT['cro-map'] = el => cmBuild(el.dataset.k);

/* ---------- Capa de equipos en vivo ---------- */
function cmDrawTeams(x, op) {
  const g = op.croMapa, P = (lat, lon) => [cmWx(lon, g.z) - g.x0, cmWy(lat, g.z) - g.y0], t = now();
  x.save(); x.lineJoin = 'round'; x.lineCap = 'round';
  (op.equipos || []).forEach(e => {
    const tr = (e.track || []).map(q => P(q[1], q[2]));
    if (tr.length > 1) {
      [['rgba(255,255,255,.9)', 9], [e.color, 5]].forEach(s => { x.strokeStyle = s[0]; x.lineWidth = s[1]; x.beginPath(); tr.forEach((p, i) => i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])); x.stroke(); });
      x.fillStyle = '#fff'; x.strokeStyle = e.color; x.lineWidth = 3; x.beginPath(); x.arc(tr[0][0], tr[0][1], 6, 0, 7); x.fill(); x.stroke();
    }
    if (e.last) {
      const p = P(e.last.lat, e.last.lon), stale = t - e.last.ts > 5 * 60000, lbl = e.nombre + ' · ' + MAP.ago(e.last.ts);
      x.globalAlpha = stale ? 0.6 : 1; x.fillStyle = e.color; x.strokeStyle = '#fff'; x.lineWidth = 4; x.beginPath(); x.arc(p[0], p[1], 12, 0, 7); x.fill(); x.stroke();
      x.font = 'bold 15px Arial'; const w = x.measureText(lbl).width; x.fillStyle = 'rgba(17,24,32,.86)'; x.fillRect(p[0] + 16, p[1] - 13, w + 14, 26); x.fillStyle = '#fff'; x.textAlign = 'left'; x.textBaseline = 'middle'; x.fillText(lbl, p[0] + 23, p[1]); x.globalAlpha = 1;
    }
  });
  const ip = GEO.parse(op.coords);
  if (ip && !ip.error) { const p = P(ip.lat, ip.lon); x.fillStyle = '#d62828'; x.strokeStyle = '#fff'; x.lineWidth = 4; x.beginPath(); x.arc(p[0], p[1], 15, 0, 7); x.fill(); x.stroke(); x.fillStyle = '#fff'; x.font = 'bold 18px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('!', p[0], p[1] + 1); }
  x.restore();
}
const _croOverlaysM = croOverlays;
croOverlays = function (x, op) { if (cmShow && cmGeoOk(op)) cmDrawTeams(x, op); _croOverlaysM(x, op); };
function cmSyncUI() {
  const box = $('#cmteams'), op = OPx(); if (!box || !op) return;
  if (cmGeoOk(op)) {
    box.innerHTML = '<label class="check"><input type="checkbox" data-act="cm-toggle"' + (cmShow ? ' checked' : '') + '> 👥 Mostrar equipos en vivo sobre el croquis</label>' +
      ((op.equipos || []).length ? '<div class="row" style="gap:6px">' + op.equipos.map(e => '<span class="eqchip" style="--ec:' + e.color + '">' + esc(e.nombre) + ' <small>' + (e.last ? MAP.ago(e.last.ts) : 'sin posición') + '</small></span>').join('') + '</div><p class="muted"><small>Las posiciones se actualizan solas. ! = siniestro · punto blanco = inicio del recorrido.</small></p>' : '<p class="muted"><small>Cuando los equipos escaneen su QR y compartan el recorrido, van a aparecer acá.</small></p>');
  } else box.innerHTML = (op.equipos || []).length ? '<p class="muted"><small>💡 Tocá <b>«🗺 Mapa del lugar»</b> para ver los recorridos de los equipos sobre el croquis.</small></p>' : '';
}
ACT['cm-toggle'] = () => { cmShow = !cmShow; croRender(); cmSyncUI(); };

/* ---------- Integración con la pantalla del croquis ---------- */
const _oCroquisM = oCroquis;
oCroquis = function (op, ed) {
  let h = _oCroquisM(op, ed);
  if (ed) h = h.replace('<span id="nobase">', '<button type="button" class="btn sm primary" data-act="cro-map" data-k="calles">🗺 Mapa del lugar</button><button type="button" class="btn sm" data-act="cro-map" data-k="satelite">🛰 Satélite</button><span id="nobase">');
  h = h.replace('<div class="legend">', '<div id="cmteams"></div><div class="legend">');
  if (ed) h = h.replace('<p class="muted"><small>Cargá una captura', '<p class="muted"><small><b>«Mapa del lugar»</b> trae el mapa del siniestro (necesita internet). Sin internet: sacá una captura de pantalla de Google Maps y cargala con «Imagen / captura». También podés cargar una captura');
  return h;
};
const _initCroquisM = initCroquis;
initCroquis = function () { _initCroquisM(); let n = 0; const w = () => { if (croV && croV.loading && n++ < 40) return setTimeout(w, 100); cmSyncUI(); if (croV) croRender(); }; w(); };
// al salir de la pestaña o cerrar, se guarda la imagen con las posiciones más recientes
const _optabM = ACT['optab'];
ACT['optab'] = el => { const op = OPx(); if (S.optab === 'croquis' && el.dataset.t !== 'croquis' && isEditor(op) && cmGeoOk(op)) croCommit(); _optabM(el); };
const _closeM = ACT['op-close'];
ACT['op-close'] = () => { const op = OPx(); if (S.optab === 'croquis' && isEditor(op) && cmGeoOk(op)) croCommit(); _closeM(); };
// refresco en vivo mientras se mira el croquis
setInterval(() => { const op = OPx(); if (S.view === 'op' && S.optab === 'croquis' && croV && !croV.loading && cmGeoOk(op) && cmShow) { croRender(); cmSyncUI(); } }, 5000);
