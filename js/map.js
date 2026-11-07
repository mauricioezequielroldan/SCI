/* Mapa liviano sin dependencias: mosaicos de OpenStreetMap (si hay internet) + recorridos de equipos en SVG.
   Sin conexión muestra una grilla y los recorridos igual se ven. También dibuja una versión estática para el PDF. */
(function (root) {
  'use strict';
  var TILE = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
  function wx(lon, z) { return (lon + 180) / 360 * 256 * Math.pow(2, z); }
  function wy(lat, z) { var r = lat * Math.PI / 180; return (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * 256 * Math.pow(2, z); }
  function lonOf(x, z) { return x / (256 * Math.pow(2, z)) * 360 - 180; }
  function latOf(y, z) { var n = Math.PI - 2 * Math.PI * y / (256 * Math.pow(2, z)); return 180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function points(d) { var p = []; if (d.incident) p.push(d.incident); (d.teams || []).forEach(function (t) { (t.track || []).forEach(function (q) { p.push([q[1], q[2]]); }); if (t.last) p.push([t.last.lat, t.last.lon]); }); return p; }
  function ago(ts) { var s = Math.max(0, Math.round((Date.now() - ts) / 1000)); return s < 60 ? 'hace ' + s + ' s' : s < 3600 ? 'hace ' + Math.floor(s / 60) + ' min' : 'hace ' + Math.floor(s / 3600) + ' h'; }

  function create(el) {
    el.innerHTML = '<div class="mapw"><div class="map-tiles"></div><svg class="map-svg"></svg><div class="map-ctl"><button type="button" data-z="1" aria-label="Acercar">+</button><button type="button" data-z="-1" aria-label="Alejar">−</button><button type="button" data-fit="1" aria-label="Ver todo">⤢</button></div><div class="map-attr">© OpenStreetMap</div><div class="map-empty hidden">Sin posiciones todavía. Cuando los equipos compartan su ubicación, aparecen acá.</div></div>';
    var w = el.firstChild, tl = w.querySelector('.map-tiles'), svg = w.querySelector('.map-svg'), st = { z: 15, cx: 0, cy: 0, data: { teams: [] }, user: false }, imgs = {}, drag = null, alive = true;
    function size() { return { w: w.clientWidth || 300, h: w.clientHeight || 260 }; }
    function render() {
      if (!alive) return; var s = size(), z = st.z, x0 = st.cx - s.w / 2, y0 = st.cy - s.h / 2, n = Math.pow(2, z), keep = {};
      if (navigator.onLine !== false) {
        for (var tx = Math.floor(x0 / 256); tx <= Math.floor((x0 + s.w) / 256); tx++) for (var ty = Math.floor(y0 / 256); ty <= Math.floor((y0 + s.h) / 256); ty++) {
          if (ty < 0 || ty >= n) continue; var xx = ((tx % n) + n) % n, k = z + '/' + xx + '/' + ty; keep[k] = 1;
          var im = imgs[k]; if (!im) { im = imgs[k] = new Image(); im.alt = ''; im.draggable = false; im.onerror = function () { this.style.visibility = 'hidden'; }; im.src = TILE.replace('{z}', z).replace('{x}', xx).replace('{y}', ty); tl.appendChild(im); }
          im.style.left = Math.round(tx * 256 - x0) + 'px'; im.style.top = Math.round(ty * 256 - y0) + 'px';
        }
      }
      Object.keys(imgs).forEach(function (k) { if (!keep[k]) { imgs[k].remove(); delete imgs[k]; } });
      var h = '', d = st.data;
      function P(lat, lon) { return [wx(lon, z) - x0, wy(lat, z) - y0]; }
      (d.teams || []).forEach(function (t) {
        var tr = (t.track || []).map(function (q) { var p = P(q[1], q[2]); return p[0].toFixed(1) + ',' + p[1].toFixed(1); });
        if (tr.length > 1) h += '<polyline points="' + tr.join(' ') + '" fill="none" stroke="#fff" stroke-width="7" stroke-linejoin="round" stroke-linecap="round" opacity=".85"/><polyline points="' + tr.join(' ') + '" fill="none" stroke="' + t.color + '" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/>';
      });
      if (d.incident) { var ip = P(d.incident[0], d.incident[1]); h += '<g transform="translate(' + ip[0].toFixed(1) + ',' + ip[1].toFixed(1) + ')"><circle r="15" fill="#d62828" stroke="#fff" stroke-width="3"/><text y="5" text-anchor="middle" font-size="15" font-weight="800" fill="#fff">!</text></g>'; }
      (d.teams || []).forEach(function (t) {
        if (!t.last) return; var p = P(t.last.lat, t.last.lon), lbl = t.name + ' · ' + ago(t.last.ts), lw = Math.min(260, 16 + lbl.length * 7.9);
        h += '<g transform="translate(' + p[0].toFixed(1) + ',' + p[1].toFixed(1) + ')"' + (t.stale ? ' opacity=".55"' : '') + '><circle r="11" fill="' + t.color + '" stroke="#fff" stroke-width="3"/>' + (t.alert ? '<circle r="18" fill="none" stroke="#ff1f3d" stroke-width="4"><animate attributeName="r" values="14;26;14" dur="1.2s" repeatCount="indefinite"/></circle>' : '') +
          '<rect x="15" y="-12" rx="6" width="' + lw + '" height="24" fill="rgba(17,24,32,.86)"/><text x="22" y="5" font-size="13" font-weight="700" fill="#fff">' + esc(lbl) + '</text></g>';
      });
      svg.innerHTML = h;
      w.querySelector('.map-empty').classList.toggle('hidden', points(d).length > 0);
    }
    function center(lat, lon, z) { if (z != null) st.z = z; st.cx = wx(lon, st.z); st.cy = wy(lat, st.z); }
    function fit() {
      var p = points(st.data), s = size();
      if (!p.length) { center(-34.6, -63.6, 4); render(); return; }
      var la = p.map(function (q) { return q[0]; }), lo = p.map(function (q) { return q[1]; }), mnla = Math.min.apply(null, la), mxla = Math.max.apply(null, la), mnlo = Math.min.apply(null, lo), mxlo = Math.max.apply(null, lo), z = 17;
      while (z > 3 && (wx(mxlo, z) - wx(mnlo, z) > s.w - 80 || wy(mnla, z) - wy(mxla, z) > s.h - 80)) z--;
      st.z = z; st.cx = (wx(mnlo, z) + wx(mxlo, z)) / 2; st.cy = (wy(mxla, z) + wy(mnla, z)) / 2; render();
    }
    function zoom(dz) { var s = size(), lat = latOf(st.cy, st.z), lon = lonOf(st.cx, st.z); st.z = Math.max(3, Math.min(19, st.z + dz)); center(lat, lon); st.user = true; render(); }
    w.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; if (b.dataset.z) zoom(+b.dataset.z); else { st.user = false; fit(); } });
    w.addEventListener('pointerdown', function (e) { if (e.target.closest('button')) return; drag = { x: e.clientX, y: e.clientY, cx: st.cx, cy: st.cy }; try { w.setPointerCapture(e.pointerId); } catch (er) { } });
    w.addEventListener('pointermove', function (e) { if (!drag) return; st.cx = drag.cx - (e.clientX - drag.x); st.cy = drag.cy - (e.clientY - drag.y); st.user = true; render(); });
    w.addEventListener('pointerup', function () { drag = null; }); w.addEventListener('pointercancel', function () { drag = null; });
    w.addEventListener('wheel', function (e) { e.preventDefault(); zoom(e.deltaY < 0 ? 1 : -1); }, { passive: false });
    return {
      set: function (data) { st.data = data || { teams: [] }; if (!st.user) fit(); else render(); },
      fit: function () { st.user = false; fit(); }, refresh: render,
      getView: function () { return { z: st.z, cx: st.cx, cy: st.cy, user: st.user }; }, setView: function (v) { if (v) { st.z = v.z; st.cx = v.cx; st.cy = v.cy; st.user = v.user; } },
      destroy: function () { alive = false; el.innerHTML = ''; }
    };
  }

  /* Versión estática (para el PDF): proyección local, escala y norte. Devuelve un canvas. */
  function drawStatic(d, W, H) {
    var cv = document.createElement('canvas'); cv.width = W; cv.height = H; var x = cv.getContext('2d'), p = points(d);
    x.fillStyle = '#fff'; x.fillRect(0, 0, W, H); x.strokeStyle = '#e8ecf0'; x.lineWidth = 1;
    for (var i = 40; i < W; i += 40) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, H); x.stroke(); } for (i = 40; i < H; i += 40) { x.beginPath(); x.moveTo(0, i); x.lineTo(W, i); x.stroke(); }
    if (!p.length) { x.fillStyle = '#777'; x.font = '20px Arial'; x.textAlign = 'center'; x.fillText('Sin recorridos registrados', W / 2, H / 2); return cv; }
    var la = p.map(function (q) { return q[0]; }), lo = p.map(function (q) { return q[1]; }), c0 = (Math.min.apply(null, la) + Math.max.apply(null, la)) / 2, k = Math.cos(c0 * Math.PI / 180);
    var mnx = Math.min.apply(null, lo) * k, mxx = Math.max.apply(null, lo) * k, mny = Math.min.apply(null, la), mxy = Math.max.apply(null, la);
    var spanx = Math.max(mxx - mnx, 0.0006), spany = Math.max(mxy - mny, 0.0006), sc = Math.min((W - 120) / spanx, (H - 120) / spany), ox = W / 2 - (mnx + mxx) / 2 * sc, oy = H / 2 + (mny + mxy) / 2 * sc;
    function P(lat, lon) { return [lon * k * sc + ox, -lat * sc + oy]; }
    (d.teams || []).forEach(function (t) {
      var tr = t.track || []; if (tr.length > 1) { x.strokeStyle = t.color; x.lineWidth = 5; x.lineJoin = 'round'; x.lineCap = 'round'; x.beginPath(); tr.forEach(function (q, j) { var a = P(q[1], q[2]); if (j) x.lineTo(a[0], a[1]); else x.moveTo(a[0], a[1]); }); x.stroke();
        var s0 = P(tr[0][1], tr[0][2]); x.fillStyle = '#fff'; x.strokeStyle = t.color; x.lineWidth = 3; x.beginPath(); x.arc(s0[0], s0[1], 7, 0, 7); x.fill(); x.stroke(); }
      if (t.last) { var a = P(t.last.lat, t.last.lon); x.fillStyle = t.color; x.strokeStyle = '#fff'; x.lineWidth = 3; x.beginPath(); x.arc(a[0], a[1], 11, 0, 7); x.fill(); x.stroke(); x.fillStyle = '#111'; x.font = 'bold 17px Arial'; x.textAlign = 'left'; x.fillText(t.name, a[0] + 15, a[1] + 6); }
    });
    if (d.incident) { var ip = P(d.incident[0], d.incident[1]); x.fillStyle = '#d62828'; x.strokeStyle = '#fff'; x.lineWidth = 3; x.beginPath(); x.arc(ip[0], ip[1], 14, 0, 7); x.fill(); x.stroke(); x.fillStyle = '#fff'; x.font = 'bold 18px Arial'; x.textAlign = 'center'; x.fillText('!', ip[0], ip[1] + 6); }
    var mpp = 111320 / sc, target = mpp * 160, nice = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000], m = nice[0];
    nice.forEach(function (v) { if (v <= target) m = v; }); var px = m / mpp;
    x.fillStyle = '#111'; x.fillRect(20, H - 30, px, 6); x.font = 'bold 15px Arial'; x.textAlign = 'left'; x.fillText(m >= 1000 ? (m / 1000) + ' km' : m + ' m', 20, H - 38);
    x.beginPath(); x.moveTo(W - 34, 18); x.lineTo(W - 22, 52); x.lineTo(W - 34, 44); x.lineTo(W - 46, 52); x.closePath(); x.fill(); x.font = 'bold 17px Arial'; x.textAlign = 'center'; x.fillText('N', W - 34, 72);
    return cv;
  }
  var API = { create: create, drawStatic: drawStatic, ago: ago };
  root.SCI_MAP = API;
})(typeof window !== 'undefined' ? window : globalThis);
