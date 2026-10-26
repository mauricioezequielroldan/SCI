/* SCI Bomberos – núcleo: constantes, datos, sesión, ventanas y utilidades */
'use strict';
const D = document;
const $ = (s, r) => (r || D).querySelector(s);
const $$ = (s, r) => Array.from((r || D).querySelectorAll(s));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const now = () => Date.now();
const pad = n => String(n).padStart(2, '0');
const R = window.SCI_REPORT, GEO = window.SCI_GEO, QR = window.SCI_QR, MAP = window.SCI_MAP;
const ACT = {};
const APP_VERSION = '2.0.0';

const KEY = 'sci-bomberos-v1', SKEY = 'sci-bomberos-session', TKEY = 'sci-theme', MKEY = 'sci-mute';
const PROVINCIAS = ['Buenos Aires', 'CABA', 'Catamarca', 'Chaco', 'Chubut', 'Córdoba', 'Corrientes', 'Entre Ríos', 'Formosa', 'Jujuy', 'La Pampa', 'La Rioja', 'Mendoza', 'Misiones', 'Neuquén', 'Río Negro', 'Salta', 'San Juan', 'San Luis', 'Santa Cruz', 'Santa Fe', 'Santiago del Estero', 'Tierra del Fuego', 'Tucumán'];
const COLORES = ['#d62828', '#e8590c', '#1c6dd0', '#2b8a3e', '#7048e8', '#495057'];
const SECTOR_COLORES = ['#e8590c', '#1c6dd0', '#2b8a3e', '#7048e8', '#c2255c', '#0c8599', '#f08c00', '#5f3dc4'];
const EQ_COLORES = ['#1c6dd0', '#e8590c', '#2b8a3e', '#c2255c', '#7048e8', '#0c8599', '#d9a400', '#495057'];
const TIPOS_SINIESTRO = ['Incendio estructural', 'Incendio forestal / pastizal', 'Incendio vehicular', 'Incendio industrial', 'Rescate vehicular', 'Rescate en altura / cuerdas', 'Rescate acuático', 'Búsqueda de personas', 'Materiales peligrosos (HAZMAT)', 'Accidente con múltiples víctimas', 'Fuga de gas', 'Inundación / temporal', 'Apoyo a otra institución', 'Otro'];
const TIPOS_SECTOR = ['Sector', 'División', 'Grupo', 'Rama', 'Frente de ataque', 'Rescate', 'Ventilación', 'Seguridad', 'Abastecimiento de agua', 'Otro'];
const ESTADOS = ['Alertado', 'En camino', 'En escena', 'En rehabilitación', 'Retirado'];
const ESTADO_SLUG = { 'Alertado': 'alertado', 'En camino': 'camino', 'En escena': 'escena', 'En rehabilitación': 'rehab', 'Retirado': 'retirado' };
const ESTRATEGIAS = ['Ofensiva', 'Defensiva', 'Transición', 'Sin definir'];
const RESULTADOS = ['Extinguido / controlado', 'Rescate finalizado', 'Sin novedad / falsa alarma', 'Derivado a otra institución', 'Operación suspendida', 'Otro'];
const ROLES_SCI = [['seguridad', 'Oficial de Seguridad'], ['enlace', 'Oficial de Enlace'], ['info', 'Oficial de Información Pública'], ['operaciones', 'Jefe de Operaciones'], ['planificacion', 'Jefe de Planificación'], ['logistica', 'Jefe de Logística'], ['finanzas', 'Jefe de Finanzas y Administración']];
const JERARQUIAS = ['Aspirante', 'Bombero', 'Cabo', 'Cabo 1°', 'Sargento', 'Sargento 1°', 'Suboficial', 'Oficial Ayudante', 'Oficial Inspector', 'Oficial Principal', 'Subcomandante', 'Comandante'];
const TIPOS_UNIDAD = ['Autobomba', 'Cisterna', 'Forestal 4x4', 'Rescate', 'Unidad de comando', 'Ambulancia', 'Escalera', 'Utilitario', 'Otro'];
const QUICK_LOG = ['Primera unidad en escena', 'Fuego controlado', 'Fuego extinguido', 'Búsqueda primaria completa', 'Sin víctimas halladas', 'Corte de energía realizado', 'Corte de gas realizado', 'Se solicita apoyo externo', 'Ambulancia en escena', 'Policía en escena'];
const INSTITUCIONES = ['Bomberos Voluntarios (otro cuartel)', 'Policía', 'Hospital / centro de salud', 'Ambulancia / emergencias médicas', 'Defensa Civil', 'Municipalidad', 'Cooperativa eléctrica', 'Empresa de gas', 'Cruz Roja', 'Prefectura / Gendarmería', 'Otra'];
const TRIAGE = [['rojo', '🔴 Rojo – inmediato'], ['amarillo', '🟡 Amarillo – diferido'], ['verde', '🟢 Verde – leve'], ['negro', '⚫ Negro – fallecido']];
const VIENTO = { N: 0, NE: 45, E: 90, SE: 135, S: 180, SO: 225, O: 270, NO: 315 };
const VIENTO_NOM = { N: 'Norte', NE: 'Noreste', E: 'Este', SE: 'Sudeste', S: 'Sur', SO: 'Sudoeste', O: 'Oeste', NO: 'Noroeste' };

