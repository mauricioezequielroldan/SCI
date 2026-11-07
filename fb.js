/* SCI Bomberos – Nube en vivo del proyecto (Firebase Realtime Database, por REST, sin librerías).
   Los cuarteles no configuran nada: cada operación usa un canal al azar y una clave de cifrado que viajan en los QR.
   Firebase solo guarda datos cifrados: ni el proyecto ni Google pueden leer posiciones ni mensajes. */
'use strict';
const FB_CFG = Object.assign({
  apiKey: 'AIzaSyAz_75sOrfvjhDdqpmVlAuepepQAPQQyfg',
  db: 'https://sci-bomberos-default-rtdb.firebaseio.com',
  auth: 'https://identitytoolkit.googleapis.com/v1',
  token: 'https://securetoken.googleapis.com/v1'
}, window.SCI_FB || {});
const FB_ROOT = 'v1/ops/', FB_AKEY = 'sci-fb-auth';
const fbOk = () => !!(window.isSecureContext && window.crypto && crypto.subtle && window.EventSource && window.fetch);

/* ---------- Identidad anónima (invisible para el usuario) ---------- */
let fbTok = null, fbTokP = null;
async function fbToken(force) {
  if (!fbTok) { try { fbTok = JSON.parse(localStorage.getItem(FB_AKEY) || 'null'); } catch (e) { } }
  if (!force && fbTok && fbTok.id && fbTok.exp - 120000 > Date.now()) return fbTok.id;
  if (fbTokP) return fbTokP;
  fbTokP = (async () => {
    let j = null;
    if (fbTok && fbTok.rt) {
      const r = await fetch(FB_CFG.token + '/token?key=' + FB_CFG.apiKey, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=refresh_token&refresh_token=' + encodeURIComponent(fbTok.rt) });
      const x = await r.json().catch(() => ({})); if (x.id_token) j = { id: x.id_token, rt: x.refresh_token, exp: Date.now() + Number(x.expires_in || 3600) * 1000 };
    }
    if (!j) {
      const r = await fetch(FB_CFG.auth + '/accounts:signUp?key=' + FB_CFG.apiKey, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ returnSecureToken: true }) });
      const x = await r.json().catch(() => ({})); if (!x.idToken) throw new Error((x.error && x.error.message) || 'No se pudo conectar con la nube');
      j = { id: x.idToken, rt: x.refreshToken, exp: Date.now() + Number(x.expiresIn || 3600) * 1000 };
    }
    fbTok = j; try { localStorage.setItem(FB_AKEY, JSON.stringify(j)); } catch (e) { } return j.id;
  })();
  try { return await fbTokP; } finally { fbTokP = null; }
}
const fbUrl = (path, tok) => FB_CFG.db + '/' + FB_ROOT + path + '.json?auth=' + encodeURIComponent(tok);
async function fbReq(method, path, body) {
  for (let i = 0; i < 2; i++) {
    const tok = await fbToken(i > 0);
    const r = await fetch(fbUrl(path, tok), { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
    if ((r.status === 401 || r.status === 403) && i === 0) continue;
    if (!r.ok) throw new Error('Nube ' + r.status);
    return r.json();
  }
}

/* ---------- Escucha en vivo (una sola conexión por dispositivo) ---------- */
function fbApply(tree, path, data, patch) {
  if (patch) { Object.keys(data || {}).forEach(k => { tree = fbApply(tree, (path === '/' ? '' : path) + '/' + k, data[k], false); }); return tree; }
  const parts = String(path).split('/').filter(Boolean); if (!parts.length) return data;
  tree = tree && typeof tree === 'object' ? tree : {}; let o = tree;
  for (let i = 0; i < parts.length - 1; i++) { if (!o[parts[i]] || typeof o[parts[i]] !== 'object') o[parts[i]] = {}; o = o[parts[i]]; }
  const k = parts[parts.length - 1]; if (data === null) delete o[k]; else o[k] = data; return tree;
}
function fbStream(path, onData) {
  let es = null, tree = null, closed = false, retry = null; const st = { ok: false, last: 0 };
  const later = force => { clearTimeout(retry); if (!closed) retry = setTimeout(() => open(force), 4000); };
  async function open(force) {
    if (closed) return; if (es) { try { es.close(); } catch (e) { } es = null; }
    let tok; try { tok = await fbToken(force); } catch (e) { st.ok = false; return later(); }
    if (closed) return; es = new EventSource(fbUrl(path, tok));
    const on = kind => ev => { let m; try { m = JSON.parse(ev.data); } catch (e) { return; } if (!m) return; tree = fbApply(tree, m.path, m.data, kind === 'patch'); st.ok = true; st.last = Date.now(); try { onData(tree, m.path || '/'); } catch (err) { console.error(err); } };
    es.addEventListener('put', on('put')); es.addEventListener('patch', on('patch'));
    es.addEventListener('keep-alive', () => { st.ok = true; st.last = Date.now(); });
    es.addEventListener('auth_revoked', () => open(true));
    es.addEventListener('cancel', () => { st.ok = false; es.close(); later(true); });
    es.onopen = () => { st.ok = true; st.last = Date.now(); };
    es.onerror = () => { st.ok = false; if (es && es.readyState === 2) later(true); };
  }
  open();
  return { st, close() { closed = true; clearTimeout(retry); if (es) es.close(); }, tree: () => tree };
}

/* ---------- Cifrado (AES-GCM 256, la clave viaja solo en los QR) ---------- */
function b64uE(bytes) { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function b64uD(s) { const b = atob(String(s).replace(/-/g, '+').replace(/_/g, '/')), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
const fbKeys = {};
function fbKey(k) { return fbKeys[k] || (fbKeys[k] = crypto.subtle.importKey('raw', b64uD(k), 'AES-GCM', false, ['encrypt', 'decrypt'])); }
async function fbEnc(k, obj) {
  const iv = crypto.getRandomValues(new Uint8Array(12)), ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await fbKey(k), new TextEncoder().encode(JSON.stringify(obj))));
  const all = new Uint8Array(12 + ct.length); all.set(iv); all.set(ct, 12); return b64uE(all);
}
async function fbDec(k, s) { const all = b64uD(s), pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: all.subarray(0, 12) }, await fbKey(k), all.subarray(12)); return JSON.parse(new TextDecoder().decode(pt)); }
const fbNewKey = () => b64uE(crypto.getRandomValues(new Uint8Array(32)));
function fbNewChan() { const a = crypto.getRandomValues(new Uint8Array(24)), c = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'; return Array.from(a, b => c[b % c.length]).join(''); }
