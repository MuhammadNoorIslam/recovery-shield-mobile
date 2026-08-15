// app.js — Recovery Shield mobile companion.
// This is a READ-ONLY mirror: it displays whatever was in the last sync file/code you
// imported from the extension. It never writes back to the extension, and it has no
// access to your browsing at all — see index.html's "Blocking on your phone" section
// for why that's a hard platform limit, not something this code is choosing not to do.

const STORAGE_KEY = 'rs_mobile_sync';

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js').catch(() => {
    // offline install just won't work this session — the page still functions online
  });
}

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
  } catch {
    return null;
  }
}

function saveSynced(payload) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function showStatus(message, ok) {
  const el = document.getElementById('importStatus');
  el.innerHTML = `<p class="status-msg ${ok ? 'ok' : 'err'}">${escapeHtml(message)}</p>`;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

function formatDateTime(date) {
  return `${date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} · ${date.toLocaleTimeString(
    undefined,
    { hour: 'numeric', minute: '2-digit' }
  )}`;
}

// ---------- Import handlers ----------
document.getElementById('fileTriggerBtn').addEventListener('click', () => {
  document.getElementById('fileInput').click();
});

document.getElementById('fileInput').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    const payload = JSON.parse(text);
    applyImport(payload);
  } catch (err) {
    showStatus("Couldn't read that file — make sure it's the sync file from the extension.", false);
  }
});

document.getElementById('importCodeBtn').addEventListener('click', () => {
  const code = document.getElementById('codeInput').value;
  if (!code.trim()) {
    showStatus('Paste a sync code first.', false);
    return;
  }
  try {
    const payload = decodeSyncCode(code);
    applyImport(payload);
  } catch (err) {
    showStatus("Couldn't read that code — make sure it was copied in full.", false);
  }
});

function applyImport(payload) {
  if (!payload || typeof payload !== 'object' || !payload.streak) {
    showStatus('That file/code doesn\u2019t look like a Recovery Shield sync payload.', false);
    return;
  }
  saveSynced({ ...payload, importedAt: new Date().toISOString() });
  showStatus('Synced — dashboard updated below.', true);
  document.getElementById('codeInput').value = '';
  render();
}

// ---------- Render ----------
let clockInterval = null;

function render() {
  const data = loadSynced();
  const empty = document.getElementById('emptyState');
  const dash = document.getElementById('dashboard');
  const importHeading = document.getElementById('importHeading');

  if (!data) {
    empty.classList.remove('is-hidden');
    dash.classList.add('is-hidden');
    importHeading.textContent = 'Import sync data';
    clearInterval(clockInterval);
    return;
  }

  empty.classList.add('is-hidden');
  dash.classList.remove('is-hidden');
  importHeading.textContent = 'Update sync data';

  document.getElementById('statLongest').textContent = data.streak.longestStreakDays ?? '–';
  document.getElementById('statTotal').textContent = data.streak.totalSuccessfulDays ?? '–';
  document.getElementById('statRelapses').textContent = data.streak.relapseCount ?? '–';

  const win = data.profile?.customHighRiskWindow;
  const windowText = document.getElementById('windowText');
  if (win?.enabled) {
    windowText.textContent = `${win.start} – ${win.end} (set manually)`;
  } else if (data.profile?.urgeTimeOfDay?.length) {
    windowText.textContent = `Based on: ${data.profile.urgeTimeOfDay.join(', ')}`;
  } else {
    windowText.textContent = 'Not set — configure this in the extension.';
  }

  const lastBody = document.getElementById('lastSetbackBody');
  if (data.lastRelapse) {
    const date = new Date(data.lastRelapse.timestamp);
    const tags = [data.lastRelapse.trigger, data.lastRelapse.emotion, data.lastRelapse.device].filter(Boolean);
    lastBody.innerHTML = `
      <p class="hint" style="text-transform:none;">${formatDateTime(date)}</p>
      <div class="setback-tags">${tags.map((t) => `<span class="tag danger">${escapeHtml(t)}</span>`).join('')}</div>
    `;
  } else {
    lastBody.innerHTML = '<p class="hint">No setback data in this sync.</p>';
  }

  document.getElementById('syncedAtText').textContent = data.importedAt
    ? `Imported ${formatDateTime(new Date(data.importedAt))} (generated ${formatDateTime(new Date(data.exportedAt))} on your computer)`
    : `Generated ${formatDateTime(new Date(data.exportedAt))}`;

  startClock(data.streak.currentStreakStart);
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
  }
}

render();