/* ---------- Datos ---------- */
let db = loadDB();
function defContactos() { return [{ nombre: 'Bomberos', tel: '100' }, { nombre: 'Emergencias', tel: '911' }, { nombre: 'Emergencias médicas', tel: '107' }, { nombre: 'Defensa Civil', tel: '103' }]; }
function migrate(d) {
  Object.values(d.cuarteles).forEach(c => {
    c.contactos = c.contactos || defContactos(); c.hospitales = c.hospitales || []; c.emailParte = c.emailParte || ''; c.cloud = c.cloud || { on: false, url: '', token: '', anon: true };
    c.defaults = c.defaults || { parMin: 10, rotMin: 20 }; c.users = c.users || []; c.units = c.units || []; c.ops = c.ops || [];
    c.ops.forEach(o => {
      ['hitos', 'victimasReg', 'pedidos', 'objetivos', 'sectores', 'recursos', 'log', 'equipos', 'fotos'].forEach(k => { o[k] = o[k] || []; });
      o.roles = o.roles || {}; o.croquis = o.croquis || null; o.clima = o.clima || null; o.evac = o.evac || null; o.teamSeq = o.teamSeq || 0;
      o.victimas = o.victimas || { heridos: 0, fallecidos: 0, rescatados: 0, evacuados: 0 };
    });
  });
  return d;
}
function loadDB() { try { const r = JSON.parse(localStorage.getItem(KEY)); if (r && r.cuarteles) return migrate(r); } catch (e) { } return { v: 1, cuarteles: {} }; }
function save(quiet) {
  try { localStorage.setItem(KEY, JSON.stringify(db)); if (!quiet && typeof cloudHook === 'function') { try { cloudHook(); } catch (e) { } } return true; }
  catch (e) { toast('⚠ No se pudo guardar (almacenamiento lleno). Exportá un respaldo y borrá operaciones viejas.', 'bad', 7000); return false; }
}
let S = { view: 'home', cuartelId: null, userId: null, tab: 'inicio', opId: null, optab: 'general' };
try { Object.assign(S, JSON.parse(sessionStorage.getItem(SKEY) || '{}')); } catch (e) { }
function saveS() { try { sessionStorage.setItem(SKEY, JSON.stringify(S)); } catch (e) { } }
function go(patch, top) { Object.assign(S, patch); saveS(); render(); if (top !== false) window.scrollTo(0, 0); }

const C = () => db.cuarteles[S.cuartelId];
const U = () => C() && C().users.find(u => u.id === S.userId);
const OPx = () => C() && C().ops.find(o => o.id === S.opId);
const uById = id => C() && C().users.find(u => u.id === id);
const uName = id => { if (id === 'sistema') return 'Sistema'; if (id && String(id).indexOf('eq:') === 0) return 'Equipo ' + String(id).slice(3); const u = uById(id); return u ? (u.jerarquia ? u.jerarquia + ' ' : '') + u.nombre + ' ' + u.apellido : '—'; };
const uFull = u => u.nombre + ' ' + u.apellido;
const isAdmin = () => !!(U() && U().admin);
const canCommand = u => !!(u && u.activo !== false && u.comando);
const isEditor = op => !!op && op.estado === 'activa' && !op._follow && op.editors.includes(S.userId);
const isIC = op => !!op && !op._follow && op.editors[0] === S.userId;

/* ---------- Tiempo ---------- */
const dur = ms => { ms = Math.max(0, ms); const s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return (h ? h + ':' + pad(m) : pad(m)) + ':' + pad(x); };
const hhmm = ts => { const d = new Date(ts); return pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()); };
const toLocalInput = ts => { const d = new Date(ts); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()); };

/* ---------- PIN ---------- */
async function hashPin(pin, salt) {
  const data = new TextEncoder().encode(salt + ':' + pin);
  try { if (window.crypto && crypto.subtle) { const buf = await crypto.subtle.digest('SHA-256', data); return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join(''); } } catch (e) { }
  let h = 5381; for (const b of data) h = ((h << 5) + h + b) >>> 0; return 'x' + h.toString(16);
}
const validPin = p => /^\d{4,6}$/.test(p || '');

