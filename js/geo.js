/* Coordenadas: lectura tolerante, validación y enlaces a mapas. Si faltan signos, los agrega para Argentina. */
(function (root) {
  'use strict';
  function inAR(lat, lon) { return lat <= -21 && lat >= -56 && lon <= -53 && lon >= -74; }
  function fmt(lat, lon) { return lat.toFixed(5) + ', ' + lon.toFixed(5); }
  function num(s) { return parseFloat(String(s).replace(/\s+/g, '').replace(/[\u2212\u2013\u2014]/g, '-').replace(',', '.')); }
  function parse(input) {
    if (input == null) return null; var s = String(input).trim(); if (!s) return null;
    try { s = decodeURIComponent(s); } catch (e) { }
    var m, a, b, note = '', warn = '';
    if ((m = s.match(/@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/)) || (m = s.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/)) || (m = s.match(/[?&](?:q|ll|query|destination|center|daddr)=\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/i))) { a = +m[1]; b = +m[2]; }
    else {
      s = s.replace(/\b(?:latitud|longitud|lat|lon|lng|long)\b\.?/gi, ' ').replace(/\bnorte\b/gi, 'N').replace(/\bsur\b/gi, 'S').replace(/\boeste\b/gi, 'O').replace(/\beste\b/gi, 'E').replace(/[:=]/g, ' ');
      if (/[A-Za-zÁ-ú]{2,}/.test(s)) return { error: 'formato' };
      var letters = (s.match(/(?:^|[^A-Za-zÁ-ú])([NSEWOnsewo])(?![A-Za-zÁ-ú])/g) || []).map(function (x) { return x.replace(/[^NSEWOnsewo]/g, '').toUpperCase(); }), vals = [], re;
      if (/[°º]/.test(s)) { re = /(-)?\s*(\d{1,3}(?:[.,]\d+)?)\s*[°º]\s*(?:(\d{1,2}(?:[.,]\d+)?)\s*['′’]\s*)?(?:(\d{1,2}(?:[.,]\d+)?)\s*(?:"|″|”|''|’’)?)?/g; while ((m = re.exec(s))) vals.push((m[1] ? -1 : 1) * (num(m[2]) + (m[3] ? num(m[3]) / 60 : 0) + (m[4] ? num(m[4]) / 3600 : 0))); }
      else { re = /[-\u2212\u2013]?\s?\d+(?:[.,]\d+)?/g; while ((m = re.exec(s))) vals.push(num(m[0])); }
      if (vals.length !== 2 || vals.some(function (v) { return isNaN(v); })) return { error: 'formato' };
      a = vals[0]; b = vals[1];
      if (letters.length === 2) { var neg = function (L) { return L === 'S' || L === 'W' || L === 'O'; }; a = (neg(letters[0]) ? -1 : 1) * Math.abs(a); b = (neg(letters[1]) ? -1 : 1) * Math.abs(b); if (/[EWO]/.test(letters[0]) && /[NS]/.test(letters[1])) { var t = a; a = b; b = t; note = 'Se ordenaron latitud y longitud. '; } }
    }
    if (Math.abs(a) > 90 && Math.abs(b) <= 90) { var tmp = a; a = b; b = tmp; note += 'Se invirtieron latitud y longitud. '; }
    if (Math.abs(a) > 90 || Math.abs(b) > 180) return { error: 'rango' };
    if (!inAR(a, b)) {
      var tries = [[a > 0 ? -a : a, b, 'Se agregó el signo menos a la latitud.'], [a, b > 0 ? -b : b, 'Se agregó el signo menos a la longitud.'], [a > 0 ? -a : a, b > 0 ? -b : b, 'Se agregó el signo menos (Argentina).'], [b, a, 'Se invirtieron latitud y longitud.'], [b > 0 ? -b : b, a > 0 ? -a : a, 'Se invirtieron latitud y longitud y se agregó el signo menos.']], done = false;
      for (var i = 0; i < tries.length && !done; i++) if (inAR(tries[i][0], tries[i][1])) { a = tries[i][0]; b = tries[i][1]; note += tries[i][2] + ' '; done = true; }
      if (!done) warn = 'Esa ubicación parece estar fuera de la Argentina: verificala.';
    }
    return { lat: a, lon: b, text: fmt(a, b), note: note.trim(), warn: warn };
  }
  function links(lat, lon) {
    var ll = lat.toFixed(6) + ',' + lon.toFixed(6);
    return { google: 'https://www.google.com/maps?q=' + ll, waze: 'https://waze.com/ul?ll=' + ll + '&navigate=yes', apple: 'https://maps.apple.com/?ll=' + ll + '&q=' + encodeURIComponent('Siniestro'), geo: 'geo:' + ll + '?q=' + ll,
      embed: 'https://www.openstreetmap.org/export/embed.html?bbox=' + [lon - 0.005, lat - 0.003, lon + 0.005, lat + 0.003].map(function (n) { return n.toFixed(6); }).join('%2C') + '&layer=mapnik&marker=' + lat.toFixed(6) + '%2C' + lon.toFixed(6) };
  }
  function search(txt) { return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(txt); }
  function dist(a, b) { var R = 6371000, t = Math.PI / 180, dl = (b[0] - a[0]) * t, dn = (b[1] - a[1]) * t, x = Math.sin(dl / 2) ** 2 + Math.cos(a[0] * t) * Math.cos(b[0] * t) * Math.sin(dn / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); }
  var API = { parse: parse, fmt: fmt, links: links, search: search, dist: dist, inArgentina: inAR };
  root.SCI_GEO = API; if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
