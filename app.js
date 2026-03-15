// ── CONSTANTS ──
const ICONS = ['🎯','💰','🏠','🚗','✈️','📱','💻','🎮','👗','🎓','🛡️','🎁','❤️','🌴','⭐'];
const RING_COLORS = [
  '#f0f0f0','#999999','#c8b89a','#8ab0c4','#a8c490',
  '#c49090','#90c4b4','#b490c4','#d4bc7a','#7abcd4'
];

// ── STATE ──
let goals        = JSON.parse(localStorage.getItem('sibings_goals'))        || getDefaultGoals();
let archived     = JSON.parse(localStorage.getItem('sibings_archived'))     || [];
let transactions = JSON.parse(localStorage.getItem('sibings_transactions')) || [];
let selIcon      = '🎯';
let selColor     = RING_COLORS[0];
let activeTxId   = null;

function getDefaultGoals() {
  return [
    { id:'1', name:'New iPhone',     target:60000, balance:22500, icon:'📱', color:RING_COLORS[0], createdAt:Date.now(),           streak:3, lastDeposit:Date.now()-86400000,   deadline:null },
    { id:'2', name:'Vacation Fund',  target:80000, balance:32000, icon:'✈️', color:RING_COLORS[1], createdAt:Date.now()-86400000,  streak:7, lastDeposit:Date.now()-86400000,   deadline:null },
    { id:'3', name:'Emergency Fund', target:50000, balance:21000, icon:'🛡️', color:RING_COLORS[2], createdAt:Date.now()-172800000, streak:1, lastDeposit:Date.now()-172800000,  deadline:null }
  ];
}

// ── UTILS ──
function fmt(v) {
  return '₱' + new Intl.NumberFormat('en-PH', { minimumFractionDigits:0, maximumFractionDigits:0 }).format(v);
}
function fmtDate(ts) {
  return new Intl.DateTimeFormat('en-PH', { month:'short', day:'numeric' }).format(new Date(ts));
}
function pct(g)       { return Math.min(100, Math.round((g.balance / g.target) * 100)); }
function totalSaved() { return goals.reduce((s,g) => s + g.balance, 0); }
function totalTarget(){ return goals.reduce((s,g) => s + g.target, 0); }
function overallPct() { const tt = totalTarget(); return tt === 0 ? 0 : Math.round((totalSaved() / tt) * 100); }
function daysUntil(ds){ if(!ds) return null; return Math.ceil((new Date(ds) - Date.now()) / 86400000); }

function saveData() {
  localStorage.setItem('sibings_goals',        JSON.stringify(goals));
  localStorage.setItem('sibings_archived',     JSON.stringify(archived));
  localStorage.setItem('sibings_transactions', JSON.stringify(transactions));
}

// ── TAB SWITCHING ──
function switchTab(tab, el) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.add('active');
  if (el) el.classList.add('active');
  renderAll();
}

// ── RENDER ALL ──
function renderAll() {
  renderSavingsTab();
  renderProgressTab();
  renderSettingsTab();
}

// ── SAVINGS TAB ──
function renderSavingsTab() {
  document.getElementById('totalSaved').textContent  = fmt(totalSaved());
  document.getElementById('totalGoals').textContent  = goals.length;
  renderRings();

  const list = document.getElementById('goalsList');
  if (goals.length === 0) {
    list.innerHTML = `<div class="empty-state">
      <div class="empty-icon">🎯</div>
      <p class="empty-title">No savings goals yet</p>
      <p class="empty-sub">Tap + to create your first goal</p>
    </div>`;
    return;
  }

  list.innerHTML = goals.map((g, i) => {
    const p   = pct(g);
    const dl  = daysUntil(g.deadline);
    const dlClass = (dl !== null && dl <= 7) ? 'urgent' : '';
    const dlText  = dl === null ? '' : dl < 0 ? 'overdue' : dl === 0 ? 'due today' : `${dl}d left`;
    const isOverdue = dl !== null && dl < 0;
    const isDone    = p >= 100;
    const streak    = g.streak || 0;

    return `<div class="goal-card ${isOverdue ? 'overdue' : ''} has-color"
                 style="--goal-color:${g.color}; animation-delay:${i * 0.045}s">
      <div class="goal-header">
        <div class="goal-emoji">${g.icon}</div>
        <div class="goal-meta">
          <div class="goal-name">${g.name}</div>
          <div class="goal-amounts"><span>${fmt(g.balance)}</span> / ${fmt(g.target)}</div>
        </div>
        <div class="goal-right">
          ${isDone
            ? `<span class="goal-done-tag">DONE</span>`
            : `<span class="goal-pct">${p}%</span>`}
          ${dlText ? `<span class="goal-deadline ${dlClass}">${dlText}</span>` : ''}
          ${streak > 0 ? `<span class="goal-streak">🔥 ${streak}d</span>` : ''}
        </div>
      </div>
      <div class="goal-bar-track">
        <div class="goal-bar-fill" style="width:${p}%; background:${g.color}"></div>
      </div>
      <div class="goal-actions">
        ${isDone
          ? `<button class="btn btn-secondary btn-full" onclick="archiveGoal('${g.id}')">Archive</button>`
          : `<button class="btn btn-primary btn-full" onclick="openTxModal('${g.id}')">Update</button>`}
      </div>
    </div>`;
  }).join('');
}