/* ---------- Ventanas, avisos, formularios ---------- */
let toastT;
function toast(msg, kind, ms) { const t = $('#toast'); t.textContent = msg; t.className = kind || ''; clearTimeout(toastT); toastT = setTimeout(() => t.classList.add('hidden'), ms || 3200); }
let modalSeq = 0;
function modal(title, html, actions, o) {
  o = o || {}; modalSeq++; const m = $('#modal');
  m.innerHTML = '<div class="box' + (o.wide ? ' wide' : '') + '"><div class="mhead"><h3>' + title + '</h3><button type="button" class="icon mclose" data-mclose aria-label="Cerrar">✕</button></div><form id="mf" autocomplete="off" novalidate>' + html + '</form><div class="err" id="merr" aria-live="polite"></div><div class="mactions">' +
    actions.map((a, i) => '<button type="button" class="btn ' + (a.cls || '') + '" data-mi="' + i + '">' + a.label + '</button>').join('') + '</div></div>';
  m.classList.remove('hidden'); m._actions = actions; m._lock = !!o.lock; D.body.classList.add('modal-open');
  if (o.onOpen) o.onOpen(m);
  if (typeof initCoordFields === 'function') initCoordFields();
  const f = $('input:not([type=checkbox]):not([type=radio]):not([type=hidden]):not([type=file]),textarea', m);
  if (f && o.focus && !('ontouchstart' in window)) f.focus();
}
function closeModal() { const m = $('#modal'); m.classList.add('hidden'); m.innerHTML = ''; m._actions = null; D.body.classList.remove('modal-open'); }
async function runModalAction(i) {
  const m = $('#modal'), a = m._actions && m._actions[i]; if (!a) return;
  const seq = modalSeq; let r;
  try { if (a.fn) r = await a.fn(); } catch (e) { console.error(e); toast('Ocurrió un error. Probá de nuevo.', 'bad'); return; }
  if (r !== false && seq === modalSeq) closeModal();
}
function merr(t) { const e = $('#merr'); if (e) e.textContent = t || ''; return false; }
function fdata() {
  const f = $('#mf'), o = {}; if (!f) return o;
  new FormData(f).forEach((v, k) => { o[k] = typeof v === 'string' ? v.trim() : v; });
  $$('input[type=checkbox]', f).forEach(c => { if (c.name && !c.name.endsWith('[]')) o[c.name] = c.checked; });
  return o;
}
const checked = name => $$('#mf input[name="' + name + '"]:checked').map(c => c.value);
function ask(title, msg, okLabel, cls) { return new Promise(res => { modal(title, '<p>' + msg + '</p>', [{ label: 'Cancelar', fn: () => { res(false); } }, { label: okLabel || 'Confirmar', cls: cls || 'primary', fn: () => { res(true); } }]); }); }
const F = {
  text: (label, name, val, extra) => '<div class="field"><label>' + label + '</label><input type="' + ((extra && extra.type) || 'text') + '" name="' + name + '" value="' + esc(val) + '"' + ((extra && extra.attrs) || '') + '></div>',
  area: (label, name, val, rows, mic) => '<div class="field"><label>' + label + '</label>' + (mic ? '<div class="micwrap">' : '') + '<textarea name="' + name + '" rows="' + (rows || 3) + '">' + esc(val) + '</textarea>' + (mic ? micBtn('#mf [name=' + name + ']') + '</div>' : '') + '</div>',
  sel: (label, name, opts, val) => '<div class="field"><label>' + label + '</label><select name="' + name + '">' + opts.map(o => { const v = Array.isArray(o) ? o[0] : o, t = Array.isArray(o) ? o[1] : o; return '<option value="' + esc(v) + '"' + (String(v) === String(val) ? ' selected' : '') + '>' + esc(t) + '</option>'; }).join('') + '</select></div>',
  chk: (label, name, on) => '<label class="check"><input type="checkbox" name="' + name + '"' + (on ? ' checked' : '') + '> ' + label + '</label>',
  list: (id, arr) => '<datalist id="' + id + '">' + arr.map(a => '<option value="' + esc(a) + '">').join('') + '</datalist>'
};
function fileToJpeg(file, max, q) {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => { const img = new Image(); img.onload = () => { const k = Math.min(1, max / Math.max(img.width, img.height)), c = D.createElement('canvas'); c.width = Math.max(1, Math.round(img.width * k)); c.height = Math.max(1, Math.round(img.height * k)); const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height); res(c.toDataURL('image/jpeg', q || 0.85)); }; img.onerror = rej; img.src = fr.result; };
    fr.onerror = rej; fr.readAsDataURL(file);
  });
}
function download(bytes, filename, mime) { const blob = new Blob([bytes], { type: mime || 'application/octet-stream' }), url = URL.createObjectURL(blob), a = D.createElement('a'); a.href = url; a.download = filename; D.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 15000); }
function inkFor(hex) { const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255; return (r * 299 + g * 587 + b * 114) / 1000 > 160 ? '#111' : '#fff'; }
function applyAccent() { const c = C(), col = (S.view !== 'home' && c && c.color) || '#d62828', r = D.documentElement.style; r.setProperty('--accent', col); r.setProperty('--accent-ink', inkFor(col)); const mt = $('meta[name=theme-color]'); if (mt) mt.content = col; }
function logoHTML(c) { return '<div class="logo">' + (c.logo ? '<img alt="" src="' + c.logo + '">' : esc((c.nombre || '?').trim().charAt(0).toUpperCase())) + '</div>'; }
async function copyText(t) { try { await navigator.clipboard.writeText(t); } catch (e) { const ta = D.createElement('textarea'); ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0'; D.body.appendChild(ta); ta.select(); try { D.execCommand('copy'); } catch (_) { } ta.remove(); } toast('Copiado ✔'); }
const fsafe = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '');

/* ---------- Sonido / vibración ---------- */
let actx;
function beep(times, freq) {
  try { if (navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) navigator.vibrate([250, 120, 250, 120, 250]); } catch (e) { }
  if (localStorage.getItem(MKEY) === '1') return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    for (let i = 0; i < (times || 3); i++) { const o = actx.createOscillator(), g = actx.createGain(); o.type = 'square'; o.frequency.value = freq || 880; o.connect(g); g.connect(actx.destination); const t0 = actx.currentTime + i * 0.35; g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.25, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.25); o.start(t0); o.stop(t0 + 0.28); }
  } catch (e) { }
}

