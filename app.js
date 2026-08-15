// app.js — Recovery Shield mobile companion.
// Read-only mirror of the extension's data. Nothing here writes back to the extension —
// see index.html's Settings tab for the full list of what this app deliberately can't do
// (notifications, blocking, two-way sync) and why.

const STORAGE_KEY = 'rs_mobile_sync';
const THEME_KEY = 'rs_mobile_theme_override';

const TRIGGER_TAGS = [
  { id: 'boredom', label: 'Boredom' }, { id: 'loneliness', label: 'Loneliness' },
  { id: 'stress', label: 'Stress' }, { id: 'anger', label: 'Anger' },
  { id: 'sadness', label: 'Sadness' }, { id: 'insomnia', label: "Couldn't sleep" },
  { id: 'alone', label: 'Being alone' }, { id: 'phone_in_bed', label: 'Phone in bed' },
  { id: 'social_media', label: 'Social media exposure' }, { id: 'specific_site', label: 'Landed on a specific site' },
  { id: 'search_spiral', label: 'Search rabbit-hole' }, { id: 'free_time', label: 'Unstructured free time' },
  { id: 'other', label: 'Other' }
];
const EMOTIONS = [
  { id: 'bored', label: 'Bored' }, { id: 'lonely', label: 'Lonely' }, { id: 'stressed', label: 'Stressed' },
  { id: 'angry', label: 'Angry' }, { id: 'sad', label: 'Sad' }, { id: 'anxious', label: 'Anxious' },
  { id: 'tired', label: "Tired / couldn't sleep" }, { id: 'numb', label: 'Numb / checked out' },
  { id: 'neutral', label: 'Nothing in particular' }
];
function labelFor(list, id) {
  return list.find((x) => x.id === id)?.label || id;
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js').catch(() => {});
}

// ---------- Theme ----------
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme || 'default');
}
function currentThemePreference(syncedTheme) {
  const override = localStorage.getItem(THEME_KEY);
  return override || syncedTheme || 'default';
}

// ---------- Storage ----------
function decodeSyncCode(code) {
  const binary = atob(code.trim());
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const json = new TextDecoder().decode(bytes);
  return JSON.parse(json);
}
function loadSynced() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function saveSynced(payload) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

// ---------- Helpers ----------
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}
function formatDateTime(date) {
  return `${date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} · ${date.toLocaleTimeString(
    undefined, { hour: 'numeric', minute: '2-digit', hour12: true }
  )}`;
}
function relativeTime(date) {
  const diffMs = Date.now() - date.getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}
function syncFreshnessClass(date) {
  const hours = (Date.now() - date.getTime()) / 3600000;
  if (hours < 6) return 'ok';
  if (hours < 48) return ''; // neutral, no flag needed yet
  return 'err';
}
function truncate(str, max) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max).trim() + '…' : str;
}
function fillList(id, pairs) {
  const el = document.getElementById(id);
  el.innerHTML = '';
  if (pairs.length === 0) {
    el.innerHTML = '<li class="hint-li">Not enough data yet</li>';
    return;
  }
  pairs.forEach(([label, count]) => {
    const li = document.createElement('li');
    li.innerHTML = `<span>${escapeHtml(String(label))}</span><span>${escapeHtml(String(count))}</span>`;
    el.appendChild(li);
  });
}

// ---------- Drawer / nav ----------
const drawer = document.getElementById('drawer');
const drawerOverlay = document.getElementById('drawerOverlay');
function openDrawer() { drawer.classList.add('open'); drawerOverlay.classList.add('open'); }
function closeDrawer() { drawer.classList.remove('open'); drawerOverlay.classList.remove('open'); }
document.getElementById('hamburgerBtn').addEventListener('click', openDrawer);
drawerOverlay.addEventListener('click', closeDrawer);

function activateTab(tabName) {
  document.querySelectorAll('.nav-item').forEach((b) => b.classList.toggle('active', b.dataset.tab === tabName));
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.id === `tab-${tabName}`));
  closeDrawer();
}
document.querySelectorAll('.nav-item').forEach((btn) => {
  btn.addEventListener('click', () => activateTab(btn.dataset.tab));
});

