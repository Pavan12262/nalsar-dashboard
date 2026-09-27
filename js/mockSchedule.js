/**
 * mockSchedule.js — Mock Schedule + Upcoming Mock System
 * Integrated inside the Performance tab of the CLAT Prep Dashboard.
 *
 * Features:
 * - Single source of truth for mock schedule in Storage (key: myprep_mock_schedule)
 * - Compact D-Day header on left
 * - Upcoming Mock card on right (dynamically selects earliest today/future mock)
 * - TWO DISTINCT BUTTON ACTIONS:
 *     1. "View Schedule" -> Read-only chronological schedule viewer (NO add/edit/delete buttons)
 *     2. "Manage Schedule" -> Fully editable schedule manager (Add mock, Edit name/inst/date/time/notes, Delete)
 * - Auto-recalculates upcoming mock and re-sorts chronologically on any change
 * - Supports past mocks, day-of-week badges (SUN, WED, FRI, TUE, etc.), and countdown logic
 */

const MockScheduleManager = (() => {
  const STORAGE_KEY = 'myprep_mock_schedule';
  const SCHEDULE_INITIALIZED_KEY = 'myprep_mock_schedule_initialized_v1';

  // =========================================================================
  // Initial Default Schedule (from LegalEdge PDF)
  // =========================================================================
  const INITIAL_SCHEDULE = [
    { date: '2026-09-27', name: 'Mock CLAT 29', institute: 'LegalEdge', time: '', notes: '' },
    { date: '2026-10-04', name: 'Mock CLAT 30', institute: 'LegalEdge', time: '', notes: '' },
    { date: '2026-10-07', name: 'Mock CLAT 31', institute: 'LegalEdge', time: '', notes: '' },
    { date: '2026-10-11', name: 'Mock CLAT 32', institute: 'LegalEdge', time: '', notes: '' },
    { date: '2026-10-14', name: 'Mock CLAT 33', institute: 'LegalEdge', time: '', notes: '' },
    { date: '2026-10-18', name: 'Mock CLAT 34', institute: 'LegalEdge', time: '', notes: '' },
    { date: '2026-10-25', name: 'Mock CLAT 35', institute: 'LegalEdge', time: '', notes: '' },
    { date: '2026-10-28', name: 'Mock CLAT 36', institute: 'LegalEdge', time: '', notes: '' },
    { date: '2026-11-01', name: 'Mock CLAT 37', institute: 'LegalEdge', time: '', notes: '' },
    { date: '2026-11-06', name: 'Mock CLAT 38', institute: 'LegalEdge', time: '', notes: '' },
    { date: '2026-11-11', name: 'Mock CLAT 39', institute: 'LegalEdge', time: '', notes: '' },
    { date: '2026-11-15', name: 'Mock CLAT 40', institute: 'LegalEdge', time: '', notes: '' },
    { date: '2026-11-18', name: 'Mock CLAT 41', institute: 'LegalEdge', time: '', notes: '' },
    { date: '2026-11-22', name: 'Mock CLAT 42', institute: 'LegalEdge', time: '', notes: '' },
    { date: '2026-11-25', name: 'Mock CLAT 43', institute: 'LegalEdge', time: '', notes: '' },
    { date: '2026-11-29', name: 'Mock CLAT 44', institute: 'LegalEdge', time: '', notes: '' },
    { date: '2026-12-01', name: 'Mock CLAT 45', institute: 'LegalEdge', time: '', notes: '' },
    { date: '2026-12-02', name: 'Mock CLAT 46', institute: 'LegalEdge', time: '', notes: '' },
  ];

  // =========================================================================
  // Storage helpers (Single Source of Truth)
  // =========================================================================
  function generateId() {
    return 'sched-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
  }

  function getSchedule() {
    if (window.Storage && typeof Storage.getMockSchedule === 'function') {
      return Storage.getMockSchedule();
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  }

  function saveSchedule(list) {
    if (window.Storage && typeof Storage.setMockSchedule === 'function') {
      Storage.setMockSchedule(list);
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }

  function initScheduleStorage() {
    if (!localStorage.getItem(SCHEDULE_INITIALIZED_KEY)) {
      const existing = getSchedule();
      if (existing.length === 0) {
        const seeded = INITIAL_SCHEDULE.map(m => ({ id: generateId(), ...m }));
        saveSchedule(seeded);
      }
      localStorage.setItem(SCHEDULE_INITIALIZED_KEY, 'true');
    }
  }

  function addScheduledMock(data) {
    const list = getSchedule();
    list.push({ id: generateId(), ...data });
    list.sort((a, b) => a.date.localeCompare(b.date));
    saveSchedule(list);
  }

  function updateScheduledMock(id, data) {
    let list = getSchedule();
    list = list.map(m => m.id === id ? { ...m, ...data } : m);
    list.sort((a, b) => a.date.localeCompare(b.date));
    saveSchedule(list);
  }

  function deleteScheduledMock(id) {
    let list = getSchedule().filter(m => m.id !== id);
    saveSchedule(list);
  }

  // =========================================================================
  // Date utilities
  // =========================================================================
  function getTodayStr() {
    const d = new Date();
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const dy = String(d.getDate()).padStart(2, '0');
    return `${y}-${mo}-${dy}`;
  }

  function getDayDiff(dateStr) {
    const parts = dateStr.split('-');
    const target = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    const today = new Date();
    const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return Math.round((target - t) / 86400000);
  }

  function getUpcomingMock() {
    const list = getSchedule();
    const todayStr = getTodayStr();
    const future = list.filter(m => m.date >= todayStr);
    if (future.length === 0) return null;
    return future[0];
  }

  const DAY_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const MONTH_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  function parseDateStr(dateStr) {
    const parts = dateStr.split('-');
    return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  }

  function formatDateCompact(dateStr) {
    const d = parseDateStr(dateStr);
    const day = DAY_NAMES[d.getDay()];
    const month = MONTH_NAMES[d.getMonth()];
    return { day, date: d.getDate(), month, year: d.getFullYear(), dayNum: d.getDay() };
  }

  function formatCountdown(diff) {
    if (diff === 0) return { text: 'MOCK TODAY', cls: 'sched-today' };
    if (diff === 1) return { text: 'D-1 · Tomorrow', cls: 'sched-tomorrow' };
    if (diff > 0) return { text: `D-${diff}`, cls: 'sched-future' };
    return { text: 'Past', cls: 'sched-past' };
  }

  // =========================================================================
  // State
  // =========================================================================
  let editingId = null;
  let viewModalOpen = false;
  let manageModalOpen = false;
  let editModalOpen = false;

  // =========================================================================
  // Render: Upcoming Mock Card on Performance Tab
  // =========================================================================
  function renderUpcomingMock() {
    const card = document.getElementById('upcomingMockCard');
    if (!card) return;

    const mock = getUpcomingMock();

    if (!mock) {
      card.innerHTML = `
        <div class="upcoming-mock-empty">
          <div class="upcoming-mock-icon">📅</div>
          <div class="upcoming-mock-none-title">No Upcoming Mocks</div>
          <div class="upcoming-mock-none-sub">Add your next scheduled mock to track countdown</div>
          <div class="upcoming-mock-actions" style="margin-top: 4px;">
            <button type="button" class="btn btn-secondary btn-sm" id="viewScheduleBtn">View Schedule</button>
            <button type="button" class="btn btn-primary btn-sm" id="manageScheduleBtn">Manage Schedule</button>
          </div>
        </div>`;
      const viewBtn = card.querySelector('#viewScheduleBtn');
      const manageBtn = card.querySelector('#manageScheduleBtn');
      if (viewBtn) viewBtn.addEventListener('click', () => openViewScheduleModal());
      if (manageBtn) manageBtn.addEventListener('click', () => openManageScheduleModal());
      return;
    }

    const diff = getDayDiff(mock.date);
    const countdown = formatCountdown(diff);
    const fmt = formatDateCompact(mock.date);

    const dayBadgeClass = fmt.dayNum === 0 ? 'day-badge-sun' : (fmt.dayNum === 3 ? 'day-badge-wed' : 'day-badge-other');
    const isToday = diff === 0;

    card.innerHTML = `
      <div class="upcoming-mock-content ${isToday ? 'upcoming-mock-today-glow' : ''}">
        <div class="upcoming-mock-header-row">
          <span class="upcoming-mock-label font-mono">UPCOMING MOCK</span>
          <span class="upcoming-mock-countdown ${countdown.cls} font-mono">${countdown.text}</span>
        </div>
        <div class="upcoming-mock-name">${escapeHtml(mock.name)}</div>
        <div class="upcoming-mock-meta-row">
          <span class="sched-day-badge ${dayBadgeClass}">${fmt.day}</span>
          <span class="upcoming-mock-date">${fmt.day}, ${fmt.date} ${fmt.month}</span>
          ${mock.institute ? `<span class="upcoming-mock-institute">· ${escapeHtml(mock.institute)}</span>` : ''}
          ${mock.time ? `<span class="upcoming-mock-time">· ${escapeHtml(mock.time)}</span>` : ''}
        </div>
        <div class="upcoming-mock-actions">
          <button type="button" class="btn btn-secondary btn-sm" id="viewScheduleBtn" title="View complete mock schedule">View Schedule</button>
          <button type="button" class="btn btn-primary btn-sm" id="manageScheduleBtn" title="Add, edit, or remove mocks">Manage Schedule</button>
        </div>
      </div>`;

    const viewBtn = card.querySelector('#viewScheduleBtn');
    const manageBtn = card.querySelector('#manageScheduleBtn');
    if (viewBtn) viewBtn.addEventListener('click', () => openViewScheduleModal());
    if (manageBtn) manageBtn.addEventListener('click', () => openManageScheduleModal());
  }

  // =========================================================================
  // Render: Compact D-Day Card on Performance Tab Header
  // =========================================================================
  function renderCompactDDay() {
    const compactNumEl = document.getElementById('compactDDayNumber');
    const compactDateEl = document.getElementById('compactDDayDate');
    const compactEditBtn = document.getElementById('compactDDayEditBtn');

    if (!compactNumEl) return;

    const targetDateStr = window.Storage ? Storage.getClatExamDate() : null;

    if (!targetDateStr) {
      compactNumEl.textContent = '---';
      if (compactDateEl) compactDateEl.textContent = 'No date set';
      if (compactEditBtn) compactEditBtn.textContent = 'Set Date';
      return;
    }

    const parts = targetDateStr.split('-');
    const target = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    const today = new Date();
    const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const diff = Math.round((target - t) / 86400000);

    const options = { day: 'numeric', month: 'short', year: 'numeric' };
    const formatted = target.toLocaleDateString(undefined, options);

    if (compactDateEl) compactDateEl.textContent = `Exam: ${formatted}`;
    if (compactEditBtn) compactEditBtn.textContent = 'Edit Date';

    if (diff > 0) {
      compactNumEl.textContent = diff;
    } else if (diff === 0) {
      compactNumEl.textContent = 'DAY';
    } else {
      compactNumEl.textContent = `+${Math.abs(diff)}`;
    }
  }

  // =========================================================================
  // 1. VIEW SCHEDULE MODAL (Read-Only Viewer)
  // =========================================================================
  function openViewScheduleModal() {
    const modal = document.getElementById('mockViewScheduleModal');
    if (!modal) return;
    viewModalOpen = true;
    renderViewScheduleModal();
    modal.classList.add('active');
  }

  function closeViewScheduleModal() {
    const modal = document.getElementById('mockViewScheduleModal');
    if (!modal) return;
    modal.classList.remove('active');
    viewModalOpen = false;
  }

  function renderViewScheduleModal() {
    const container = document.getElementById('viewScheduleListContainer');
    if (!container) return;

    const list = getSchedule();
    const todayStr = getTodayStr();

    if (list.length === 0) {
      container.innerHTML = `<div class="sched-empty-state">
        <p class="text-muted" style="font-size:14px; text-align:center; padding:28px 0;">No mocks scheduled. Use "Manage Schedule" to add tests.</p>
      </div>`;
      return;
    }

    const upcoming = list.filter(m => m.date >= todayStr);
    const past = list.filter(m => m.date < todayStr);

    let html = '';

    if (upcoming.length > 0) {
      html += `<div class="sched-section-label font-mono">UPCOMING MOCKS (${upcoming.length})</div>`;
      html += upcoming.map(m => renderViewScheduleItem(m, false)).join('');
    }

    if (past.length > 0) {
      html += `<div class="sched-section-label font-mono sched-past-label">PAST MOCKS (${past.length})</div>`;
      html += past.slice().reverse().map(m => renderViewScheduleItem(m, true)).join('');
    }

    container.innerHTML = html;
  }

  function renderViewScheduleItem(mock, isPast) {
    const diff = getDayDiff(mock.date);
    const countdown = formatCountdown(diff);
    const fmt = formatDateCompact(mock.date);
    const dayBadgeClass = fmt.dayNum === 0 ? 'day-badge-sun' : (fmt.dayNum === 3 ? 'day-badge-wed' : 'day-badge-other');

    let statusLabel = 'UPCOMING';
    let statusClass = 'status-badge-upcoming';
    if (isPast) {
      statusLabel = 'COMPLETED';
      statusClass = 'status-badge-past';
    } else if (diff === 0) {
      statusLabel = 'TODAY';
      statusClass = 'status-badge-today';
    }

    return `
      <div class="sched-item ${isPast ? 'sched-item-past' : ''} ${diff === 0 ? 'sched-item-today' : ''}">
        <div class="sched-item-date-col">
          <span class="sched-day-badge ${dayBadgeClass}">${fmt.day}</span>
          <div class="sched-date-nums font-mono">
            <span class="sched-date-num">${fmt.date}</span>
            <span class="sched-date-month">${fmt.month.toUpperCase()}</span>
          </div>
        </div>
        <div class="sched-item-info-col">
          <div class="sched-item-name">${escapeHtml(mock.name)}</div>
          <div class="sched-item-meta">
            ${mock.institute ? `<span class="sched-item-institute">${escapeHtml(mock.institute)}</span>` : ''}
            ${mock.time ? `<span class="sched-item-time">· ${escapeHtml(mock.time)}</span>` : ''}
            ${mock.notes ? `<span class="sched-item-notes">· ${escapeHtml(mock.notes)}</span>` : ''}
          </div>
        </div>
        <div class="sched-item-status-col">
          <span class="sched-status-badge ${statusClass} font-mono">${statusLabel}</span>
          ${!isPast ? `<span class="sched-countdown ${countdown.cls} font-mono">${countdown.text}</span>` : ''}
        </div>
      </div>`;
  }

  // =========================================================================
  // 2. MANAGE SCHEDULE MODAL (Editable Manager)
  // =========================================================================
  function openManageScheduleModal() {
    const modal = document.getElementById('mockManageScheduleModal');
    if (!modal) return;
    manageModalOpen = true;
    renderManageScheduleModal();
    modal.classList.add('active');
  }

  function closeManageScheduleModal() {
    const modal = document.getElementById('mockManageScheduleModal');
    if (!modal) return;
    modal.classList.remove('active');
    manageModalOpen = false;
  }

  function renderManageScheduleModal() {
    const container = document.getElementById('manageScheduleListContainer');
    if (!container) return;

    const list = getSchedule();
    const todayStr = getTodayStr();

    if (list.length === 0) {
      container.innerHTML = `<div class="sched-empty-state">
        <p class="text-muted" style="font-size:14px; text-align:center; padding:28px 0;">No mocks scheduled. Click "+ Add Mock" above to create your first scheduled test.</p>
      </div>`;
      return;
    }

    const upcoming = list.filter(m => m.date >= todayStr);
    const past = list.filter(m => m.date < todayStr);

    let html = '';

    if (upcoming.length > 0) {
      html += `<div class="sched-section-label font-mono">UPCOMING MOCKS (${upcoming.length})</div>`;
      html += upcoming.map(m => renderManageScheduleItem(m, false)).join('');
    }

    if (past.length > 0) {
      html += `<div class="sched-section-label font-mono sched-past-label">PAST MOCKS (${past.length})</div>`;
      html += past.slice().reverse().map(m => renderManageScheduleItem(m, true)).join('');
    }

    container.innerHTML = html;

    // Attach edit buttons
    container.querySelectorAll('[data-edit-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-edit-id');
        const mock = getSchedule().find(m => m.id === id);
        if (mock) openEditModal(mock);
      });
    });

    // Attach delete buttons
    container.querySelectorAll('[data-delete-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-delete-id');
        const mock = getSchedule().find(m => m.id === id);
        if (!mock) return;
        if (confirm(`Delete "${mock.name}"? This cannot be undone.`)) {
          deleteScheduledMock(id);
          renderManageScheduleModal();
          if (viewModalOpen) renderViewScheduleModal();
          renderUpcomingMock();
          renderCompactDDay();
        }
      });
    });
  }

  function renderManageScheduleItem(mock, isPast) {
    const diff = getDayDiff(mock.date);
    const countdown = formatCountdown(diff);
    const fmt = formatDateCompact(mock.date);
    const dayBadgeClass = fmt.dayNum === 0 ? 'day-badge-sun' : (fmt.dayNum === 3 ? 'day-badge-wed' : 'day-badge-other');

    return `
      <div class="sched-item ${isPast ? 'sched-item-past' : ''} ${diff === 0 ? 'sched-item-today' : ''}">
        <div class="sched-item-date-col">
          <span class="sched-day-badge ${dayBadgeClass}">${fmt.day}</span>
          <div class="sched-date-nums font-mono">
            <span class="sched-date-num">${fmt.date}</span>
            <span class="sched-date-month">${fmt.month.toUpperCase()}</span>
          </div>
          ${!isPast ? `<span class="sched-countdown ${countdown.cls} font-mono">${countdown.text}</span>` : ''}
        </div>
        <div class="sched-item-info-col">
          <div class="sched-item-name">${escapeHtml(mock.name)}</div>
          <div class="sched-item-meta">
            ${mock.institute ? `<span class="sched-item-institute">${escapeHtml(mock.institute)}</span>` : ''}
            ${mock.time ? `<span class="sched-item-time">· ${escapeHtml(mock.time)}</span>` : ''}
            ${mock.notes ? `<span class="sched-item-notes">· ${escapeHtml(mock.notes)}</span>` : ''}
          </div>
        </div>
        <div class="sched-item-actions">
          <button type="button" class="btn-action sched-edit-btn" data-edit-id="${mock.id}" title="Edit Mock">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button type="button" class="btn-action sched-delete-btn" data-delete-id="${mock.id}" title="Delete Mock">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
          </button>
        </div>
      </div>`;
  }

  // =========================================================================
  // 3. EDIT / ADD MOCK MODAL (Form)
  // =========================================================================
  function openEditModal(mock) {
    const modal = document.getElementById('mockEditModal');
    if (!modal) return;

    editingId = mock ? mock.id : null;

    const titleEl = document.getElementById('mockEditModalTitle');
    const nameInput = document.getElementById('schedMockName');
    const instInput = document.getElementById('schedMockInstitute');
    const dateInput = document.getElementById('schedMockDate');
    const timeInput = document.getElementById('schedMockTime');
    const notesInput = document.getElementById('schedMockNotes');

    if (titleEl) titleEl.textContent = mock ? 'Edit Scheduled Mock' : 'Add Scheduled Mock';
    if (nameInput) nameInput.value = mock ? mock.name : '';
    if (instInput) instInput.value = mock ? (mock.institute || '') : '';
    if (dateInput) dateInput.value = mock ? mock.date : '';
    if (timeInput) timeInput.value = mock ? (mock.time || '') : '';
    if (notesInput) notesInput.value = mock ? (mock.notes || '') : '';

    modal.classList.add('active');
    editModalOpen = true;
    if (nameInput) setTimeout(() => nameInput.focus(), 80);
  }

  function closeEditModal() {
    const modal = document.getElementById('mockEditModal');
    if (!modal) return;
    modal.classList.remove('active');
    editModalOpen = false;
    editingId = null;
  }

  function saveEditModal() {
    const nameInput = document.getElementById('schedMockName');
    const instInput = document.getElementById('schedMockInstitute');
    const dateInput = document.getElementById('schedMockDate');
    const timeInput = document.getElementById('schedMockTime');
    const notesInput = document.getElementById('schedMockNotes');
    const statusEl = document.getElementById('mockEditStatus');

    const name = nameInput ? nameInput.value.trim() : '';
    const date = dateInput ? dateInput.value.trim() : '';

    if (!name) {
      if (statusEl) { statusEl.textContent = 'Mock name is required.'; statusEl.style.color = '#f87171'; }
      if (nameInput) nameInput.focus();
      return;
    }
    if (!date) {
      if (statusEl) { statusEl.textContent = 'Date is required.'; statusEl.style.color = '#f87171'; }
      if (dateInput) dateInput.focus();
      return;
    }

    const data = {
      name,
      date,
      institute: instInput ? instInput.value.trim() : '',
      time: timeInput ? timeInput.value.trim() : '',
      notes: notesInput ? notesInput.value.trim() : '',
    };

    if (editingId) {
      updateScheduledMock(editingId, data);
    } else {
      addScheduledMock(data);
    }

    closeEditModal();
    if (manageModalOpen) renderManageScheduleModal();
    if (viewModalOpen) renderViewScheduleModal();
    renderUpcomingMock();
    renderCompactDDay();

    if (statusEl) { statusEl.textContent = ''; }
  }

  // =========================================================================
  // Escape HTML helper
  // =========================================================================
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // =========================================================================
  // DOM Setup & Event Listeners
  // =========================================================================
  function setupDOM() {
    // 1. View Schedule Modal Controls
    const closeViewBtn = document.getElementById('closeViewScheduleModalBtn');
    if (closeViewBtn) closeViewBtn.addEventListener('click', closeViewScheduleModal);

    const doneViewBtn = document.getElementById('doneViewScheduleModalBtn');
    if (doneViewBtn) doneViewBtn.addEventListener('click', closeViewScheduleModal);

    // 2. Manage Schedule Modal Controls
    const closeManageBtn = document.getElementById('closeManageScheduleModalBtn');
    if (closeManageBtn) closeManageBtn.addEventListener('click', closeManageScheduleModal);

    const doneManageBtn = document.getElementById('doneManageScheduleModalBtn');
    if (doneManageBtn) doneManageBtn.addEventListener('click', closeManageScheduleModal);

    const addInsideBtn = document.getElementById('addScheduleMockBtn');
    if (addInsideBtn) addInsideBtn.addEventListener('click', () => {
      openEditModal(null);
    });

    // 3. Edit Form Modal Controls
    const closeEditBtn = document.getElementById('closeEditModalBtn');
    if (closeEditBtn) closeEditBtn.addEventListener('click', closeEditModal);

    const cancelEditBtn = document.getElementById('cancelEditModalBtn');
    if (cancelEditBtn) cancelEditBtn.addEventListener('click', closeEditModal);

    const saveEditBtn = document.getElementById('saveEditModalBtn');
    if (saveEditBtn) saveEditBtn.addEventListener('click', saveEditModal);

    // 4. Compact D-Day edit button & card click
    const compactEditBtn = document.getElementById('compactDDayEditBtn');
    if (compactEditBtn) {
      compactEditBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const existingBtn = document.getElementById('clatEditDateBtn');
        if (existingBtn) existingBtn.click();
      });
    }

    const compactCard = document.getElementById('compactDDayCard');
    if (compactCard) {
      compactCard.addEventListener('click', (e) => {
        if (e.target.closest('button')) return;
        const existingBtn = document.getElementById('clatEditDateBtn');
        if (existingBtn) existingBtn.click();
      });
    }

    // 5. Close modals on backdrop click
    const viewModal = document.getElementById('mockViewScheduleModal');
    if (viewModal) viewModal.addEventListener('click', (e) => {
      if (e.target === viewModal) closeViewScheduleModal();
    });

    const manageModal = document.getElementById('mockManageScheduleModal');
    if (manageModal) manageModal.addEventListener('click', (e) => {
      if (e.target === manageModal) closeManageScheduleModal();
    });

    const editModal = document.getElementById('mockEditModal');
    if (editModal) editModal.addEventListener('click', (e) => {
      if (e.target === editModal) closeEditModal();
    });

    // 6. Keyboard shortcut: Enter to save in edit modal
    const editForm = document.getElementById('mockEditForm');
    if (editForm) {
      editForm.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          saveEditModal();
        }
      });
    }
  }

  // =========================================================================
  // Hook into App's D-Day render to sync our compact card
  // =========================================================================
  function patchAppDDayRender() {
    if (!window.App) return;
    const origRender = App.renderClatCountdown;
    App.renderClatCountdown = function(...args) {
      if (origRender) origRender.apply(this, args);
      renderCompactDDay();
    };
  }

  // =========================================================================
  // Midnight refresh
  // =========================================================================
  function scheduleMidnightRefresh() {
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5);
    const msUntil = tomorrow - now;
    setTimeout(() => {
      renderUpcomingMock();
      renderCompactDDay();
      scheduleMidnightRefresh();
    }, msUntil);
  }

  // =========================================================================
  // Public API
  // =========================================================================
  function init() {
    initScheduleStorage();
    setupDOM();
    renderUpcomingMock();
    renderCompactDDay();
    scheduleMidnightRefresh();

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        renderUpcomingMock();
        renderCompactDDay();
      }
    });

    setTimeout(patchAppDDayRender, 100);
  }

  function render() {
    renderUpcomingMock();
    renderCompactDDay();
    if (viewModalOpen) renderViewScheduleModal();
    if (manageModalOpen) renderManageScheduleModal();
  }

  return {
    init,
    render,
    openViewScheduleModal,
    closeViewScheduleModal,
    openManageScheduleModal,
    closeManageScheduleModal,
    openEditModal,
    closeEditModal,
    getSchedule,
    getUpcomingMock,
  };
})();

window.MockScheduleManager = MockScheduleManager;