/* ---------- Dictado por voz (si el navegador lo permite; suele necesitar internet) ---------- */
const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
function micBtn(target) { return SpeechRec ? '<button type="button" class="icon mic" data-act="mic" data-target="' + esc(target) + '" title="Dictar por voz" aria-label="Dictar por voz">🎤</button>' : ''; }
let recog = null;
ACT['mic'] = el => {
  const t = $(el.dataset.target); if (!t || !SpeechRec) return;
  if (recog) { try { recog.stop(); } catch (e) { } recog = null; el.classList.remove('rec'); return; }
  recog = new SpeechRec(); recog.lang = 'es-AR'; recog.interimResults = false; recog.maxAlternatives = 1;
  recog.onresult = e => { const txt = e.results[0][0].transcript; t.value = (t.value ? t.value.trim() + ' ' : '') + txt; t.dispatchEvent(new Event('input', { bubbles: true })); };
  recog.onerror = e => toast(e.error === 'not-allowed' ? 'Sin permiso de micrófono.' : 'No se pudo dictar (¿sin internet?).', 'bad');
  recog.onend = () => { recog = null; el.classList.remove('rec'); };
  el.classList.add('rec'); try { recog.start(); toast('🎤 Hablá ahora…', '', 2500); } catch (e) { recog = null; el.classList.remove('rec'); }
};

/* ---------- Fotos y condiciones ---------- */
function unitFoto(r) { if (!r) return null; if (r.kind === 'unidad') { const u = C() && C().units.find(x => x.id === r.refId); return (u && u.foto) || null; } return r.foto || null; }
const resIcon = r => r.kind === 'unidad' ? '🚒' : r.kind === 'personal' ? '👤' : '🤝';
function resIconHTML(r) { const f = unitFoto(r); return f ? '<img class="rth" alt="" src="' + f + '">' : '<span class="ri">' + resIcon(r) + '</span>'; }
const climaTxt = c => c && c.dir ? 'del ' + c.dir + (c.kmh ? ' · ' + c.kmh + ' km/h' : '') : '';
function windSvg(c, size) { if (!c || !c.dir || VIENTO[c.dir] == null) return ''; const deg = (VIENTO[c.dir] + 180) % 360; return '<svg class="warr" viewBox="0 0 24 24" width="' + (size || 36) + '" height="' + (size || 36) + '" style="transform:rotate(' + deg + 'deg)" aria-hidden="true"><path d="M12 1.5 L19.5 21 L12 16.2 L4.5 21 Z" fill="currentColor"/></svg>'; }
const windTo = c => c && c.dir ? VIENTO_NOM[Object.keys(VIENTO).find(k => VIENTO[k] === (VIENTO[c.dir] + 180) % 360)] : '';