// ── RINGS ──
function renderRings() {
  const svg    = document.getElementById('ringsSvg');
  const legend = document.getElementById('ringsLegend');
  const figure = document.getElementById('ringsFigure');

  document.getElementById('ringsTotalAmt').textContent    = fmt(totalSaved());
  document.getElementById('ringsTotalTarget').textContent = fmt(totalTarget());
  document.getElementById('ringsTotalPct').textContent    = overallPct() + '%';

  if (goals.length === 0) {
    svg.setAttribute('viewBox', '0 0 260 260');
    svg.style.width  = '260px';
    svg.style.height = '260px';
    figure.style.width  = '260px';
    figure.style.height = '260px';
    svg.innerHTML = '';
    legend.innerHTML = `<div style="text-align:center;font-size:11px;color:var(--dim);padding:8px 0">Add goals to see rings</div>`;
    return;
  }

  const STROKE  = 10;
  const GAP     = 22;   // px between ring centres
  const INNER_R = 55;   // big inner ring for prominent %
  const n       = Math.min(goals.length, 8);
  const OUTER_R = INNER_R + (n - 1) * GAP;
  const PAD     = Math.ceil(STROKE / 2) + 3;
  const SIZE    = (OUTER_R + PAD) * 2;
  const CX      = SIZE / 2;
  const CY      = SIZE / 2;

  svg.setAttribute('viewBox', `0 0 ${SIZE} ${SIZE}`);
  svg.style.width  = SIZE + 'px';
  svg.style.height = SIZE + 'px';
  svg.style.transform = 'none';
  figure.style.width  = SIZE + 'px';
  figure.style.height = SIZE + 'px';

  let arcs = '';
  goals.slice(0, 8).forEach((g, i) => {
    const r    = INNER_R + i * GAP;
    const circ = 2 * Math.PI * r;
    const dashOffset = circ * (1 - pct(g) / 100);

    arcs += `
      <circle cx="${CX}" cy="${CY}" r="${r}"
        fill="none" stroke="#1c1c1c" stroke-width="${STROKE}"/>
      <circle cx="${CX}" cy="${CY}" r="${r}"
        fill="none" stroke="${g.color}" stroke-width="${STROKE}"
        stroke-linecap="round"
        stroke-dasharray="${circ.toFixed(2)}"
        stroke-dashoffset="${circ.toFixed(2)}"
        class="ring-arc"
        data-target="${dashOffset.toFixed(2)}"/>`;
  });

  svg.innerHTML = `<g transform="rotate(-90 ${CX} ${CY})">${arcs}</g>`;

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      svg.querySelectorAll('.ring-arc').forEach((el, i) => {
        el.style.transition = `stroke-dashoffset 0.8s cubic-bezier(0.32,1.1,0.6,1) ${i * 0.08}s`;
        el.style.strokeDashoffset = el.dataset.target;
      });
    });
  });

  legend.innerHTML = goals.slice(0, 8).map(g => `
    <div class="ring-legend-row">
      <div class="ring-legend-left">
        <div class="ring-legend-dot" style="background:${g.color}"></div>
        <span class="ring-legend-name">${g.name}</span>
      </div>
      <span class="ring-legend-right">${fmt(g.balance)} / ${fmt(g.target)}</span>
    </div>`).join('');
}

