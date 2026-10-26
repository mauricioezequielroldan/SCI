/* SCI Bomberos – arranque, dibujo de pantallas, temporizadores y eventos globales */
'use strict';
let pendingRender = false;
function render() {
  if (isTeamLink()) return tPaint(true);
  const app = $('#app'), y = window.scrollY, bl = $('.board'), sl = bl ? bl.scrollLeft : 0;
  if (!S.cuartelId || !db.cuarteles[S.cuartelId]) { if (S.view !== 'home') { S.view = 'home'; S.cuartelId = null; S.userId = null; } }
  else if (S.view !== 'login' && S.view !== 'home' && !U()) S.view = 'login';
  if (S.view === 'op' && !OPx()) S.view = 'cuartel';
  if (S.view === 'op' && !OPTABS.some(t => t[0] === S.optab)) S.optab = 'general';
  applyAccent(); saveMapViews(); pendingRender = false;
  D.body.classList.toggle('in-op', S.view === 'op');
  app.innerHTML = S.view === 'op' ? vOp() : S.view === 'cuartel' ? vCuartel() : S.view === 'login' ? vLogin() : vHome();
  const nb = $('.board'); if (nb) nb.scrollLeft = sl;
  window.scrollTo(0, y); tick(); saveS(); wakeLock();
  if (S.view === 'op' && S.optab === 'croquis') initCroquis(); else croV = null;
  if (S.view === 'op') mountMaps();
  initCoordFields();
}
/* Redibuja sin pisar lo que el usuario está escribiendo */
function softRender() {
  const ae = D.activeElement, app = $('#app');
  if (ae && app.contains(ae) && /INPUT|TEXTAREA|SELECT/.test(ae.tagName)) { pendingRender = true; refreshMaps(); return; }
  if (S.view === 'op' && S.optab === 'croquis') { pendingRender = true; return; }
  render();
}
D.addEventListener('focusout', () => setTimeout(() => { const ae = D.activeElement; if (pendingRender && !(ae && $('#app').contains(ae) && /INPUT|TEXTAREA|SELECT/.test(ae.tagName))) render(); }, 200));

/* ---------- Temporizadores ---------- */
function tick() {
  const t = now();
  $$('[data-since]').forEach(el => { el.textContent = dur((el.dataset.until ? +el.dataset.until : t) - (+el.dataset.since)); });
  $$('[data-ago]').forEach(el => { el.textContent = MAP.ago(+el.dataset.ago); });
  if (isTeamLink() || S.view !== 'op') return;
  const op = OPx(); if (!op) return;
  $$('[data-work]').forEach(el => { const ms = t - (+el.dataset.work); el.textContent = dur(ms); el.classList.toggle('warn', ms >= op.rotMin * 60000); });
  $$('[data-era]').forEach(el => { const left = +el.dataset.era - t, v = $('[data-eraval]', el); if (v) v.textContent = left > 0 ? dur(left) : '-' + dur(-left); el.dataset.state = left <= 0 ? 'bad' : left <= 5 * 60000 ? 'warn' : 'ok'; });
  if (op.estado !== 'activa' || op._follow) return;
  let dirty = false;
  op.sectores.forEach(s => {
    const el = $('[data-par="' + s.id + '"]'); if (!el) return;
    const lim = (s.parMin || op.parMin) * 60000, e = t - s.parLast, st = e >= lim ? 'bad' : e >= lim * 0.7 ? 'warn' : 'ok';
    el.dataset.state = st; $('[data-parval]', el).textContent = dur(e) + ' / ' + pad(Math.floor(lim / 60000)) + ':00';
    if (st === 'bad' && !s.parAlerted && isEditor(op)) { s.parAlerted = true; logEv(op, 'PAR vencido: ' + s.nombre, 'par', 'sistema'); save(); beep(3, 660); toast('⏱ PAR vencido: ' + s.nombre, 'bad'); dirty = true; }
  });
  if (isEditor(op)) op.equipos.forEach(e => {
    if (!e.era || !e.era.start || e.era.end) return; const left = e.era.start + e.era.min * 60000 - t;
    if (left <= 5 * 60000 && !e.era.w5) { e.era.w5 = true; logEv(op, 'ERA ' + e.nombre + ': quedan 5 minutos de aire', 'equipo', 'sistema'); save(); beep(3, 700); toast('🫁 ' + e.nombre + ': quedan 5 min de aire', 'bad', 6000); dirty = true; }
    if (left <= 0 && !e.era.w0) { e.era.w0 = true; logEv(op, 'ERA ' + e.nombre + ': TIEMPO DE AIRE CUMPLIDO — verificar salida', 'mayday', 'sistema'); save(); beep(5, 1000); toast('🫁 ' + e.nombre + ': tiempo de aire cumplido', 'bad', 8000); dirty = true; }
  });
  const ga = $('#gen-alerts'); if (ga) { const h = genAlerts(op); if (ga.dataset.h !== h) { ga.dataset.h = h; ga.innerHTML = h; } }
  if (dirty && ['bitacora', 'general', 'equipos'].includes(S.optab)) softRender();
}
setInterval(tick, 1000);
setInterval(() => { if (!isTeamLink() && S.view === 'op') { pollTeams(); pollFollow(); } }, 15000);

/* ---------- Pantalla encendida durante la operación ---------- */
let wl = null;
async function wakeLock() {
  try { const want = S.view === 'op' && OPx() && OPx().estado === 'activa'; if (want && !wl && navigator.wakeLock) { wl = await navigator.wakeLock.request('screen'); wl.addEventListener('release', () => { wl = null; }); } else if (!want && wl) { await wl.release(); wl = null; } } catch (e) { wl = null; }
}
D.addEventListener('visibilitychange', () => { if (!D.hidden && !isTeamLink()) { wakeLock(); if (S.view === 'op') { pollTeams(); pollFollow(); } } });

/* ---------- Eventos globales ---------- */
D.addEventListener('click', e => {
  if (e.target.closest('[data-mclose]')) { closeModal(); return; }
  const mi = e.target.closest('[data-mi]'); if (mi) { runModalAction(+mi.dataset.mi); return; }
  const m = $('#modal'); if (e.target === m && !m._lock) { closeModal(); return; }
  const el = e.target.closest('[data-act]'); if (!el || el.disabled) return;
  const fn = ACT[el.dataset.act]; if (fn) { if (el.type !== 'checkbox') e.preventDefault(); fn(el, e); }
});
D.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !$('#modal').classList.contains('hidden')) closeModal();
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[role=button][data-act]')) { e.preventDefault(); e.target.click(); }
});
window.addEventListener('hashchange', () => location.reload());

/* ---------- Arranque ---------- */
(function init() {
  const th = localStorage.getItem(TKEY); if (th) D.documentElement.dataset.theme = th;
  if (isTeamLink()) startTeam();
  else { if (['login', 'cuartel', 'op'].includes(S.view) && !db.cuarteles[S.cuartelId]) { S.view = 'home'; S.cuartelId = null; S.userId = null; } render(); }
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol) && !/localhost|127\.0\.0\.1/.test(location.hostname)) navigator.serviceWorker.register('sw.js').catch(() => { });
})();
