/* Generador de PDF mínimo, sin dependencias (A4, Helvetica, JPEG). Funciona offline en el navegador. */
(function (root) {
  'use strict';
  var WR = ('278 278 355 556 556 889 667 191 333 333 389 584 278 333 278 278 556 556 556 556 556 556 556 556 556 556 278 278 584 584 584 556 1015 667 667 722 722 667 611 778 722 278 500 667 556 833 722 778 667 778 722 667 611 722 667 944 667 667 611 278 278 278 469 556 333 556 556 500 556 556 278 556 556 222 222 500 222 833 556 556 556 556 333 500 278 556 500 722 500 500 500 334 260 334 584').split(' ').map(Number);
  var WB = ('278 333 474 556 556 889 722 238 333 333 389 584 278 333 278 278 556 556 556 556 556 556 556 556 556 556 333 333 584 584 584 611 975 722 722 722 722 667 611 778 722 278 556 722 611 833 722 778 667 778 722 667 611 722 667 944 667 667 611 333 278 333 584 556 333 556 611 556 611 556 333 611 611 278 278 556 278 889 611 611 611 611 389 556 333 611 556 778 556 556 500 389 280 389 584').split(' ').map(Number);
  function enc(s) {
    s = String(s == null ? '' : s).replace(/[\u2018\u2019\u201A]/g, "'").replace(/[\u201C\u201D\u201E]/g, '"').replace(/[\u2013\u2014\u2212]/g, '-').replace(/\u2026/g, '...')
      .replace(/[\u2022\u25CF\u25AA]/g, '-').replace(/[\u00A0\u2009\u202F]/g, ' ').replace(/[\u2713\u2714]/g, 'OK').replace(/\u2192/g, '->');
    var out = '';
    for (var i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i);
      if (c >= 0xD800 && c <= 0xDBFF) { i++; continue; }
      if (c === 10 || c === 13 || c === 9) out += ' ';
      else if (c >= 32 && c <= 255) out += s.charAt(i);
      else if (c >= 0x2600 && c <= 0x27BF) continue;
      else if (c === 0xFE0F) continue;
      else out += '?';
    }
    return out;
  }
  function cw(ch, bold) { var c = ch.charCodeAt(0), t = bold ? WB : WR; if (c >= 32 && c <= 126) return t[c - 32]; if (c >= 160) { var b = ch.normalize ? ch.normalize('NFD').charCodeAt(0) : 0; if (b >= 32 && b <= 126) return t[b - 32]; } return 556; }
  function tw(s, size, bold) { var w = 0; for (var i = 0; i < s.length; i++) w += cw(s.charAt(i), bold); return w * size / 1000; }
  function esc(s) { return s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)'); }
  function num(n) { return (Math.round(n * 100) / 100).toString(); }
  function rgb(hex, stroke) {
    hex = (hex || '#000000').replace('#', ''); if (hex.length === 3) hex = hex.split('').map(function (x) { return x + x; }).join('');
    return num(parseInt(hex.substr(0, 2), 16) / 255) + ' ' + num(parseInt(hex.substr(2, 2), 16) / 255) + ' ' + num(parseInt(hex.substr(4, 2), 16) / 255) + (stroke ? ' RG' : ' rg');
  }
  function b64bin(b64) { return typeof atob === 'function' ? atob(b64) : Buffer.from(b64, 'base64').toString('binary'); }
  function wrapPlain(text, width, size, bold, lines) {
    var words = text.split(' '), cur = '';
    for (var i = 0; i < words.length; i++) {
      var w = words[i]; if (w === '') continue;
      var test = cur ? cur + ' ' + w : w;
      if (tw(test, size, bold) <= width) { cur = test; continue; }
      if (cur) { lines.push(cur); cur = ''; }
      while (tw(w, size, bold) > width && w.length > 1) { var k = w.length; while (k > 1 && tw(w.substr(0, k), size, bold) > width) k--; lines.push(w.substr(0, k)); w = w.substr(k); }
      cur = w;
    }
    if (cur) lines.push(cur); if (!lines.length) lines.push(''); return lines;
  }
  function PDF(opts) { opts = opts || {}; this.pw = 595.28; this.ph = 841.89; this.mx = 40; this.mt = 40; this.mb = 46; this.pages = []; this.images = []; this.title = opts.title || 'Documento'; this.onNewPage = opts.onNewPage || null; this.footer = opts.footer || ''; this._newPage(true); }
  PDF.prototype._newPage = function (first) { this.cur = []; this.pages.push(this.cur); this.y = this.mt; if (this.onNewPage && !first) this.onNewPage(this); };
  PDF.prototype.newPage = function () { this._newPage(false); };
  PDF.prototype.ensure = function (h) { if (this.y + h > this.ph - this.mb) this.newPage(); };
  PDF.prototype.width = function () { return this.pw - this.mx * 2; };
  PDF.prototype.text = function (str, x, base, o) {
    o = o || {}; var size = o.size || 10, font = o.bold ? '/F2' : '/F1', s = enc(str);
    if (o.align === 'right') x = x - tw(s, size, o.bold); else if (o.align === 'center') x = x - tw(s, size, o.bold) / 2;
    this.cur.push('BT ' + rgb(o.color || '#111111') + ' ' + font + ' ' + num(size) + ' Tf 1 0 0 1 ' + num(x) + ' ' + num(this.ph - base) + ' Tm (' + esc(s) + ') Tj ET');
  };
  PDF.prototype.rect = function (x, y, w, h, o) {
    o = o || {}; var op = ''; if (o.fill) op += rgb(o.fill) + ' '; if (o.stroke) op += rgb(o.stroke, true) + ' ' + num(o.lw || 0.6) + ' w ';
    this.cur.push(op + num(x) + ' ' + num(this.ph - y - h) + ' ' + num(w) + ' ' + num(h) + ' re ' + (o.fill && o.stroke ? 'B' : (o.fill ? 'f' : 'S')));
  };
  PDF.prototype.line = function (x1, y1, x2, y2, o) { o = o || {}; this.cur.push(rgb(o.color || '#999999', true) + ' ' + num(o.lw || 0.6) + ' w ' + num(x1) + ' ' + num(this.ph - y1) + ' m ' + num(x2) + ' ' + num(this.ph - y2) + ' l S'); };
  PDF.prototype.addJpeg = function (dataUrl) {
    try {
      var m = /^data:image\/jpe?g;base64,(.+)$/.exec(dataUrl || ''); if (!m) return null;
      var bin = b64bin(m[1]), i = 2, w = 0, h = 0, comps = 3;
      while (i < bin.length) {
        if (bin.charCodeAt(i) !== 0xFF) { i++; continue; }
        var mk = bin.charCodeAt(i + 1);
        if (mk >= 0xC0 && mk <= 0xCF && mk !== 0xC4 && mk !== 0xC8 && mk !== 0xCC) { h = bin.charCodeAt(i + 5) * 256 + bin.charCodeAt(i + 6); w = bin.charCodeAt(i + 7) * 256 + bin.charCodeAt(i + 8); comps = bin.charCodeAt(i + 9); break; }
        i += 2 + bin.charCodeAt(i + 2) * 256 + bin.charCodeAt(i + 3);
      }
      if (!w || !h) return null; this.images.push({ bin: bin, w: w, h: h, comps: comps }); return this.images.length - 1;
    } catch (e) { return null; }
  };
  PDF.prototype.imgSize = function (idx) { var im = this.images[idx]; return im ? { w: im.w, h: im.h } : null; };
  PDF.prototype.image = function (idx, x, y, w, h) { if (idx == null) return; this.cur.push('q ' + num(w) + ' 0 0 ' + num(h) + ' ' + num(x) + ' ' + num(this.ph - y - h) + ' cm /Im' + idx + ' Do Q'); };
  PDF.prototype.h2 = function (t, color) { this.ensure(34); this.y += 8; this.rect(this.mx, this.y, this.width(), 20, { fill: color || '#1f2933' }); this.text(t.toUpperCase(), this.mx + 8, this.y + 14, { size: 10.5, bold: true, color: '#ffffff' }); this.y += 26; };
  PDF.prototype.para = function (t, o) {
    o = o || {}; var size = o.size || 10, lh = size * 1.35, x = this.mx + (o.indent || 0), w = this.width() - (o.indent || 0), self = this;
    String(t == null ? '' : t).split(/\n/).forEach(function (c) { wrapPlain(enc(c), w, size, o.bold, []).forEach(function (ln) { self.ensure(lh); self.text(ln, x, self.y + size, { size: size, bold: o.bold, color: o.color }); self.y += lh; }); });
    this.y += o.gap == null ? 3 : o.gap;
  };
  PDF.prototype.kv = function (pairs, cols) {
    cols = cols || 2; var colW = this.width() / cols, size = 9.5, self = this;
    for (var i = 0; i < pairs.length; i += cols) {
      var maxL = 1, cells = pairs.slice(i, i + cols).map(function (p) { var v = wrapPlain(enc(p[1] === '' || p[1] == null ? '-' : p[1]), colW - 10, size, false, []); if (v.length > maxL) maxL = v.length; return { k: enc(p[0]), v: v }; });
      var h = 11 + maxL * size * 1.3 + 5; this.ensure(h);
      cells.forEach(function (c, j) { var x = self.mx + j * colW; self.text(c.k.toUpperCase(), x, self.y + 8, { size: 7, bold: true, color: '#6b7785' }); c.v.forEach(function (ln, k) { self.text(ln, x, self.y + 19 + k * size * 1.3, { size: size }); }); });
      this.y += h;
    }
    this.y += 2;
  };
  PDF.prototype.table = function (cols, rows, o) {
    o = o || {}; var size = o.size || 8.5, lh = size * 1.3, pad = 4, self = this, tw_ = this.width(), sum = cols.reduce(function (a, c) { return a + c.w; }, 0), widths = cols.map(function (c) { return c.w / sum * tw_; });
    function header() { self.ensure(20); var x = self.mx; self.rect(self.mx, self.y, tw_, 16, { fill: '#e4e8ec' }); cols.forEach(function (c, i) { self.text(c.t, x + pad, self.y + 11, { size: 8, bold: true, color: '#333' }); x += widths[i]; }); self.y += 16; }
    header();
    if (!rows.length) { this.para(o.empty || 'Sin registros.', { size: 9, color: '#6b7785' }); return; }
    rows.forEach(function (r, ri) {
      var cells = r.map(function (v, i) { return wrapPlain(enc(v == null || v === '' ? '-' : v), widths[i] - pad * 2, size, false, []); });
      var h = Math.max.apply(null, cells.map(function (c) { return c.length; })) * lh + pad * 2 - 1;
      if (self.y + h > self.ph - self.mb) { self.newPage(); header(); }
      if (ri % 2) self.rect(self.mx, self.y, tw_, h, { fill: '#f6f8fa' });
      var x = self.mx; cells.forEach(function (c, i) { c.forEach(function (ln, k) { self.text(ln, x + pad, self.y + pad + size + k * lh - 1, { size: size }); }); x += widths[i]; });
      self.line(self.mx, self.y + h, self.mx + tw_, self.y + h, { color: '#d5dbe1', lw: 0.4 }); self.y += h;
    });
    this.y += 4;
  };
  PDF.prototype.finish = function () {
    var n = this.pages.length, self = this;
    this.pages.forEach(function (p, i) {
      p.push(rgb('#cfd5db', true) + ' 0.5 w ' + num(self.mx) + ' ' + num(self.mb - 14) + ' m ' + num(self.pw - self.mx) + ' ' + num(self.mb - 14) + ' l S');
      var save = self.cur; self.cur = p;
      self.text(self.footer, self.mx, self.ph - self.mb + 26, { size: 7.5, color: '#6b7785' });
      self.text('Página ' + (i + 1) + ' de ' + n, self.pw - self.mx, self.ph - self.mb + 26, { size: 7.5, color: '#6b7785', align: 'right' });
      self.cur = save;
    });
    var objs = [], imgBase = 5, pageBase = imgBase + this.images.length, kids = [];
    objs[1] = '<< /Type /Catalog /Pages 2 0 R >>';
    for (var i = 0; i < n; i++) kids.push((pageBase + i * 2 + 1) + ' 0 R');
    objs[2] = '<< /Type /Pages /Kids [' + kids.join(' ') + '] /Count ' + n + ' >>';
    objs[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
    objs[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';
    var xo = '';
    this.images.forEach(function (im, k) { xo += '/Im' + k + ' ' + (imgBase + k) + ' 0 R '; objs[imgBase + k] = { dict: '<< /Type /XObject /Subtype /Image /Width ' + im.w + ' /Height ' + im.h + ' /ColorSpace /' + (im.comps === 1 ? 'DeviceGray' : 'DeviceRGB') + ' /BitsPerComponent 8 /Filter /DCTDecode /Length ' + im.bin.length + ' >>', stream: im.bin }; });
    this.pages.forEach(function (p, i) { var content = p.join('\n'), cid = pageBase + i * 2; objs[cid] = { dict: '<< /Length ' + content.length + ' >>', stream: content }; objs[cid + 1] = '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + num(self.pw) + ' ' + num(self.ph) + '] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> /XObject << ' + xo + '>> >> /Contents ' + cid + ' 0 R >>'; });
    var infoId = pageBase + n * 2, d = new Date(); function p2(x) { return ('0' + x).slice(-2); }
    objs[infoId] = '<< /Title (' + esc(enc(this.title)) + ') /Producer (SCI Bomberos) /CreationDate (D:' + d.getFullYear() + p2(d.getMonth() + 1) + p2(d.getDate()) + p2(d.getHours()) + p2(d.getMinutes()) + p2(d.getSeconds()) + ') >>';
    var out = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n', offs = [];
    for (var k = 1; k < objs.length; k++) { offs[k] = out.length; var o = objs[k]; out += typeof o === 'string' ? k + ' 0 obj\n' + o + '\nendobj\n' : k + ' 0 obj\n' + o.dict + '\nstream\n' + o.stream + '\nendstream\nendobj\n'; }
    var xref = out.length; out += 'xref\n0 ' + objs.length + '\n0000000000 65535 f \n';
    for (var j = 1; j < objs.length; j++) out += ('0000000000' + offs[j]).slice(-10) + ' 00000 n \n';
    out += 'trailer\n<< /Size ' + objs.length + ' /Root 1 0 R /Info ' + infoId + ' 0 R >>\nstartxref\n' + xref + '\n%%EOF';
    var bytes = new Uint8Array(out.length); for (var q = 0; q < out.length; q++) bytes[q] = out.charCodeAt(q) & 255; return bytes;
  };
  PDF.enc = enc; PDF.tw = tw; root.SCI_PDF = PDF; if (typeof module !== 'undefined' && module.exports) module.exports = PDF;
})(typeof window !== 'undefined' ? window : globalThis);
