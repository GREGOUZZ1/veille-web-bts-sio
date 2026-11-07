'use strict';
const $ = id => document.getElementById(id);
const state = { articles: [], filter: 'all', q: '', limit: 9 };
const fmtDate = d => new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(d + 'T12:00:00'));
const mondayOf = date => { const d = new Date(date + 'T12:00:00'); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return d.toISOString().slice(0, 10); };
const escapeHTML = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function card(a) {
  const el = document.createElement('article'); el.className = 'article';
  el.innerHTML = `<div class="article-top"><span class="tag">${escapeHTML(a.category)}</span><time datetime="${escapeHTML(a.date)}">${fmtDate(a.date)}</time></div><h3>${escapeHTML(a.title)}</h3><p>${escapeHTML(a.summary)}</p><div class="article-foot"><span>◉ ${escapeHTML(a.source)}</span><a href="${escapeHTML(a.url)}" target="_blank" rel="noopener noreferrer">Lire l'article ↗</a></div>`;
  return el;
}
function render() {
  const filtered = state.articles.filter(a => (state.filter === 'all' || a.category === state.filter) && (`${a.title} ${a.summary} ${a.source}`.toLowerCase().includes(state.q)));
  $('articles').replaceChildren(...filtered.slice(0, state.limit).map(card));
  if (!filtered.length) { const div = document.createElement('div'); div.className = 'empty'; div.textContent = state.articles.length ? 'Aucun article ne correspond à votre recherche.' : 'Aucun article pour le moment. Lancez la première collecte.'; $('articles').append(div); }
  $('more').hidden = filtered.length <= state.limit;
  const chips = document.querySelectorAll('.chip'); chips.forEach(c => c.classList.toggle('active', c.dataset.category === state.filter));
  $('category').value = state.filter;
}
function showHistory(date = '', week = '') {
  const articles = state.articles.filter(a => week ? mondayOf(a.date) === week : !date || a.date === date).sort((a,b) => b.date.localeCompare(a.date));
  $('history-date').value = date;
  $('history-status').textContent = `${articles.length} article${articles.length > 1 ? 's' : ''}` + (week ? ` — semaine du ${fmtDate(week)}` : date ? ` — ${fmtDate(date)}` : ' — tout l’historique');
  $('history-articles').replaceChildren(...articles.map(card));
  if (!articles.length) { const empty = document.createElement('p'); empty.className = 'empty'; empty.textContent = 'Aucun article publié à cette date. Choisissez une autre date ou affichez tout l’historique.'; $('history-articles').append(empty); }
}
function renderHistory() {
  const weeks = new Map();
  for (const a of state.articles) { const week = mondayOf(a.date); weeks.set(week, (weeks.get(week) || 0) + 1); }
  const container = $('history-list'); container.replaceChildren();
  for (const [week, count] of [...weeks].sort((a,b) => b[0].localeCompare(a[0]))) {
    const row = document.createElement('button'); row.type = 'button'; row.className = 'history-week';
    const label = document.createElement('span'); label.textContent = `Semaine du ${fmtDate(week)}`;
    const info = document.createElement('small'); info.textContent = `${count} article${count > 1 ? 's' : ''} — consulter →`;
    row.append(label, info);
    row.addEventListener('click', () => { showHistory('', week); $('history-status').scrollIntoView({behavior:'smooth', block:'start'}); });
    container.append(row);
  }
  showHistory();
}
function moveHistoryDay(offset) {
  const dates = state.articles.map(a => a.date).sort();
  const current = $('history-date').value || dates[dates.length - 1] || new Date().toISOString().slice(0,10);
  const date = new Date(current + 'T12:00:00Z'); date.setUTCDate(date.getUTCDate() + offset);
  showHistory(date.toISOString().slice(0,10));
}
function initEvents() {
  $('history-date').addEventListener('change', e => showHistory(e.target.value));
  $('history-all').addEventListener('click', () => showHistory());
  $('day-prev').addEventListener('click', () => moveHistoryDay(-1));
  $('day-next').addEventListener('click', () => moveHistoryDay(1));
  $('search').addEventListener('input', e => { state.q = e.target.value.trim().toLowerCase(); state.limit=9; render(); });
  $('category').addEventListener('change', e => { state.filter=e.target.value; state.limit=9; render(); });
  document.querySelectorAll('.chip').forEach(c => c.addEventListener('click', () => {state.filter=c.dataset.category; state.limit=9; render();}));
  $('more').addEventListener('click', () => {state.limit+=9;render();});
  $('menu-toggle').addEventListener('click', () => { const nav = $('site-nav'); const opened = nav.classList.toggle('open'); $('menu-toggle').setAttribute('aria-expanded', String(opened)); });
  document.querySelectorAll('#site-nav a').forEach(a => a.addEventListener('click', () => { $('site-nav').classList.remove('open'); $('menu-toggle').setAttribute('aria-expanded', 'false'); }));
  $('print').addEventListener('click', () => { state.limit = state.articles.length; render(); window.print(); });
}
async function start() {
  initEvents();
  try {
    const response = await fetch(`data/articles.json?v=${Date.now()}`, {cache:'no-store'});
    if (!response.ok) throw new Error('Fichier de données inaccessible');
    const data = await response.json();
    state.articles = Array.isArray(data.articles) ? data.articles.filter(a => a.title && a.url && a.date && a.category) : [];
    const today = new Date().toISOString().slice(0,10);
    const thisMonday = mondayOf(today);
    $('count').textContent = state.articles.length;
    $('weekly').textContent = state.articles.filter(a => a.date >= thisMonday).length;
    $('sources').textContent = new Set(state.articles.map(a => a.source)).size;
    $('updated').textContent = data.last_updated ? fmtDate(data.last_updated.slice(0,10)) : 'En attente';
    if (data.errors?.length) $('notice').textContent = `${data.errors.length} source(s) temporairement indisponible(s). Les autres articles restent accessibles.`;
    else if (!state.articles.length) $('notice').textContent = 'Première collecte en attente : exécutez le script de mise à jour ou lancez le workflow GitHub Actions.';
    else $('notice').textContent = '';
    const cats = [...new Set(state.articles.map(a => a.category))].sort();
    for (const c of cats) { const o = document.createElement('option'); o.value = c; o.textContent = c; $('category').append(o); }
    renderHistory(); render();
  } catch (e) { $('notice').textContent = `Impossible de lire les actualités : ${e.message}. Ouvrez l'application via un serveur web (pas en double-cliquant sur index.html).`; render(); }
}
start();
