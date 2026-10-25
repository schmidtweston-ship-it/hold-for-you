/* Hold for You — Knox ops. Presence, not therapy. Equal always. */
(function () {
  const KEY = 'hold-for-you-v1';
  const WAYS = [
    { id: 'text', label: 'Sent a text' },
    { id: 'call', label: 'Called' },
    { id: 'sat', label: 'Sat with them' },
    { id: 'name', label: 'Said their name' },
    { id: 'note', label: 'Left a note' },
    { id: 'meal', label: 'Shared a meal' },
    { id: 'quiet', label: 'Held the quiet' },
  ];

  const $ = (s, r = document) => r.querySelector(s);
  const app = $('#app');
  const toastEl = $('#toast');

  function blank() {
    return { who: '', since: null, days: {}, updated: null };
  }
  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (!raw) return blank();
      return Object.assign(blank(), raw, { days: raw.days || {} });
    } catch (_) {
      return blank();
    }
  }
  function save(S) {
    S.updated = new Date().toISOString();
    try {
      localStorage.setItem(KEY, JSON.stringify(S));
    } catch (e) {
      toast('Could not save on this device.');
    }
  }

  let S = load();
  let draftWays = new Set();
  let draftNote = '';

  function esc(t) {
    return String(t ?? '').replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
    );
  }
  function todayKey(d = new Date()) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  function parseKey(k) {
    const [y, m, d] = k.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  function fmtLong(k) {
    return parseKey(k).toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  }
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toastEl.classList.remove('show'), 2200);
  }

  function streakCount() {
    let n = 0;
    const d = new Date();
    // If today not held yet, start from yesterday so a morning open doesn't zero the streak.
    if (!S.days[todayKey(d)]) d.setDate(d.getDate() - 1);
    for (;;) {
      const k = todayKey(d);
      if (!S.days[k]) break;
      n++;
      d.setDate(d.getDate() - 1);
      if (n > 400) break;
    }
    return n;
  }

  function heldKeysSorted() {
    return Object.keys(S.days).sort((a, b) => (a < b ? 1 : -1));
  }

  function calendarDays() {
    const out = [];
    const end = new Date();
    for (let i = 27; i >= 0; i--) {
      const d = new Date(end);
      d.setDate(end.getDate() - i);
      out.push(todayKey(d));
    }
    return out;
  }

  function renderSetup() {
    app.innerHTML = `
      <div class="brand">
        <div class="mark" aria-hidden="true"></div>
        <div>
          <h1>Hold for You</h1>
          <p class="sub">One person. One daily hold. Presence, not therapy.</p>
        </div>
      </div>
      <p class="lede">Ops for connection. Name who you hold for — then mark the days you show up. Lives on this device only.</p>
      <div class="card">
        <h2>Who do you hold for?</h2>
        <p class="hint">A partner, a kid, a parent, a friend. One name for this hold.</p>
        <label for="who">Their name</label>
        <input id="who" autocomplete="off" placeholder="The person you hold for" maxlength="80">
        <div class="actions">
          <button type="button" id="start">Begin holding</button>
        </div>
      </div>
      <p class="foot">Knox · Equal always · Always, always, always</p>
    `;
    $('#who').focus();
    $('#start').onclick = () => {
      const who = ($('#who').value || '').trim();
      if (!who) {
        toast('Write a name first.');
        $('#who').focus();
        return;
      }
      S.who = who;
      S.since = todayKey();
      save(S);
      draftWays = new Set();
      draftNote = '';
      renderHome();
      toast('Holding for ' + who + '.');
    };
    $('#who').onkeydown = (e) => {
      if (e.key === 'Enter') $('#start').click();
    };
  }

  function renderHome() {
    const today = todayKey();
    const heldToday = !!S.days[today];
    const entry = S.days[today];
    if (heldToday && entry) {
      draftWays = new Set(entry.ways || []);
      draftNote = entry.note || '';
    }
    const streak = streakCount();
    const days = calendarDays();
    const logs = heldKeysSorted().slice(0, 12);

    app.innerHTML = `
      <div class="brand">
        <div class="mark" aria-hidden="true"></div>
        <div>
          <h1>Hold for You</h1>
          <p class="sub">Presence with receipts · local only</p>
        </div>
      </div>

      <div class="card">
        <p class="meta">Holding for</p>
        <p class="who">${esc(S.who)}</p>
        <p class="meta">${S.since ? 'Since ' + esc(fmtLong(S.since)) : ''}</p>
        <div class="streak"><span class="n">${streak}</span> day${streak === 1 ? '' : 's'} held in a row</div>
      </div>

      <div class="card" id="today-card">
        <h2>${heldToday ? 'Today — held' : 'Today’s hold'}</h2>
        <p class="hint">${heldToday ? 'You already marked today. You can update it.' : 'How did you show up? Tap what fits. A note is optional.'}</p>
        <div class="ways" id="ways">
          ${WAYS.map(
            (w) =>
              `<button type="button" class="way${draftWays.has(w.id) ? ' on' : ''}" data-way="${w.id}">${esc(w.label)}</button>`
          ).join('')}
        </div>
        <label for="note">A line for the day (optional)</label>
        <textarea id="note" maxlength="400" placeholder="Kept it light. Asked about the walk. Sat on the porch.">${esc(draftNote)}</textarea>
        <div class="actions">
          <button type="button" id="save-day">${heldToday ? 'Update today’s hold' : 'I held today'}</button>
          ${heldToday ? '<button type="button" class="ghost" id="unhold">Clear today</button>' : ''}
        </div>
      </div>

      <div class="card">
        <h2>Last 28 days</h2>
        <p class="hint">Gold days are days you held.</p>
        <div class="cal" aria-label="28-day hold calendar">
          ${['S', 'M', 'T', 'W', 'T', 'F', 'S']
            .map((l) => `<div class="d lab">${l}</div>`)
            .join('')}
          ${(() => {
            const first = parseKey(days[0]);
            const pad = first.getDay();
            let html = '';
            for (let i = 0; i < pad; i++) html += `<div class="d" style="opacity:0"></div>`;
            days.forEach((k) => {
              const d = parseKey(k).getDate();
              const cls = ['d', S.days[k] ? 'held' : '', k === today ? 'today' : '']
                .filter(Boolean)
                .join(' ');
              html += `<div class="${cls}" title="${esc(k)}">${d}</div>`;
            });
            return html;
          })()}
        </div>
      </div>

      <div class="card">
        <h2>Recent holds</h2>
        ${
          logs.length
            ? `<ul class="log">${logs
                .map((k) => {
                  const e = S.days[k];
                  const labels = (e.ways || [])
                    .map((id) => WAYS.find((w) => w.id === id)?.label || id)
                    .join(' · ');
                  return `<li><span class="when">${esc(fmtLong(k))}</span>${
                    e.note ? esc(e.note) : '<span class="empty">Held — no note</span>'
                  }${labels ? `<div class="ways-line">${esc(labels)}</div>` : ''}</li>`;
                })
                .join('')}</ul>`
            : `<p class="empty">No days held yet. Mark today when you show up.</p>`
        }
      </div>

      <div class="actions" style="margin-top:18px">
        <button type="button" class="soft" id="rename">Change who</button>
        <button type="button" class="ghost" id="reset">Reset this hold</button>
      </div>
      <p class="foot">Not therapy. Not a clinic. Just you, holding someone.<br>Knox · Equal always</p>
    `;

    $('#ways').onclick = (e) => {
      const btn = e.target.closest('[data-way]');
      if (!btn) return;
      const id = btn.getAttribute('data-way');
      if (draftWays.has(id)) draftWays.delete(id);
      else draftWays.add(id);
      btn.classList.toggle('on');
    };
    $('#note').oninput = (e) => {
      draftNote = e.target.value;
    };
    $('#save-day').onclick = () => {
      const note = ($('#note').value || '').trim();
      S.days[today] = {
        ways: Array.from(draftWays),
        note,
        at: new Date().toISOString(),
      };
      save(S);
      toast(heldToday ? 'Updated.' : 'Held. Equal always.');
      renderHome();
    };
    const un = $('#unhold');
    if (un) {
      un.onclick = () => {
        delete S.days[today];
        save(S);
        draftWays = new Set();
        draftNote = '';
        toast('Cleared today.');
        renderHome();
      };
    }
    $('#rename').onclick = () => {
      const next = prompt('Who do you hold for?', S.who);
      if (next == null) return;
      const who = next.trim();
      if (!who) return toast('Need a name.');
      S.who = who;
      save(S);
      renderHome();
      toast('Now holding for ' + who + '.');
    };
    $('#reset').onclick = () => {
      if (!confirm('Reset this hold? Days and notes on this device will be cleared.')) return;
      S = blank();
      save(S);
      draftWays = new Set();
      draftNote = '';
      renderSetup();
      toast('Cleared.');
    };
  }

  if (!S.who) renderSetup();
  else renderHome();
})();