// ---------- Import ----------
document.getElementById('fileTriggerBtn').addEventListener('click', () => {
  document.getElementById('fileInput').click();
});
document.getElementById('fileInput').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    applyImport(JSON.parse(text));
  } catch {
    showStatus("Couldn't read that file — make sure it's the sync file from the extension.", false);
  }
});
document.getElementById('importCodeBtn').addEventListener('click', () => {
  const code = document.getElementById('codeInput').value;
  if (!code.trim()) { showStatus('Paste a sync code first.', false); return; }
  try {
    applyImport(decodeSyncCode(code));
  } catch {
    showStatus("Couldn't read that code — make sure it was copied in full.", false);
  }
});
function showStatus(message, ok) {
  document.getElementById('importStatus').innerHTML = `<p class="status-msg ${ok ? 'ok' : 'err'}">${escapeHtml(message)}</p>`;
}
function applyImport(payload) {
  if (!payload || typeof payload !== 'object' || !payload.streak) {
    showStatus('That file/code doesn\u2019t look like a Recovery Shield sync payload.', false);
    return;
  }
  saveSynced({ ...payload, importedAt: new Date().toISOString() });
  localStorage.removeItem(THEME_KEY); // fresh sync's theme choice wins until you override again
  showStatus('Synced — dashboard updated.', true);
  document.getElementById('codeInput').value = '';
  render();
}
document.getElementById('showSyncFormBtn').addEventListener('click', () => {
  document.getElementById('syncForm').classList.remove('is-hidden');
  document.getElementById('syncCollapsed').classList.add('is-hidden');
});

// ---------- Theme picker ----------
document.getElementById('setTheme').addEventListener('change', (e) => {
  localStorage.setItem(THEME_KEY, e.target.value);
  applyTheme(e.target.value);
});

// ---------- Render ----------
let clockInterval = null;

function render() {
  const data = loadSynced();
  const empty = document.getElementById('emptyState');
  const tabsWrap = document.getElementById('appTabs');
  const syncForm = document.getElementById('syncForm');
  const syncCollapsed = document.getElementById('syncCollapsed');

  if (!data) {
    empty.classList.remove('is-hidden');
    tabsWrap.classList.add('is-hidden');
    syncForm.classList.remove('is-hidden');
    syncCollapsed.classList.add('is-hidden');
    applyTheme(currentThemePreference(null));
    clearInterval(clockInterval);
    return;
  }

  empty.classList.add('is-hidden');
  tabsWrap.classList.remove('is-hidden');
  syncForm.classList.add('is-hidden');
  syncCollapsed.classList.remove('is-hidden');
  updateSyncFreshnessDisplay(data);

  applyTheme(currentThemePreference(data.settings?.theme));
  document.getElementById('setTheme').value = currentThemePreference(data.settings?.theme);

  renderRecovery(data);
  renderTriggers(data);
  renderProgress(data);
  renderHistory(data);
  renderSettingsProfile(data);

  startClock(data.streak.currentStreakStart);
}

function renderRecovery(data) {
  document.getElementById('statLongest').textContent = data.streak.longestStreakDays ?? '–';
  document.getElementById('statTotal').textContent = data.streak.totalSuccessfulDays ?? '–';
  document.getElementById('statRelapses').textContent = data.streak.relapseCount ?? '–';

  const relapses = data.relapses || [];
  const last = relapses.length ? [...relapses].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0] : null;
  const body = document.getElementById('lastSetbackBody');
  if (last) {
    const date = new Date(last.timestamp);
    const tags = [
      last.trigger ? labelFor(TRIGGER_TAGS, last.trigger) : null,
      last.emotion ? labelFor(EMOTIONS, last.emotion) : null,
      last.device || null
    ].filter(Boolean);
    body.innerHTML = `
      <p class="hint" style="text-transform:none;">${formatDateTime(date)}</p>
      <div class="setback-tags">${tags.map((t) => `<span class="tag danger">${escapeHtml(t)}</span>`).join('')}</div>
    `;
  } else {
    body.innerHTML = '<p class="hint">No setback data in this sync.</p>';
  }
}

function renderTriggers(data) {
  const stats = data.triggerStats || {};
  const defaultHint = document.getElementById('highRiskDefaultHint');
  const customHint = document.getElementById('highRiskCustomHint');
  defaultHint.hidden = !stats.highRiskIsDefault;
  customHint.hidden = !stats.highRiskIsCustom;

  fillList('highRiskList', (stats.highRiskWindows || []).map((w) => [w.label, '']));
  fillList('dangerousDaysList', (stats.dangerousDays || []).map((d) => [d.name, d.count]));
  fillList('topTriggersList', (stats.topTriggers || []).map(([k, v]) => [labelFor(TRIGGER_TAGS, k), v]));
  fillList('topDevicesList', (stats.topDevices || []).map(([k, v]) => [k, v]));
}

