/* Generador de códigos QR (modo byte, UTF-8, corrección M, versiones 1-20). Sin dependencias. */
(function (root) {
  'use strict';
  // [EC por bloque, bloques G1, datos G1, bloques G2, datos G2] – nivel M
  var EC = [null, [10, 1, 16, 0, 0], [16, 1, 28, 0, 0], [26, 1, 44, 0, 0], [18, 2, 32, 0, 0], [24, 2, 43, 0, 0], [16, 4, 27, 0, 0], [18, 4, 31, 0, 0], [22, 2, 38, 2, 39], [22, 3, 36, 2, 37], [26, 4, 43, 1, 44],
    [30, 1, 50, 4, 51], [22, 6, 36, 2, 37], [22, 8, 37, 1, 38], [24, 4, 40, 5, 41], [24, 5, 41, 5, 42], [28, 7, 45, 3, 46], [28, 10, 46, 1, 47], [26, 9, 43, 4, 44], [26, 3, 44, 11, 45], [26, 3, 41, 13, 42]];
  var AL = [null, [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50], [6, 30, 54], [6, 32, 58], [6, 34, 62], [6, 26, 46, 66], [6, 26, 48, 70], [6, 26, 50, 74], [6, 30, 54, 78], [6, 30, 56, 82], [6, 30, 58, 86], [6, 34, 62, 90]];
  var EXP = new Array(512), LOG = new Array(256);
  (function () { var x = 1; for (var i = 0; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 256) x ^= 0x11D; } for (i = 255; i < 512; i++) EXP[i] = EXP[i - 255]; })();
  function mul(a, b) { return a && b ? EXP[LOG[a] + LOG[b]] : 0; }
  function rsGen(n) { var g = [1]; for (var i = 0; i < n; i++) { var ng = new Array(g.length + 1).fill(0); for (var j = 0; j < g.length; j++) { ng[j] ^= g[j]; ng[j + 1] ^= mul(g[j], EXP[i]); } g = ng; } return g; }
  function rs(data, n) { var g = rsGen(n), r = data.concat(new Array(n).fill(0)); for (var i = 0; i < data.length; i++) { var c = r[i]; if (c) for (var j = 0; j < g.length; j++) r[i + j] ^= mul(g[j], c); } return r.slice(data.length); }
  function utf8(s) { var b = []; s = unescape(encodeURIComponent(s)); for (var i = 0; i < s.length; i++) b.push(s.charCodeAt(i)); return b; }
  function bch(v, poly, bits) { var p = poly.toString(2).length - 1, x = v << p; while (x.toString(2).length - 1 >= p) x ^= poly << (x.toString(2).length - 1 - p); return (v << p) | x; }

  function encode(text) {
    var bytes = utf8(text), ver = 0, e;
    for (var v = 1; v <= 20; v++) { e = EC[v]; var cap = e[1] * e[2] + e[3] * e[4]; if (4 + (v < 10 ? 8 : 16) + bytes.length * 8 <= cap * 8) { ver = v; break; } }
    if (!ver) throw new Error('Texto demasiado largo para el QR');
    e = EC[ver]; var capCw = e[1] * e[2] + e[3] * e[4], bits = [];
    function put(val, n) { for (var i = n - 1; i >= 0; i--) bits.push((val >>> i) & 1); }
    put(4, 4); put(bytes.length, ver < 10 ? 8 : 16); bytes.forEach(function (b) { put(b, 8); });
    put(0, Math.min(4, capCw * 8 - bits.length)); while (bits.length % 8) bits.push(0);
    var cw = []; for (var i = 0; i < bits.length; i += 8) { var x = 0; for (var j = 0; j < 8; j++) x = (x << 1) | bits[i + j]; cw.push(x); }
    for (var pd = 0; cw.length < capCw; pd++) cw.push(pd % 2 ? 0x11 : 0xEC);
    var blocks = [], ecs = [], k = 0;
    [[e[1], e[2]], [e[3], e[4]]].forEach(function (g) { for (var b = 0; b < g[0]; b++) { var d = cw.slice(k, k + g[1]); k += g[1]; blocks.push(d); ecs.push(rs(d, e[0])); } });
    var out = [], mx = Math.max(e[2], e[4]);
    for (i = 0; i < mx; i++) blocks.forEach(function (b) { if (i < b.length) out.push(b[i]); });
    for (i = 0; i < e[0]; i++) ecs.forEach(function (b) { out.push(b[i]); });
    return { ver: ver, cw: out };
  }
  function build(text) {
    var en = encode(text), ver = en.ver, n = ver * 4 + 17, m = [], fn = [];
    for (var i = 0; i < n; i++) { m.push(new Array(n).fill(0)); fn.push(new Array(n).fill(false)); }
    function set(r, c, v) { m[r][c] = v ? 1 : 0; fn[r][c] = true; }
    function finder(r, c) { for (var y = -1; y <= 7; y++) for (var x = -1; x <= 7; x++) { var rr = r + y, cc = c + x; if (rr < 0 || cc < 0 || rr >= n || cc >= n) continue; var on = (y >= 0 && y <= 6 && (x === 0 || x === 6)) || (x >= 0 && x <= 6 && (y === 0 || y === 6)) || (y >= 2 && y <= 4 && x >= 2 && x <= 4); set(rr, cc, on); } }
    finder(0, 0); finder(0, n - 7); finder(n - 7, 0);
    for (i = 8; i < n - 8; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
    var al = AL[ver];
    al.forEach(function (r) { al.forEach(function (c) { if ((r < 9 && c < 9) || (r < 9 && c > n - 10) || (r > n - 10 && c < 9)) return; for (var y = -2; y <= 2; y++) for (var x = -2; x <= 2; x++) set(r + y, c + x, Math.max(Math.abs(x), Math.abs(y)) !== 1); }); });
    for (i = 0; i < 9; i++) { if (!fn[8][i]) fn[8][i] = true; if (!fn[i][8]) fn[i][8] = true; }
    for (i = 0; i < 8; i++) { fn[8][n - 1 - i] = true; fn[n - 1 - i][8] = true; }
    set(n - 8, 8, 1);
    if (ver >= 7) { var vi = bch(ver, 0x1F25); for (i = 0; i < 18; i++) { var b = (vi >> i) & 1, a = Math.floor(i / 3), c2 = i % 3; set(a, n - 11 + c2, b); set(n - 11 + c2, a, b); } }
    var data = [], rem = ver >= 2 && ver <= 6 ? 7 : ver >= 14 ? 3 : 0;
    en.cw.forEach(function (c) { for (var j = 7; j >= 0; j--) data.push((c >> j) & 1); }); for (i = 0; i < rem; i++) data.push(0);
    var idx = 0;
    for (var col = n - 1; col > 0; col -= 2) { if (col === 6) col--; for (var cnt = 0; cnt < n; cnt++) { var up = ((n - 1 - col) >> 1) % 2 === 0 ? true : false, row = up ? n - 1 - cnt : cnt; for (var dc = 0; dc < 2; dc++) { var cc = col - dc; if (fn[row][cc]) continue; m[row][cc] = idx < data.length ? data[idx++] : 0; } } }
    var masks = [function (r, c) { return (r + c) % 2 === 0; }, function (r) { return r % 2 === 0; }, function (r, c) { return c % 3 === 0; }, function (r, c) { return (r + c) % 3 === 0; }, function (r, c) { return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0; }, function (r, c) { return (r * c) % 2 + (r * c) % 3 === 0; }, function (r, c) { return ((r * c) % 2 + (r * c) % 3) % 2 === 0; }, function (r, c) { return ((r + c) % 2 + (r * c) % 3) % 2 === 0; }];
    function withMask(k) {
      var q = m.map(function (row) { return row.slice(); });
      for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (!fn[r][c] && masks[k](r, c)) q[r][c] ^= 1;
      var f = bch((0 << 3) | k, 0x537) ^ 0x5412;   // nivel M = 00
      for (var i = 0; i < 15; i++) {
        var bit = (f >> i) & 1;
        if (i < 6) q[i][8] = bit; else if (i < 8) q[i + 1][8] = bit; else q[n - 15 + i][8] = bit;
        if (i < 8) q[8][n - 1 - i] = bit; else if (i < 9) q[8][15 - i - 1 + 1] = bit; else q[8][15 - i - 1] = bit;
      }
      q[n - 8][8] = 1; return q;
    }
    function penalty(q) {
      var p = 0, r, c, run, dark = 0;
      for (r = 0; r < n; r++) for (var dir = 0; dir < 2; dir++) { run = 1; for (c = 1; c < n; c++) { var a = dir ? q[c][r] : q[r][c], b = dir ? q[c - 1][r] : q[r][c - 1]; if (a === b) { run++; if (run === 5) p += 3; else if (run > 5) p++; } else run = 1; } }
      for (r = 0; r < n - 1; r++) for (c = 0; c < n - 1; c++) { var s = q[r][c] + q[r + 1][c] + q[r][c + 1] + q[r + 1][c + 1]; if (s === 0 || s === 4) p += 3; }
      var pat = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0], pat2 = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1];
      for (r = 0; r < n; r++) for (c = 0; c <= n - 11; c++) { var h1 = true, h2 = true, v1 = true, v2 = true; for (var k = 0; k < 11; k++) { if (q[r][c + k] !== pat[k]) h1 = false; if (q[r][c + k] !== pat2[k]) h2 = false; if (q[c + k][r] !== pat[k]) v1 = false; if (q[c + k][r] !== pat2[k]) v2 = false; } p += 40 * (h1 + h2 + v1 + v2); }
      for (r = 0; r < n; r++) for (c = 0; c < n; c++) dark += q[r][c];
      p += Math.floor(Math.abs(dark * 100 / (n * n) - 50) / 5) * 10; return p;
    }
    var best = null, bp = 1e9; for (var k = 0; k < 8; k++) { var q = withMask(k), pp = penalty(q); if (pp < bp) { bp = pp; best = q; } }
    return { size: n, version: ver, modules: best };
  }
  function svg(text, o) {
    o = o || {}; var q = build(text), b = o.border == null ? 4 : o.border, n = q.size + b * 2, d = '';
    for (var r = 0; r < q.size; r++) for (var c = 0; c < q.size; c++) if (q.modules[r][c]) d += 'M' + (c + b) + ' ' + (r + b) + 'h1v1h-1z';
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + n + ' ' + n + '" shape-rendering="crispEdges"' + (o.size ? ' width="' + o.size + '" height="' + o.size + '"' : '') + '><rect width="' + n + '" height="' + n + '" fill="#fff"/><path d="' + d + '" fill="#000"/></svg>';
  }
  function canvas(text, scale, border) {
    var q = build(text), b = border == null ? 4 : border, s = scale || 8, cv = document.createElement('canvas'), n = (q.size + b * 2) * s;
    cv.width = cv.height = n; var x = cv.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, n, n); x.fillStyle = '#000';
    for (var r = 0; r < q.size; r++) for (var c = 0; c < q.size; c++) if (q.modules[r][c]) x.fillRect((c + b) * s, (r + b) * s, s, s);
    return cv;
  }
  var API = { build: build, svg: svg, canvas: canvas };
  root.SCI_QR = API; if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
