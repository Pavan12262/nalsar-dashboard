/**
 * errors.js - Error Notebook & Weakness Analysis Module
 * Provides structured mistake tracking, subject filtering, keyword search, and recurring pattern detection.
 */

const ErrorNotebook = (() => {
  let activeFilter = 'All';
  let searchQuery = '';
  let editingErrorId = null;

  function init() {
    setupEventListeners();
    render();
  }

  function setupEventListeners() {
    // Subject filter pills
    const filterContainer = document.getElementById('errorFilterTabs');
    if (filterContainer) {
      filterContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.filter-pill');
        if (!btn) return;
        filterContainer.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeFilter = btn.getAttribute('data-filter') || 'All';
        render();
      });
    }

    // Search input
    const searchInput = document.getElementById('errorSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.trim().toLowerCase();
        render();
      });
    }

    // "Add Error" trigger
    const openAddErrorBtn = document.getElementById('openAddErrorBtn');
    if (openAddErrorBtn) {
      openAddErrorBtn.addEventListener('click', () => {
        openErrorModal();
      });
    }

    // Modal close buttons
    const closeBtn = document.getElementById('closeErrorModalBtn');
    const cancelBtn = document.getElementById('cancelErrorModalBtn');
    if (closeBtn) closeBtn.addEventListener('click', closeErrorModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeErrorModal);

    // Form submission
    const form = document.getElementById('errorForm');
    if (form) {
      form.addEventListener('submit', handleErrorFormSubmit);
    }
  }

  function openErrorModal(error = null) {
    const modal = document.getElementById('errorModal');
    const title = document.getElementById('errorModalTitle');
    const form = document.getElementById('errorForm');
    if (!modal || !form) return;

    form.reset();
    editingErrorId = error ? error.id : null;

    if (error) {
      title.textContent = 'Edit Error Note';
      document.getElementById('errorSubjectSelect').value = error.subject || 'Legal';
      document.getElementById('errorTopicInput').value = error.topic || '';
      document.getElementById('errorMistakeInput').value = error.mistake || '';
      document.getElementById('errorReasonInput').value = error.reason || '';
      document.getElementById('errorCorrectApproachInput').value = error.correctApproach || '';
      document.getElementById('errorMockRefInput').value = error.mockRef || '';
    } else {
      title.textContent = 'Log Mistake in Error Notebook';
      document.getElementById('errorSubjectSelect').value = 'Legal';
    }

    modal.classList.add('active');
    document.getElementById('errorTopicInput').focus();
  }

  function closeErrorModal() {
    const modal = document.getElementById('errorModal');
    if (modal) modal.classList.remove('active');
    editingErrorId = null;
  }

  function handleErrorFormSubmit(e) {
    e.preventDefault();

    const subject = document.getElementById('errorSubjectSelect').value;
    const topic = document.getElementById('errorTopicInput').value.trim();
    const mistake = document.getElementById('errorMistakeInput').value.trim();
    const reason = document.getElementById('errorReasonInput').value.trim();
    const correctApproach = document.getElementById('errorCorrectApproachInput').value.trim();
    const mockRef = document.getElementById('errorMockRefInput').value.trim();

    if (!topic || !mistake || !reason || !correctApproach) {
      alert('Please fill in Topic, Mistake, Reason, and Correct Approach.');
      return;
    }

    const payload = {
      subject,
      topic,
      mistake,
      reason,
      correctApproach,
      mockRef: mockRef || undefined
    };

    if (editingErrorId) {
      payload.id = editingErrorId;
    }

    Storage.saveError(payload);
    closeErrorModal();
    render();
  }

  function handleEditError(id) {
    const errors = Storage.getErrors();
    const error = errors.find(e => e.id === id);
    if (error) {
      openErrorModal(error);
    }
  }

  function handleDeleteError(id) {
    if (confirm('Are you sure you want to delete this error note?')) {
      Storage.deleteError(id);
      render();
    }
  }

  function render() {
    const allErrors = Storage.getErrors();
    const listContainer = document.getElementById('errorListContainer');
    const patternSummary = document.getElementById('errorPatternSummary');
    const filterContainer = document.getElementById('errorFilterTabs');

    // Update filter counts
    if (filterContainer) {
      const counts = { All: allErrors.length };
      ['English', 'GK', 'Legal', 'Logical', 'Quant', 'Other'].forEach(s => {
        counts[s] = allErrors.filter(e => e.subject === s).length;
      });

      filterContainer.querySelectorAll('.filter-pill').forEach(pill => {
        const filterVal = pill.getAttribute('data-filter');
        const badge = pill.querySelector('.pill-count');
        if (badge && counts[filterVal] !== undefined) {
          badge.textContent = counts[filterVal];
        }
      });
    }

    // Apply Filter & Search
    let filtered = allErrors;
    if (activeFilter !== 'All') {
      filtered = filtered.filter(e => e.subject === activeFilter);
    }
    if (searchQuery) {
      filtered = filtered.filter(e => {
        const fullText = `${e.subject} ${e.topic} ${e.mistake} ${e.reason} ${e.correctApproach} ${e.mockRef || ''}`.toLowerCase();
        return fullText.includes(searchQuery);
      });
    }

    // Update Pattern Summary Banner
    if (patternSummary) {
      if (allErrors.length === 0) {
        patternSummary.innerHTML = `<span>No error entries yet. Log mistakes here to identify recurring weaknesses.</span>`;
      } else {
        // Find subject with highest mistakes
        const subjectFreq = {};
        allErrors.forEach(e => {
          subjectFreq[e.subject] = (subjectFreq[e.subject] || 0) + 1;
        });
        const topSubjectEntry = Object.entries(subjectFreq).sort((a, b) => b[1] - a[1])[0];
        const topSubject = topSubjectEntry ? topSubjectEntry[0] : '';
        const topCount = topSubjectEntry ? topSubjectEntry[1] : 0;
        const topPct = Math.round((topCount / allErrors.length) * 100);

        let patternAlert = '';
        if (topCount >= 2 && topPct >= 35) {
          patternAlert = `<span class="pattern-badge-alert">⚠️ Pattern Alert: ${topPct}% of all mistakes are in <strong>${topSubject}</strong> (${topCount} errors)</span>`;
        }

        patternSummary.innerHTML = `
          <div class="pattern-info-row">
            <span>Showing <strong>${filtered.length}</strong> of <strong>${allErrors.length}</strong> recorded mistakes</span>
            ${patternAlert}
          </div>
        `;
      }
    }

    if (!listContainer) return;

    if (filtered.length === 0) {
      listContainer.innerHTML = `
        <div class="empty-errors-state">
          <div class="empty-icon">📝</div>
          <p class="empty-title">No mistakes found</p>
          <p class="empty-subtitle">${searchQuery ? `No errors matching "${searchQuery}". Try a different keyword.` : 'Click "Add Error" above to log a question or concept to review.'}</p>
        </div>
      `;
      return;
    }

    let html = '<div class="error-cards-grid">';
    filtered.forEach(item => {
      const subjectClass = `subject-${item.subject.toLowerCase()}`;
      const mockRefBadge = item.mockRef ? `<span class="error-mock-tag font-mono">${escapeHtml(item.mockRef)}</span>` : '';

      html += `
        <div class="error-card">
          <div class="error-card-header">
            <div class="error-tags">
              <span class="subject-badge ${subjectClass}">${item.subject}</span>
              ${mockRefBadge}
            </div>
            <div class="error-card-actions">
              <button type="button" class="btn-icon-action btn-edit-err" data-id="${item.id}" title="Edit error">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
              </button>
              <button type="button" class="btn-icon-action btn-del-err" data-id="${item.id}" title="Delete error">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
              </button>
            </div>
          </div>

          <h3 class="error-card-topic">${escapeHtml(item.topic)}</h3>

          <div class="error-card-sections">
            <div class="error-sec error-sec-mistake">
              <span class="error-sec-label">WHAT I GOT WRONG</span>
              <p class="error-sec-body">${escapeHtml(item.mistake)}</p>
            </div>

            <div class="error-sec error-sec-reason">
              <span class="error-sec-label">WHY I GOT IT WRONG (ROOT CAUSE)</span>
              <p class="error-sec-body">${escapeHtml(item.reason)}</p>
            </div>

            <div class="error-sec error-sec-correct">
              <span class="error-sec-label">CORRECT APPROACH / TAKEAWAY</span>
              <p class="error-sec-body">${escapeHtml(item.correctApproach)}</p>
            </div>
          </div>
        </div>
      `;
    });
    html += '</div>';

    listContainer.innerHTML = html;

    // Attach card event listeners
    listContainer.querySelectorAll('.btn-edit-err').forEach(btn => {
      btn.addEventListener('click', () => handleEditError(btn.getAttribute('data-id')));
    });
    listContainer.querySelectorAll('.btn-del-err').forEach(btn => {
      btn.addEventListener('click', () => handleDeleteError(btn.getAttribute('data-id')));
    });

    if (window.WeaknessTracker && typeof window.WeaknessTracker.render === 'function') {
      window.WeaknessTracker.render();
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  return {
    init,
    render,
    openErrorModal
  };
})();