function renderProgress(data) {
  const relapses = data.relapses || [];
  const insightEl = document.getElementById('insightText');
  const chartEl = document.getElementById('gapChart');
  chartEl.innerHTML = '';

  if (relapses.length < 2) {
    insightEl.textContent = 'Log a couple of setbacks (in the extension) to start seeing trend insights here.';
    return;
  }

  const sorted = [...relapses].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  const gaps = [];
  for (let i = 1; i < sorted.length; i++) {
    gaps.push(Math.max(0, (new Date(sorted[i].timestamp) - new Date(sorted[i - 1].timestamp)) / 86400000));
  }
  const max = Math.max(...gaps, 1);
  gaps.forEach((g) => {
    const bar = document.createElement('div');
    bar.className = 'bar';
    bar.style.height = `${Math.max(4, (g / max) * 100)}%`;
    chartEl.appendChild(bar);
  });

  const half = Math.floor(gaps.length / 2) || 1;
  const earlierAvg = gaps.slice(0, half).reduce((s, v) => s + v, 0) / half;
  const recentSlice = gaps.slice(half);
  const recentAvg = recentSlice.length ? recentSlice.reduce((s, v) => s + v, 0) / recentSlice.length : earlierAvg;

  if (recentAvg >= earlierAvg) {
    insightEl.textContent = `Your average time between setbacks has gone from ${earlierAvg.toFixed(1)} days to ${recentAvg.toFixed(1)} days — that's real progress.`;
  } else {
    insightEl.textContent = `Your average time between setbacks is ${recentAvg.toFixed(1)} days recently, down from ${earlierAvg.toFixed(1)}. Worth noticing, not a reason to be hard on yourself.`;
  }
}

function renderHistory(data) {
  const relapses = data.relapses || [];
  const list = document.getElementById('historyList');
  const empty = document.getElementById('historyEmpty');
  const truncHint = document.getElementById('historyTruncatedHint');
  list.innerHTML = '';
  truncHint.hidden = !data.relapsesTruncated;

  if (relapses.length === 0) { empty.hidden = false; return; }
  empty.hidden = true;

  [...relapses].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).forEach((r) => {
    const date = new Date(r.timestamp);
    const div = document.createElement('div');
    div.className = 'history-item';
    div.innerHTML = `
      <div class="date">${formatDateTime(date)}</div>
      <div class="tag-row">
        ${r.trigger ? `<span class="tag">${escapeHtml(labelFor(TRIGGER_TAGS, r.trigger))}</span>` : ''}
        ${r.emotion ? `<span class="tag">${escapeHtml(labelFor(EMOTIONS, r.emotion))}</span>` : ''}
        ${r.device ? `<span class="tag">${escapeHtml(r.device)}</span>` : ''}
      </div>
      ${r.location ? `<p class="hint" style="text-transform:none;margin:4px 0 0;">${escapeHtml(r.location)}</p>` : ''}
    `;
    list.appendChild(div);
  });
}

function renderSettingsProfile(data) {
  const p = data.profile || {};
  const win = p.customHighRiskWindow;
  document.getElementById('profileTimeText').textContent = win?.enabled
    ? `Custom window: ${win.start} – ${win.end}`
    : `Urge times: ${(p.urgeTimeOfDay || []).join(', ') || 'not set'}`;
  document.getElementById('profileDaysText').textContent = `Worse days: ${(p.urgeDays || []).join(', ') || 'not set'}`;
  document.getElementById('profileTriggersText').textContent = `Triggers: ${(p.emotionalTriggers || []).map((t) => labelFor(TRIGGER_TAGS, t)).join(', ') || 'not set'}`;
}

function updateSyncFreshnessDisplay(data) {
  const importedAt = new Date(data.importedAt);
  const freshness = syncFreshnessClass(importedAt);
  const syncedEl = document.getElementById('syncedAtText');
  if (!syncedEl) return;
  syncedEl.textContent = `Synced ${relativeTime(importedAt)} (${formatDateTime(importedAt)})`;
  syncedEl.style.color = freshness === 'err' ? 'var(--danger)' : freshness === 'ok' ? 'var(--accent)' : '';
}