// ── PROGRESS TAB ──
function renderProgressTab() {
  const deps = transactions.filter(t => t.type === 'deposit').reduce((s,t) => s + t.amount, 0);
  const wds  = transactions.filter(t => t.type === 'withdraw').reduce((s,t) => s + t.amount, 0);

  document.getElementById('netSavings').textContent      = fmt(deps - wds);
  document.getElementById('totalDeposits').textContent   = fmt(deps);
  document.getElementById('totalWithdrawals').textContent= fmt(wds);
  document.getElementById('completedGoals').textContent  = goals.filter(g => pct(g) >= 100).length;
  document.getElementById('inProgressGoals').textContent = goals.filter(g => g.balance > 0 && pct(g) < 100).length;
  document.getElementById('notStartedGoals').textContent = goals.filter(g => g.balance === 0).length;

  // Breakdown
  const bl = document.getElementById('breakdownList');
  if (goals.length === 0) {
    bl.innerHTML = `<div class="empty-state"><div class="empty-icon">📊</div><p class="empty-title">No goals yet</p></div>`;
  } else {
    bl.innerHTML = goals.slice().sort((a,b) => pct(b) - pct(a)).map(g => {
      const p = pct(g);
      return `<div class="breakdown-item">
        <div class="breakdown-top">
          <div class="breakdown-left">
            <span style="font-size:16px">${g.icon}</span>
            <span class="breakdown-name">${g.name}</span>
          </div>
          <span class="breakdown-amount">${fmt(g.balance)} / ${fmt(g.target)}</span>
        </div>
        <div class="breakdown-bar">
          <div class="breakdown-fill" style="width:${p}%; background:${g.color}"></div>
        </div>
        <div class="breakdown-footer">
          <span>${p}% complete</span>
          <span>${fmt(g.target - g.balance)} to go</span>
        </div>
      </div>`;
    }).join('');
  }

  // Transactions
  const txList = document.getElementById('transactionList');
  const recent = [...transactions].sort((a,b) => b.date - a.date).slice(0, 10);
  if (recent.length === 0) {
    txList.innerHTML = `<div class="empty-state"><div class="empty-icon">📅</div><p class="empty-title">No transactions yet</p></div>`;
  } else {
    txList.innerHTML = recent.map(t => {
      const g = goals.find(x => x.id === t.goalId);
      return `<div class="tx-item">
        <div class="tx-left">
          <div class="tx-dot ${t.type}"></div>
          <div class="tx-info">
            <span class="tx-type">${t.type}</span>
            <span class="tx-goal">${g?.name || 'Unknown'}</span>
            ${t.note ? `<span class="tx-note">${t.note}</span>` : ''}
          </div>
        </div>
        <div class="tx-right">
          <div class="tx-amount ${t.type}">${t.type==='deposit' ? '+' : '−'}${fmt(t.amount)}</div>
          <div class="tx-date">${fmtDate(t.date)}</div>
        </div>
      </div>`;
    }).join('');
  }
}

// ── SETTINGS TAB ──
function renderSettingsTab() {
  document.getElementById('settingsGoals').textContent        = goals.length;
  document.getElementById('settingsTransactions').textContent = transactions.length;
  document.getElementById('settingsSaved').textContent        = fmt(totalSaved());
}

// ── TX MODAL ──
function openTxModal(id) {
  activeTxId = id;
  const g = goals.find(x => x.id === id);
  document.getElementById('txModalTitle').textContent = g.name;
  document.getElementById('txAmount').value = '';
  document.getElementById('txNote').value   = '';
  document.getElementById('txModal').classList.add('active');
  setTimeout(() => document.getElementById('txAmount').focus(), 220);
}
function closeTxModal() {
  document.getElementById('txModal').classList.remove('active');
  activeTxId = null;
}
function doDeposit() {
  const amt  = parseFloat(document.getElementById('txAmount').value);
  const note = document.getElementById('txNote').value.trim();
  if (!amt || amt <= 0 || !activeTxId) return;
  const g = goals.find(x => x.id === activeTxId);
  if (!g) return;
  const wasDone = pct(g) >= 100;
  g.balance += amt;
  // streak logic
  const now = Date.now();
  const daysSinceLastDeposit = g.lastDeposit ? Math.floor((now - g.lastDeposit) / 86400000) : 999;
  g.streak      = daysSinceLastDeposit <= 1 ? (g.streak || 0) + 1 : 1;
  g.lastDeposit = now;
  transactions.push({ id: Date.now().toString(), goalId: activeTxId, amount: amt, type: 'deposit', date: now, note });
  saveData();
  closeTxModal();
  renderAll();
  if (!wasDone && pct(g) >= 100) triggerCompletion(g);
}
function doWithdraw() {
  const amt  = parseFloat(document.getElementById('txAmount').value);
  const note = document.getElementById('txNote').value.trim();
  const g    = goals.find(x => x.id === activeTxId);
  if (!amt || amt <= 0 || !g || amt > g.balance) return;
  g.balance -= amt;
  transactions.push({ id: Date.now().toString(), goalId: activeTxId, amount: amt, type: 'withdraw', date: Date.now(), note });
  saveData();
  closeTxModal();
  renderAll();
}

