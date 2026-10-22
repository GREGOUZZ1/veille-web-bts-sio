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
function renderHistory() {
  const weeks = new Map();
  for (const a of state.articles) { const week = mondayOf(a.date); weeks.set(week, (weeks.get(week) || 0) + 1); }
  const container = $('history-list'); container.replaceChildren();
  if (!weeks.size) { container.textContent = 'L’historique apparaîtra après la première mise à jour.'; return; }
  for (const [week, count] of [...weeks].sort((a,b) => b[0].localeCompare(a[0])).slice(0, 16)) {
    const row = document.createElement('div'); row.className = 'history-week';
    const label = document.createElement('div'); label.textContent = `Semaine du ${fmtDate(week)}`;
    const info = document.createElement('small'); info.textContent = `${count} article${count > 1 ? 's' : ''}`;
    row.append(label, info);
    container.append(row);
  }
}
function initEvents() {
  $('search').addEventListener('input', e => { state.q = e.target.value.trim().toLowerCase(); state.limit=9; render(); });
  $('category').addEventListener('change', e => { state.filter=e.target.value; state.limit=9; render(); });
  document.querySelectorAll('.chip').forEach(c => c.addEventListener('click', () => {state.filter=c.dataset.category; state.limit=9; render();}));
  $('more').addEventListener('click', () => {state.limit+=9;render();});
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