function startClock(startIso) {
  clearInterval(clockInterval);
  tick();
  clockInterval = setInterval(tick, 1000);
  function tick() {
    const start = startIso ? new Date(startIso).getTime() : Date.now();
    const elapsed = Math.max(0, Date.now() - start);
    const days = Math.floor(elapsed / 86400000);
    const hours = Math.floor((elapsed % 86400000) / 3600000);
    const minutes = Math.floor((elapsed % 3600000) / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    document.getElementById('clockDays').textContent = days;
    document.getElementById('clockDaysPlural').textContent = days === 1 ? '' : 's';
    document.getElementById('clockHours').textContent = String(hours).padStart(2, '0');
    document.getElementById('clockMinutes').textContent = String(minutes).padStart(2, '0');
    document.getElementById('clockSeconds').textContent = String(seconds).padStart(2, '0');
    document.getElementById('clockSince').textContent = startIso ? `Since ${formatDateTime(new Date(startIso))}` : 'Not started';

    const data = loadSynced();
    if (data) updateSyncFreshnessDisplay(data); // keeps "X ago" honest without a full re-render every second
  }
}

// ---------- Urge / emergency flow ----------
// Self-contained — no backend calls, works fully offline. Ported from the extension's
// own urge-support flow (src/emergency/emergency.js) since the content itself doesn't
// depend on anything the extension can do that a phone can't.
const URGE_STEPS = [
  { title: 'Step away, physically', body: 'If you can, stand up and move to a different room. Physical distance from the trigger matters more than willpower does.' },
  { title: 'Put your device down', body: "If you're on your phone right now, set it down somewhere out of reach for a minute after this." },
  { title: 'Breathe with this for a moment', body: '', breathing: true },
  { title: 'Do one small thing instead', body: "Splash cold water on your face, do 10 pushups, text a friend, or step outside for a minute. Anything that isn't this." },
  { title: 'Remember why this matters', body: 'Your streak and your goals are still here, waiting on the other side of this moment.' }
];
let urgeTimerInterval = null;
let urgeStepIndex = 0;
let urgeStepInterval = null;

function showUrgeStage(id) {
  document.querySelectorAll('.urge-stage').forEach((s) => s.classList.toggle('active', s.id === id));
}
function openUrgeView() {
  document.getElementById('urgeView').classList.remove('is-hidden');
  showUrgeStage('urge-stage-intro');
  document.getElementById('urgeTimerDisplay').textContent = '03:00';
}
function closeUrgeView() {
  document.getElementById('urgeView').classList.add('is-hidden');
  clearInterval(urgeTimerInterval);
  clearInterval(urgeStepInterval);
}
document.getElementById('fabUrgeBtn').addEventListener('click', openUrgeView);
document.getElementById('drawerUrgeBtn').addEventListener('click', () => { closeDrawer(); openUrgeView(); });
document.getElementById('urgeCloseBtn').addEventListener('click', closeUrgeView);
document.getElementById('urgeDoneBtn').addEventListener('click', closeUrgeView);
document.getElementById('urgeGoRecoveryBtn').addEventListener('click', () => { closeUrgeView(); activateTab('recovery'); });

document.getElementById('urgeStartBtn').addEventListener('click', startUrgeTimer);
document.getElementById('urgeRestartBtn').addEventListener('click', startUrgeTimer);

function startUrgeTimer() {
  showUrgeStage('urge-stage-active');
  urgeStepIndex = 0;
  showUrgeStep();
  clearInterval(urgeStepInterval);
  urgeStepInterval = setInterval(() => {
    urgeStepIndex = (urgeStepIndex + 1) % URGE_STEPS.length;
    showUrgeStep();
  }, 36000); // ~3min / 5 steps

  let remaining = 180;
  const display = document.getElementById('urgeTimerDisplayActive');
  clearInterval(urgeTimerInterval);
  urgeTimerInterval = setInterval(() => {
    remaining--;
    const m = Math.floor(remaining / 60);
    const s = remaining % 60;
    display.textContent = `${m}:${String(s).padStart(2, '0')}`;
    if (remaining <= 0) {
      clearInterval(urgeTimerInterval);
      clearInterval(urgeStepInterval);
      showUrgeStage('urge-stage-checkin');
    }
  }, 1000);
}
function showUrgeStep() {
  const step = URGE_STEPS[urgeStepIndex];
  document.getElementById('urgeStepTitle').textContent = step.title;
  document.getElementById('urgeStepBody').textContent = step.body;
  document.getElementById('urgeBreathing').classList.toggle('is-hidden', !step.breathing);
}
document.querySelectorAll('#urge-stage-checkin [data-result]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const result = btn.dataset.result;
    showUrgeStage(result === 'passed' ? 'urge-stage-passed' : 'urge-stage-continue');
  });
});

render();