// ── ARCHIVE ──
function archiveGoal(id) {
  const idx = goals.findIndex(g => g.id === id);
  if (idx > -1) {
    archived.push({ ...goals[idx], archivedAt: Date.now() });
    goals.splice(idx, 1);
    saveData();
    renderAll();
  }
}

// ── CONFETTI ──
function triggerCompletion(goal) {
  const canvas = document.getElementById('confetti-canvas');
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  canvas.classList.add('active');
  const ctx = canvas.getContext('2d');
  const shades = ['#f0f0f0','#aaaaaa','#ffffff','#cccccc','#888888'];
  const pieces = Array.from({ length: 80 }, () => ({
    x:    Math.random() * canvas.width,
    y:    -10 - Math.random() * 40,
    vx:   (Math.random() - 0.5) * 3.5,
    vy:   1.8 + Math.random() * 2.8,
    r:    3 + Math.random() * 5,
    color: shades[Math.floor(Math.random() * shades.length)],
    rot:  Math.random() * 360,
    rotV: (Math.random() - 0.5) * 7,
    w:    4 + Math.random() * 8,
    h:    4 + Math.random() * 4
  }));
  let frame = 0;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pieces.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.rot += p.rotV;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot * Math.PI / 180);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    });
    frame++;
    if (frame < 130) requestAnimationFrame(draw);
    else {
      canvas.classList.remove('active');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }
  draw();
}

// ── ADD GOAL MODAL ──
function openAddModal() {
  renderIconGrid();
  renderColorGrid();
  document.getElementById('addModal').classList.add('active');
  setTimeout(() => document.getElementById('goalName').focus(), 220);
}
function closeAddModal() {
  document.getElementById('addModal').classList.remove('active');
  ['goalName','goalTarget','goalDeadline'].forEach(id => document.getElementById(id).value = '');
  selIcon = '🎯'; selColor = RING_COLORS[0];
}
function renderIconGrid() {
  document.getElementById('iconGrid').innerHTML = ICONS.map(ic =>
    `<button class="icon-option ${ic === selIcon ? 'selected' : ''}" onclick="selIcon='${ic}';renderIconGrid()">${ic}</button>`
  ).join('');
}
function renderColorGrid() {
  document.getElementById('colorGrid').innerHTML = RING_COLORS.map(c =>
    `<button class="color-option ${c === selColor ? 'selected' : ''}" style="background:${c}" onclick="selColor='${c}';renderColorGrid()"></button>`
  ).join('');
}
function createGoal() {
  const name     = document.getElementById('goalName').value.trim();
  const target   = parseFloat(document.getElementById('goalTarget').value);
  const deadline = document.getElementById('goalDeadline').value || null;
  if (!name || !(target > 0)) return;
  goals.push({
    id: Date.now().toString(), name, target, balance: 0,
    icon: selIcon, color: selColor,
    createdAt: Date.now(),
    streak: 0, lastDeposit: null, deadline
  });
  saveData();
  closeAddModal();
  renderAll();
}

// ── SETTINGS ACTIONS ──
function exportData() {
  const data = { goals, transactions, archived, exportedAt: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `sibings-backup-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
function showClearDialog()  { document.getElementById('clearModal').classList.add('active'); }
function closeClearModal()  { document.getElementById('clearModal').classList.remove('active'); }
function clearAllData() {
  ['sibings_goals','sibings_transactions','sibings_archived'].forEach(k => localStorage.removeItem(k));
  goals = []; transactions = []; archived = [];
  renderAll(); closeClearModal();
}
function showAbout()        { document.getElementById('aboutModal').classList.add('active'); }
function closeAboutModal()  { document.getElementById('aboutModal').classList.remove('active'); }

// ── OVERLAY DISMISS ──
document.querySelectorAll('.modal-overlay').forEach(m => {
  m.addEventListener('click', e => { if (e.target === m) m.classList.remove('active'); });
});

// ── INIT ──
window.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    document.getElementById('loadingScreen').classList.add('hidden');
    renderAll();
  }, 1000);
});