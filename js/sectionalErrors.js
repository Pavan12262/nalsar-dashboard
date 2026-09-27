/**
 * sectionalErrors.js - Sectional Error Log Module
 * Tracks question mistakes from sectional tests with structured taxonomies:
 * Section, Topic, Question Type, Mistake Type, Reason, Correct Approach, and Status (Unrevised/Revised/Mastered).
 */

const SectionalErrorLog = (() => {
  let activeSectionFilter = 'All';
  let activeStatusFilter = 'All';
  let searchQuery = '';
  let editingErrorId = null;

  function init() {
    setupEventListeners();
    render();
  }

  function setupEventListeners() {
    // Section filter pills
    const secFilterContainer = document.getElementById('secErrorSectionFilters');
    if (secFilterContainer) {
      secFilterContainer.addEventListener('click', (e) => {
        const pill = e.target.closest('.sec-error-filter-pill');
        if (!pill) return;
        secFilterContainer.querySelectorAll('.sec-error-filter-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        activeSectionFilter = pill.getAttribute('data-section') || 'All';
        render();
      });
    }

    // Status filter pills
    const statusFilterContainer = document.getElementById('secErrorStatusFilters');
    if (statusFilterContainer) {
      statusFilterContainer.addEventListener('click', (e) => {
        const pill = e.target.closest('.sec-status-filter-pill');
        if (!pill) return;
        statusFilterContainer.querySelectorAll('.sec-status-filter-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        activeStatusFilter = pill.getAttribute('data-status') || 'All';
        render();
      });
    }

    // Search input
    const searchInput = document.getElementById('secErrorSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.trim().toLowerCase();
        render();
      });
    }

    // "Log Sectional Mistake" button
    const openAddBtn = document.getElementById('openAddSecErrorBtn');
    if (openAddBtn) {
      openAddBtn.addEventListener('click', () => {
        openModal();
      });
    }

    // Modal close buttons
    const closeBtn = document.getElementById('closeSecErrorModalBtn');
    const cancelBtn = document.getElementById('cancelSecErrorModalBtn');
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

    // Modal form submission
    const form = document.getElementById('secErrorForm');
    if (form) {
      form.addEventListener('submit', handleFormSubmit);
    }

    // Delegated actions on error cards: Edit, Delete, Toggle Status
    const listContainer = document.getElementById('secErrorListContainer');
    if (listContainer) {
      listContainer.addEventListener('click', (e) => {
        const editBtn = e.target.closest('.btn-sec-error-edit');
        if (editBtn) {
          const id = editBtn.getAttribute('data-id');
          handleEdit(id);
          return;
        }

        const deleteBtn = e.target.closest('.btn-sec-error-delete');
        if (deleteBtn) {
          const id = deleteBtn.getAttribute('data-id');
          handleDelete(id);
          return;
        }

        const statusToggle = e.target.closest('.sec-status-toggle-badge');
        if (statusToggle) {
          const id = statusToggle.getAttribute('data-id');
          handleStatusCycle(id);
          return;
        }
      });
    }
  }

  function openModal(error = null) {
    const modal = document.getElementById('secErrorModal');
    const title = document.getElementById('secErrorModalTitle');
    const form = document.getElementById('secErrorForm');
    if (!modal || !form) return;

    form.reset();
    editingErrorId = error ? error.id : null;

    const dateInput = document.getElementById('secErrorDateInput');
    const sectionSelect = document.getElementById('secErrorSectionSelect');
    const topicInput = document.getElementById('secErrorTopicInput');
    const qTypeInput = document.getElementById('secErrorQTypeInput');
    const mistakeTypeSelect = document.getElementById('secErrorMistakeTypeSelect');
    const mistakeInput = document.getElementById('secErrorMistakeInput');
    const reasonInput = document.getElementById('secErrorReasonInput');
    const correctInput = document.getElementById('secErrorCorrectInput');
    const statusSelect = document.getElementById('secErrorStatusSelect');

    if (error) {
      title.textContent = 'Edit Sectional Error Note';
      if (dateInput) dateInput.value = error.date || Storage.getLocalDateString();
      if (sectionSelect) sectionSelect.value = error.subject || 'Legal';
      if (topicInput) topicInput.value = error.topic || '';
      if (qTypeInput) qTypeInput.value = error.questionType || '';
      if (mistakeTypeSelect) mistakeTypeSelect.value = error.mistakeType || 'Conceptual Error';
      if (mistakeInput) mistakeInput.value = error.mistake || '';
      if (reasonInput) reasonInput.value = error.reason || '';
      if (correctInput) correctInput.value = error.correctApproach || '';
      if (statusSelect) statusSelect.value = error.status || 'Unrevised';
    } else {
      title.textContent = 'Log Sectional Error Note';
      const activeDateInput = document.getElementById('secSelectedDateInput');
      if (dateInput) dateInput.value = (activeDateInput && activeDateInput.value) ? activeDateInput.value : Storage.getLocalDateString();
      if (sectionSelect) sectionSelect.value = 'Legal';
      if (mistakeTypeSelect) mistakeTypeSelect.value = 'Conceptual Error';
      if (statusSelect) statusSelect.value = 'Unrevised';
    }

    modal.classList.add('active');
    if (topicInput) topicInput.focus();
  }

  function closeModal() {
    const modal = document.getElementById('secErrorModal');
    if (modal) modal.classList.remove('active');
    editingErrorId = null;
  }

  function handleFormSubmit(e) {
    e.preventDefault();

    const date = document.getElementById('secErrorDateInput')?.value || Storage.getLocalDateString();
    const subject = document.getElementById('secErrorSectionSelect')?.value || 'Legal';
    const topic = document.getElementById('secErrorTopicInput')?.value.trim() || '';
    const questionType = document.getElementById('secErrorQTypeInput')?.value.trim() || '';
    const mistakeType = document.getElementById('secErrorMistakeTypeSelect')?.value || 'Conceptual Error';
    const mistake = document.getElementById('secErrorMistakeInput')?.value.trim() || '';
    const reason = document.getElementById('secErrorReasonInput')?.value.trim() || '';
    const correctApproach = document.getElementById('secErrorCorrectInput')?.value.trim() || '';
    const status = document.getElementById('secErrorStatusSelect')?.value || 'Unrevised';

    if (!topic || !mistake || !reason || !correctApproach) {
      alert('Please fill in Topic, Mistake, Why I got it wrong, and Correct Approach.');
      return;
    }

    const payload = {
      source: 'sectional',
      date,
      subject,
      topic,
      questionType: questionType || undefined,
      mistakeType,
      mistake,
      reason,
      correctApproach,
      status
    };

    if (editingErrorId) {
      payload.id = editingErrorId;
    }

    Storage.saveError(payload);
    closeModal();
    render();

    // Trigger Sectional Weakness Tracker update reactively
    if (window.SectionalWeaknessTracker && typeof window.SectionalWeaknessTracker.render === 'function') {
      window.SectionalWeaknessTracker.render();
    }
  }

  function handleEdit(id) {
    const errors = Storage.getSectionalErrors();
    const target = errors.find(e => e.id === id);
    if (target) {
      openModal(target);
    }
  }

  function handleDelete(id) {
    if (confirm('Are you sure you want to delete this sectional error note?')) {
      Storage.deleteError(id);
      render();
      if (window.SectionalWeaknessTracker && typeof window.SectionalWeaknessTracker.render === 'function') {
        window.SectionalWeaknessTracker.render();
      }
    }
  }

  function handleStatusCycle(id) {
    const errors = Storage.getSectionalErrors();
    const target = errors.find(e => e.id === id);
    if (!target) return;

    const nextStatus = {
      'Unrevised': 'Revised',
      'Revised': 'Mastered',
      'Mastered': 'Unrevised'
    };

    target.status = nextStatus[target.status] || 'Unrevised';
    Storage.saveError(target);
    render();

    if (window.SectionalWeaknessTracker && typeof window.SectionalWeaknessTracker.render === 'function') {
      window.SectionalWeaknessTracker.render();
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function render() {
    const allErrors = Storage.getSectionalErrors();
    const listContainer = document.getElementById('secErrorListContainer');
    const summaryBanner = document.getElementById('secErrorSummaryBanner');
    const secFilterContainer = document.getElementById('secErrorSectionFilters');
    const statusFilterContainer = document.getElementById('secErrorStatusFilters');

    // Update section filter count badges
    if (secFilterContainer) {
      const sectionCounts = { All: allErrors.length };
      ['English', 'GK', 'Legal', 'Logical', 'Quant'].forEach(s => {
        sectionCounts[s] = allErrors.filter(e => e.subject && e.subject.toLowerCase() === s.toLowerCase()).length;
      });

      secFilterContainer.querySelectorAll('.sec-error-filter-pill').forEach(pill => {
        const secVal = pill.getAttribute('data-section');
        const badge = pill.querySelector('.pill-count');
        if (badge && sectionCounts[secVal] !== undefined) {
          badge.textContent = sectionCounts[secVal];
        }
      });
    }

    // Update status filter count badges
    if (statusFilterContainer) {
      const statusCounts = {
        All: allErrors.length,
        Unrevised: allErrors.filter(e => (e.status || 'Unrevised') === 'Unrevised').length,
        Revised: allErrors.filter(e => e.status === 'Revised').length,
        Mastered: allErrors.filter(e => e.status === 'Mastered').length
      };

      statusFilterContainer.querySelectorAll('.sec-status-filter-pill').forEach(pill => {
        const stVal = pill.getAttribute('data-status');
        const badge = pill.querySelector('.pill-count');
        if (badge && statusCounts[stVal] !== undefined) {
          badge.textContent = statusCounts[stVal];
        }
      });
    }

    // Apply Filters & Search
    let filtered = allErrors;

    if (activeSectionFilter !== 'All') {
      filtered = filtered.filter(e => e.subject && e.subject.toLowerCase() === activeSectionFilter.toLowerCase());
    }

    if (activeStatusFilter !== 'All') {
      filtered = filtered.filter(e => (e.status || 'Unrevised') === activeStatusFilter);
    }

    if (searchQuery) {
      filtered = filtered.filter(e => {
        const haystack = `${e.subject || ''} ${e.topic || ''} ${e.questionType || ''} ${e.mistakeType || ''} ${e.mistake || ''} ${e.reason || ''} ${e.correctApproach || ''} ${e.date || ''}`.toLowerCase();
        return haystack.includes(searchQuery);
      });
    }

    // Update summary telemetry banner
    if (summaryBanner) {
      const totalCount = allErrors.length;
      const unrevisedCount = allErrors.filter(e => (e.status || 'Unrevised') === 'Unrevised').length;
      const revisedCount = allErrors.filter(e => e.status === 'Revised').length;
      const masteredCount = allErrors.filter(e => e.status === 'Mastered').length;
      const masteryPct = totalCount > 0 ? Math.round((masteredCount / totalCount) * 100) : 0;

      summaryBanner.innerHTML = `
        <div class="sec-err-stat-chips font-mono">
          <div class="sec-stat-chip">
            <span class="chip-kicker">TOTAL LOGGED</span>
            <strong class="chip-num text-bright">${totalCount}</strong>
          </div>
          <div class="sec-stat-chip chip-unrevised">
            <span class="chip-kicker">UNREVISED</span>
            <strong class="chip-num text-amber">${unrevisedCount}</strong>
          </div>
          <div class="sec-stat-chip chip-revised">
            <span class="chip-kicker">REVISED</span>
            <strong class="chip-num text-cyan">${revisedCount}</strong>
          </div>
          <div class="sec-stat-chip chip-mastered">
            <span class="chip-kicker">MASTERED</span>
            <strong class="chip-num text-emerald">${masteredCount} (${masteryPct}%)</strong>
          </div>
        </div>
      `;
    }

    if (!listContainer) return;

    if (filtered.length === 0) {
      listContainer.innerHTML = `
        <div class="empty-sec-errors-card">
          <div class="empty-icon">📝</div>
          <p class="empty-title">No sectional mistakes found</p>
          <p class="empty-subtitle">${searchQuery ? `No errors match "${escapeHtml(searchQuery)}". Try another search keyword or reset filters.` : 'Click "Log Sectional Mistake" above to record a question error for analysis.'}</p>
        </div>
      `;
      return;
    }

    const sectionColors = {
      english: '#38bdf8',
      gk: '#fbbf24',
      legal: '#a855f7',
      logical: '#ec4899',
      quant: '#10b981'
    };

    let html = '<div class="sec-error-cards-grid">';
    filtered.forEach(item => {
      const secKey = (item.subject || 'legal').toLowerCase();
      const brandColor = sectionColors[secKey] || '#a855f7';
      const status = item.status || 'Unrevised';
      const statusClass = status.toLowerCase();

      html += `
        <div class="sec-error-card" data-id="${item.id}">
          <div class="sec-err-card-header">
            <div class="sec-err-badges-group">
              <span class="sec-err-subject-tag font-mono" style="color: ${brandColor}; background: ${brandColor}18; border-color: ${brandColor}40;">
                <span class="sec-dot" style="background: ${brandColor};"></span>
                ${escapeHtml(item.subject)}
              </span>
              <span class="sec-err-date-tag font-mono">📅 ${escapeHtml(item.date || '—')}</span>
              ${item.questionType ? `<span class="sec-err-qtype-tag font-mono">${escapeHtml(item.questionType)}</span>` : ''}
              ${item.mistakeType ? `<span class="sec-err-mistaketype-tag font-mono">${escapeHtml(item.mistakeType)}</span>` : ''}
            </div>

            <div class="sec-err-header-actions">
              <button type="button" class="sec-status-toggle-badge status-${statusClass} font-mono" data-id="${item.id}" title="Click to cycle status: Unrevised → Revised → Mastered">
                <span class="status-indicator"></span>
                ${escapeHtml(status)}
              </button>
              <div class="sec-err-icon-buttons">
                <button type="button" class="btn-action-icon btn-sec-error-edit" data-id="${item.id}" title="Edit this error note">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                </button>
                <button type="button" class="btn-action-icon btn-sec-error-delete" data-id="${item.id}" title="Delete this error note">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
              </div>
            </div>
          </div>

          <div class="sec-err-topic-row">
            <h4 class="sec-err-topic-title">${escapeHtml(item.topic)}</h4>
          </div>

          <div class="sec-err-body">
            <div class="sec-err-block sec-err-mistake-block">
              <span class="sec-err-block-kicker">MISTAKE STATEMENT</span>
              <p class="sec-err-block-text">${escapeHtml(item.mistake)}</p>
            </div>

            <div class="sec-err-blocks-row">
              <div class="sec-err-block sec-err-reason-block">
                <span class="sec-err-block-kicker">WHY I GOT IT WRONG</span>
                <p class="sec-err-block-text">${escapeHtml(item.reason)}</p>
              </div>

              <div class="sec-err-block sec-err-correct-block">
                <span class="sec-err-block-kicker">CORRECT APPROACH &amp; TAKEAWAY</span>
                <p class="sec-err-block-text">${escapeHtml(item.correctApproach)}</p>
              </div>
            </div>
          </div>
        </div>
      `;
    });
    html += '</div>';

    listContainer.innerHTML = html;
  }

  function filterByTopic(topicName, sectionName) {
    const searchInput = document.getElementById('secErrorSearchInput');
    const secFilterContainer = document.getElementById('secErrorSectionFilters');
    const errorSection = document.getElementById('section-sectional-errors');

    if (sectionName && secFilterContainer) {
      const pill = secFilterContainer.querySelector(`.sec-error-filter-pill[data-section="${sectionName}"]`);
      if (pill) pill.click();
    }

    if (searchInput) {
      searchInput.value = topicName;
      searchQuery = topicName.toLowerCase();
      render();
    }

    if (errorSection) {
      errorSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  return {
    init,
    render,
    openModal,
    filterByTopic
  };
})();

window.SectionalErrorLog = SectionalErrorLog;
