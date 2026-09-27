/**
 * mocks.js - Mock Score Tracker, Sectional Breakdown, Attempt/Accuracy Analysis, and Detail View
 */

const MockManager = (() => {
  let editingMockId = null;
  const SUBJECTS = [
    { key: 'english', label: 'English', badgeClass: 'subject-english' },
    { key: 'gk', label: 'GK', badgeClass: 'subject-gk' },
    { key: 'legal', label: 'Legal', badgeClass: 'subject-legal' },
    { key: 'logical', label: 'Logical', badgeClass: 'subject-logical' },
    { key: 'quant', label: 'Quant', badgeClass: 'subject-quant' }
  ];

  function init() {
    setupEventListeners();
    render();
  }

  function setupEventListeners() {
    // "Add Mock" modal trigger
    const openAddMockBtn = document.getElementById('openAddMockBtn');
    if (openAddMockBtn) {
      openAddMockBtn.addEventListener('click', () => {
        openMockModal();
      });
    }

    // Modal close buttons for Mock Form
    const closeBtn = document.getElementById('closeMockModalBtn');
    const cancelBtn = document.getElementById('cancelMockModalBtn');
    if (closeBtn) closeBtn.addEventListener('click', closeMockModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeMockModal);

    // Modal close buttons for Mock Detail Modal
    const closeDetailBtn = document.getElementById('closeMockDetailModalBtn');
    const detailCloseBtn = document.getElementById('detailCloseBtn');
    if (closeDetailBtn) closeDetailBtn.addEventListener('click', closeMockDetailModal);
    if (detailCloseBtn) detailCloseBtn.addEventListener('click', closeMockDetailModal);

    // Mock form submit
    const mockForm = document.getElementById('mockForm');
    if (mockForm) {
      mockForm.addEventListener('submit', handleMockFormSubmit);
    }

    // Live calculation listeners in the mock form
    SUBJECTS.forEach(({ key }) => {
      const card = document.querySelector(`.sec-input-card[data-subject="${key}"]`);
      if (card) {
        const handleInput = (e) => {
          calculateSection(key, e.target ? e.target.id : '');
          updateOverallMockScore();
        };
        card.addEventListener('input', handleInput);
        card.addEventListener('change', handleInput);
      }
    });
  }

  /**
   * Recalculates and validates a single section:
   * - Wrong = Attempted - Correct
   * - Unattempted = Maximum Questions - Attempted
   * - Score = Correct - (Wrong * 0.25)
   *
   * Validations:
   * - Attempted cannot exceed Maximum Questions.
   * - Correct cannot exceed Attempted.
   * - Values cannot be negative.
   * - Score is never calculated from invalid/incomplete input.
   */
  function calculateSection(key, editedField = '') {
    const card = document.querySelector(`.sec-input-card[data-subject="${key}"]`);
    const maxInput = document.getElementById(`sec_${key}_max`);
    const attInput = document.getElementById(`sec_${key}_attempted`);
    const corrInput = document.getElementById(`sec_${key}_correct`);
    const wrongInput = document.getElementById(`sec_${key}_wrong`);
    const unattInput = document.getElementById(`sec_${key}_unattempted`);
    const scoreInput = document.getElementById(`sec_${key}_score`);
    const badge = document.getElementById(`sec_${key}_calc_badge`);

    if (card) card.classList.remove('has-error');

    const maxRaw = maxInput?.value.trim() ?? '';
    const attRaw = attInput?.value.trim() ?? '';
    const corrRaw = corrInput?.value.trim() ?? '';
    const wrongRaw = wrongInput?.value.trim() ?? '';
    const scoreRaw = scoreInput?.value.trim() ?? '';

    const maxVal = maxRaw !== '' && !isNaN(parseFloat(maxRaw)) ? parseFloat(maxRaw) : null;
    const attVal = attRaw !== '' && !isNaN(parseFloat(attRaw)) ? parseFloat(attRaw) : null;
    let corrVal = corrRaw !== '' && !isNaN(parseFloat(corrRaw)) ? parseFloat(corrRaw) : null;
    let wrongVal = wrongRaw !== '' && !isNaN(parseFloat(wrongRaw)) ? parseFloat(wrongRaw) : null;

    // Check if section is completely blank
    const hasAnyInput = maxRaw !== '' || attRaw !== '' || corrRaw !== '' || wrongRaw !== '' || scoreRaw !== '';
    if (!hasAnyInput) {
      if (badge) badge.textContent = '';
      if (scoreInput) {
        scoreInput.classList.remove('auto-calc');
        scoreInput.value = '';
      }
      if (wrongInput) wrongInput.value = '';
      if (unattInput) unattInput.value = '';
      return { key, isValid: true, hasData: false, score: null, max: null };
    }

    // 1. VALIDATION: Check for negative values
    if ((maxVal !== null && maxVal < 0) || (attVal !== null && attVal < 0) || (corrVal !== null && corrVal < 0) || (wrongVal !== null && wrongVal < 0)) {
      if (card) card.classList.add('has-error');
      if (badge) {
        badge.innerHTML = '<span class="sec-calc-error">⚠️ Values cannot be negative</span>';
      }
      if (scoreInput && scoreInput.classList.contains('auto-calc')) {
        scoreInput.value = '';
      }
      return { key, isValid: false, hasData: true, error: 'Values cannot be negative', score: null, max: maxVal };
    }

    // 2. VALIDATION: Attempted cannot exceed Maximum Questions
    if (maxVal !== null && attVal !== null && attVal > maxVal) {
      if (card) card.classList.add('has-error');
      if (badge) {
        badge.innerHTML = `<span class="sec-calc-error">⚠️ Attempted (${attVal}) exceeds Max (${maxVal})</span>`;
      }
      if (scoreInput && scoreInput.classList.contains('auto-calc')) {
        scoreInput.value = '';
      }
      if (unattInput) unattInput.value = '';
      return { key, isValid: false, hasData: true, error: `Attempted (${attVal}) cannot exceed Maximum Questions (${maxVal})`, score: null, max: maxVal };
    }

    // Special handler: If user edited Wrong directly, auto-sync Correct
    if (editedField === `sec_${key}_wrong` && wrongVal !== null && attVal !== null) {
      if (wrongVal <= attVal) {
        corrVal = attVal - wrongVal;
        if (corrInput) corrInput.value = corrVal;
      }
    }

    // 3. VALIDATION: Correct cannot exceed Attempted
    if (attVal !== null && corrVal !== null && corrVal > attVal) {
      if (card) card.classList.add('has-error');
      if (badge) {
        badge.innerHTML = `<span class="sec-calc-error">⚠️ Correct (${corrVal}) exceeds Attempted (${attVal})</span>`;
      }
      if (scoreInput && scoreInput.classList.contains('auto-calc')) {
        scoreInput.value = '';
      }
      return { key, isValid: false, hasData: true, error: `Correct (${corrVal}) cannot exceed Attempted (${attVal})`, score: null, max: maxVal };
    }

    // 4. Incomplete input check: Need both Attempted and Correct to calculate Score
    if (attVal === null || corrVal === null) {
      const partialUnatt = (maxVal !== null && attVal !== null) ? Math.max(0, maxVal - attVal) : null;
      if (unattInput) {
        unattInput.value = partialUnatt !== null ? partialUnatt : '';
      }
      if (wrongInput && editedField !== `sec_${key}_wrong`) {
        wrongInput.value = '';
      }
      if (scoreInput && scoreInput.classList.contains('auto-calc')) {
        scoreInput.value = '';
      }
      if (badge) {
        const parts = [];
        if (partialUnatt !== null) {
          parts.push(`Unatt: ${partialUnatt}`);
        }
        badge.className = 'sec-calc-badge font-mono';
        badge.textContent = parts.join(' • ');
      }
      // If user typed a manual score and no attempt counts, use that score
      const manualScore = scoreRaw !== '' && !isNaN(parseFloat(scoreRaw)) ? parseFloat(scoreRaw) : null;
      return { key, isValid: true, hasData: true, score: manualScore, max: maxVal };
    }

    // 5. AUTOMATIC CALCULATIONS:
    // Wrong = Attempted - Correct
    const calculatedWrong = attVal - corrVal;
    if (wrongInput && editedField !== `sec_${key}_wrong`) {
      wrongInput.value = calculatedWrong;
    }

    // Unattempted = Maximum Questions - Attempted
    const calculatedUnatt = (maxVal !== null) ? Math.max(0, maxVal - attVal) : null;
    if (unattInput) {
      unattInput.value = calculatedUnatt !== null ? calculatedUnatt : '';
    }

    // Score = Correct - (Wrong * 0.25)
    const rawScore = corrVal - (calculatedWrong * 0.25);
    const calculatedScore = Math.round(rawScore * 100) / 100;
    if (scoreInput) {
      scoreInput.value = calculatedScore;
      scoreInput.classList.add('auto-calc');
    }

    // Update Telemetry Badge
    if (badge) {
      badge.className = 'sec-calc-badge font-mono sec-calc-valid';
      const parts = [`Score: ${calculatedScore}`, `Wrong: ${calculatedWrong}`];
      if (calculatedUnatt !== null) {
        parts.push(`Unatt: ${calculatedUnatt}`);
      }
      if (attVal > 0) {
        parts.push(`Acc: ${((corrVal / attVal) * 100).toFixed(1)}%`);
      }
      badge.textContent = parts.join(' • ');
    }

    return {
      key,
      isValid: true,
      hasData: true,
      score: calculatedScore,
      max: maxVal,
      attempted: attVal,
      correct: corrVal,
      wrong: calculatedWrong,
      unattempted: calculatedUnatt
    };
  }

  /**
   * Automatically calculates overall mock score by summing individual section scores
   */
  function updateOverallMockScore() {
    let hasAnySectionWithData = false;
    let anyInvalid = false;
    let totalScore = 0;
    let totalMax = 0;

    SUBJECTS.forEach(({ key }) => {
      const res = calculateSection(key);
      if (!res.isValid) {
        anyInvalid = true;
      }
      if (res.hasData && res.score !== null) {
        hasAnySectionWithData = true;
        totalScore += res.score;
      }
      if (res.hasData && res.max !== null) {
        totalMax += res.max;
      }
    });

    const mockScoreInput = document.getElementById('mockScoreInput');
    const mockMaxScoreInput = document.getElementById('mockMaxScoreInput');

    if (hasAnySectionWithData && !anyInvalid) {
      const roundedTotal = Math.round(totalScore * 100) / 100;
      if (mockScoreInput) {
        mockScoreInput.value = roundedTotal;
        mockScoreInput.classList.add('auto-calc');
      }
      if (mockMaxScoreInput && totalMax > 0) {
        mockMaxScoreInput.value = Math.round(totalMax * 100) / 100;
      }
    } else if (!hasAnySectionWithData) {
      if (mockScoreInput) mockScoreInput.classList.remove('auto-calc');
    }
  }

  function openMockModal(mock = null) {
    const modal = document.getElementById('mockModal');
    const title = document.getElementById('mockModalTitle');
    const form = document.getElementById('mockForm');
    if (!modal || !form) return;

    form.reset();
    editingMockId = mock ? mock.id : null;

    if (mock) {
      title.textContent = 'Edit Mock Score';
      document.getElementById('mockNameInput').value = mock.name || '';
      document.getElementById('mockDateInput').value = mock.date || Storage.getLocalDateString();
      document.getElementById('mockScoreInput').value = mock.score !== undefined ? mock.score : '';
      document.getElementById('mockMaxScoreInput').value = mock.maxScore || 120;

      const sec = mock.sections || {};
      SUBJECTS.forEach(({ key }) => {
        const sData = sec[key] || {};
        const scoreEl = document.getElementById(`sec_${key}_score`);
        const maxEl = document.getElementById(`sec_${key}_max`);
        const attEl = document.getElementById(`sec_${key}_attempted`);
        const corrEl = document.getElementById(`sec_${key}_correct`);
        const wrongEl = document.getElementById(`sec_${key}_wrong`);
        const unattEl = document.getElementById(`sec_${key}_unattempted`);

        const maxVal = sData.maxScore !== undefined ? sData.maxScore : sData.totalQuestions;
        let wrongVal = sData.wrong;
        if (wrongVal === undefined && sData.attempted !== undefined && sData.correct !== undefined) {
          wrongVal = Math.max(0, sData.attempted - sData.correct);
        }

        let scoreVal = sData.score;
        if (scoreVal === undefined && sData.correct !== undefined && wrongVal !== undefined) {
          scoreVal = Math.round((sData.correct - (wrongVal * 0.25)) * 100) / 100;
        }

        let unattVal = sData.unattempted;
        if (unattVal === undefined && maxVal !== undefined && sData.attempted !== undefined) {
          unattVal = Math.max(0, maxVal - sData.attempted);
        }

        if (scoreEl) scoreEl.value = scoreVal !== undefined ? scoreVal : '';
        if (maxEl) maxEl.value = maxVal !== undefined ? maxVal : '';
        if (attEl) attEl.value = sData.attempted !== undefined ? sData.attempted : '';
        if (corrEl) corrEl.value = sData.correct !== undefined ? sData.correct : '';
        if (wrongEl) wrongEl.value = wrongVal !== undefined ? wrongVal : '';
        if (unattEl) unattEl.value = unattVal !== undefined ? unattVal : '';

        calculateSection(key);
      });
      updateOverallMockScore();
    } else {
      title.textContent = 'Add Mock Score';
      document.getElementById('mockDateInput').value = Storage.getLocalDateString();
      document.getElementById('mockMaxScoreInput').value = 120;
      // Auto-suggest next mock number
      const existing = Storage.getMocks();
      document.getElementById('mockNameInput').value = `Mock ${existing.length + 1}`;

      SUBJECTS.forEach(({ key }) => {
        const wrongEl = document.getElementById(`sec_${key}_wrong`);
        const unattEl = document.getElementById(`sec_${key}_unattempted`);
        if (wrongEl) wrongEl.value = '';
        if (unattEl) unattEl.value = '';
        calculateSection(key);
      });
      updateOverallMockScore();
    }

    modal.classList.add('active');
    document.getElementById('mockScoreInput').focus();
  }

  function closeMockModal() {
    const modal = document.getElementById('mockModal');
    if (modal) modal.classList.remove('active');
    editingMockId = null;
  }

  function handleMockFormSubmit(e) {
    e.preventDefault();

    // 1. Validate all sections for impossible/invalid inputs
    let hasValidationError = false;
    const errorDetails = [];

    SUBJECTS.forEach(({ key, label }) => {
      const res = calculateSection(key);
      if (!res.isValid) {
        hasValidationError = true;
        errorDetails.push(`${label}: ${res.error}`);
      }
    });

    if (hasValidationError) {
      alert(`Please fix the following validation errors before saving:\n• ${errorDetails.join('\n• ')}`);
      return;
    }

    const name = document.getElementById('mockNameInput').value.trim();
    const date = document.getElementById('mockDateInput').value;
    const scoreVal = parseFloat(document.getElementById('mockScoreInput').value);
    const maxScoreVal = parseFloat(document.getElementById('mockMaxScoreInput').value) || 120;

    if (!name) {
      alert('Please enter a mock name or number.');
      return;
    }
    if (isNaN(scoreVal) || scoreVal < 0) {
      alert('Please enter a valid non-negative overall score.');
      return;
    }
    if (scoreVal > maxScoreVal) {
      alert(`Score (${scoreVal}) cannot exceed maximum marks (${maxScoreVal}).`);
      return;
    }

    // Parse each section independently
    const sections = {};
    SUBJECTS.forEach(({ key }) => {
      const scoreStr = document.getElementById(`sec_${key}_score`)?.value.trim() ?? '';
      const maxStr = document.getElementById(`sec_${key}_max`)?.value.trim() ?? '';
      const attStr = document.getElementById(`sec_${key}_attempted`)?.value.trim() ?? '';
      const corrStr = document.getElementById(`sec_${key}_correct`)?.value.trim() ?? '';
      const wrongStr = document.getElementById(`sec_${key}_wrong`)?.value.trim() ?? '';

      const hasAny = scoreStr !== '' || maxStr !== '' || attStr !== '' || corrStr !== '' || wrongStr !== '';
      if (hasAny) {
        const maxVal = maxStr !== '' && !isNaN(parseFloat(maxStr)) ? parseFloat(maxStr) : undefined;
        const attVal = attStr !== '' && !isNaN(parseInt(attStr, 10)) ? parseInt(attStr, 10) : undefined;
        const corrVal = corrStr !== '' && !isNaN(parseInt(corrStr, 10)) ? parseInt(corrStr, 10) : undefined;
        let wrongVal = wrongStr !== '' && !isNaN(parseInt(wrongStr, 10)) ? parseInt(wrongStr, 10) : undefined;
        if (wrongVal === undefined && attVal !== undefined && corrVal !== undefined) {
          wrongVal = Math.max(0, attVal - corrVal);
        }

        let secScore = scoreStr !== '' && !isNaN(parseFloat(scoreStr)) ? parseFloat(scoreStr) : undefined;
        if (secScore === undefined && corrVal !== undefined && wrongVal !== undefined) {
          secScore = Math.round((corrVal - (wrongVal * 0.25)) * 100) / 100;
        }

        const unattempted = (maxVal !== undefined && attVal !== undefined) ? Math.max(0, maxVal - attVal) : undefined;

        sections[key] = {
          score: secScore,
          maxScore: maxVal,
          totalQuestions: maxVal, // Max marks and total questions are the same
          attempted: attVal,
          correct: corrVal,
          wrong: wrongVal,
          unattempted: unattempted
        };
      }
    });

    const mockPayload = {
      name,
      date,
      score: scoreVal,
      maxScore: maxScoreVal,
      sections
    };

    if (editingMockId) {
      mockPayload.id = editingMockId;
    }

    Storage.saveMock(mockPayload);
    closeMockModal();
    render();

    // Trigger main dashboard update for overall stats
    if (window.App && typeof window.App.updateMetrics === 'function') {
      window.App.updateMetrics();
    }
  }

  function handleEditMock(id) {
    const mocks = Storage.getMocks();
    const mock = mocks.find(m => m.id === id);
    if (mock) {
      closeMockDetailModal();
      openMockModal(mock);
    }
  }

  function handleDeleteMock(id) {
    const mocks = Storage.getMocks();
    const mock = mocks.find(m => m.id === id);
    const name = mock ? mock.name : 'this mock';
    if (confirm(`Are you sure you want to delete ${name}? This will update your graph and metrics.`)) {
      Storage.deleteMock(id);
      closeMockDetailModal();
      render();
      if (window.App && typeof window.App.updateMetrics === 'function') {
        window.App.updateMetrics();
      }
    }
  }

  // --- Mock Detail View Modal ---
  function openMockDetailModal(mockId) {
    const mocks = Storage.getMocks();
    const mock = mocks.find(m => m.id === mockId);
    if (!mock) return;

    const modal = document.getElementById('mockDetailModal');
    if (!modal) return;

    document.getElementById('mockDetailTitle').textContent = (mock.name || 'MOCK').toUpperCase();
    document.getElementById('mockDetailDate').textContent = mock.date || '';

    // Overall Score Calculation
    const maxScore = mock.maxScore || 120;
    const scorePct = ((mock.score / maxScore) * 100).toFixed(1);
    document.getElementById('detailOverallScore').textContent = `${mock.score} / ${maxScore}`;
    document.getElementById('detailOverallPct').textContent = `${scorePct}% achieved`;

    // Aggregate Questions Metrics across all recorded sections
    let totalQs = 0;
    let attempted = 0;
    let correct = 0;
    let hasQuestionData = false;

    const sections = mock.sections || {};
    SUBJECTS.forEach(({ key }) => {
      const s = sections[key];
      if (s) {
        if (s.totalQuestions !== undefined) {
          totalQs += s.totalQuestions;
          hasQuestionData = true;
        }
        if (s.attempted !== undefined) {
          attempted += s.attempted;
          hasQuestionData = true;
        }
        if (s.correct !== undefined) {
          correct += s.correct;
          hasQuestionData = true;
        }
      }
    });

    if (hasQuestionData && totalQs > 0) {
      const attRate = ((attempted / totalQs) * 100).toFixed(1);
      const accRate = attempted > 0 ? ((correct / attempted) * 100).toFixed(1) + '%' : '—';

      document.getElementById('detailOverallAttemptRate').textContent = `${attRate}%`;
      document.getElementById('detailOverallAttemptCounts').textContent = `${attempted} / ${totalQs} questions`;
      document.getElementById('detailOverallAccuracy').textContent = accRate;
      document.getElementById('detailOverallCorrectCounts').textContent = `${correct} / ${attempted} attempted`;
    } else {
      document.getElementById('detailOverallAttemptRate').textContent = '—';
      document.getElementById('detailOverallAttemptCounts').textContent = 'No question counts logged';
      document.getElementById('detailOverallAccuracy').textContent = '—';
      document.getElementById('detailOverallCorrectCounts').textContent = '—';
    }

    // Render Sectional Performance Cards
    const sectionsContainer = document.getElementById('mockDetailSectionsGrid');
    if (sectionsContainer) {
      let html = '';
      SUBJECTS.forEach(({ key, label, badgeClass }) => {
        const s = sections[key];
        const isRecorded = s && (s.score !== undefined || s.maxScore !== undefined || s.attempted !== undefined);

        if (!isRecorded) {
          html += `
            <div class="detail-sec-card sec-unrecorded">
              <div class="detail-sec-card-header">
                <span class="subject-badge ${badgeClass}">${label}</span>
                <span class="text-muted font-mono" style="font-size: 11px;">Not Recorded</span>
              </div>
              <p class="text-muted" style="font-size: 12px; margin-top: 10px;">No sectional score entered for this mock.</p>
            </div>
          `;
          return;
        }

        let secScore = s.score !== undefined ? s.score : '—';
        if (secScore === '—' && typeof s.correct === 'number' && typeof s.attempted === 'number') {
          const w = typeof s.wrong === 'number' ? s.wrong : Math.max(0, s.attempted - s.correct);
          secScore = Math.round((s.correct - (w * 0.25)) * 100) / 100;
        }

        const secMax = s.maxScore !== undefined ? s.maxScore : '—';
        const secPct = (typeof secScore === 'number' && typeof s.maxScore === 'number' && s.maxScore > 0)
          ? ((secScore / s.maxScore) * 100).toFixed(1) + '%'
          : '';

        const sTotal = s.totalQuestions !== undefined ? s.totalQuestions : '—';
        const sAtt = s.attempted !== undefined ? s.attempted : '—';
        const sCorr = s.correct !== undefined ? s.correct : '—';

        let sWrong = typeof s.wrong === 'number' ? s.wrong : '—';
        let sUnatt = typeof s.unattempted === 'number' ? s.unattempted : '—';
        let sAttRate = '—';
        let sAccuracy = '—';

        if (typeof s.attempted === 'number' && typeof s.correct === 'number') {
          if (sWrong === '—') sWrong = Math.max(0, s.attempted - s.correct);
          sAccuracy = s.attempted > 0 ? ((s.correct / s.attempted) * 100).toFixed(1) + '%' : '—';
        }
        if (typeof s.totalQuestions === 'number' && typeof s.attempted === 'number' && s.totalQuestions > 0) {
          if (sUnatt === '—') sUnatt = Math.max(0, s.totalQuestions - s.attempted);
          sAttRate = ((s.attempted / s.totalQuestions) * 100).toFixed(1) + '%';
        }

        html += `
          <div class="detail-sec-card">
            <div class="detail-sec-card-header">
              <span class="subject-badge ${badgeClass}">${label}</span>
              <div class="detail-sec-score font-mono">
                <strong>${secScore}</strong> / ${secMax}
                ${secPct ? `<span class="detail-sec-pct">(${secPct})</span>` : ''}
              </div>
            </div>

            <div class="detail-sec-metrics-grid">
              <div class="detail-sec-metric">
                <span class="detail-m-label">TOTAL QS</span>
                <span class="detail-m-val font-mono">${sTotal}</span>
              </div>
              <div class="detail-sec-metric">
                <span class="detail-m-label">ATTEMPTED</span>
                <span class="detail-m-val font-mono">${sAtt}</span>
              </div>
              <div class="detail-sec-metric">
                <span class="detail-m-label">CORRECT</span>
                <span class="detail-m-val font-mono text-green">${sCorr}</span>
              </div>
              <div class="detail-sec-metric">
                <span class="detail-m-label">WRONG</span>
                <span class="detail-m-val font-mono text-red">${sWrong}</span>
              </div>
              <div class="detail-sec-metric">
                <span class="detail-m-label">UNATTEMPTED</span>
                <span class="detail-m-val font-mono">${sUnatt}</span>
              </div>
            </div>

            <div class="detail-sec-rates-row">
              <div class="detail-rate-box">
                <span class="detail-rate-label">ATTEMPT RATE</span>
                <span class="detail-rate-val font-mono">${sAttRate}</span>
              </div>
              <div class="detail-rate-box">
                <span class="detail-rate-label">ACCURACY</span>
                <span class="detail-rate-val font-mono ${sAccuracy !== '—' ? 'text-accent' : ''}">${sAccuracy}</span>
              </div>
            </div>
          </div>
        `;
      });
      sectionsContainer.innerHTML = html;
    }

    // Attach Edit button handler in detail footer
    const editBtn = document.getElementById('detailEditMockBtn');
    if (editBtn) {
      editBtn.onclick = () => handleEditMock(mock.id);
    }

    modal.classList.add('active');
  }

  function closeMockDetailModal() {
    const modal = document.getElementById('mockDetailModal');
    if (modal) modal.classList.remove('active');
  }

  function render() {
    renderGraph();
    renderTable();
    if (window.WeaknessTracker && typeof window.WeaknessTracker.render === 'function') {
      window.WeaknessTracker.render();
    }
  }

  function renderGraph() {
    const mocks = Storage.getMocks();
    Charts.renderMockGraph('mockGraphContainer', mocks);
  }

  function renderTable() {
    const tbody = document.getElementById('mockHistoryBody');
    const emptyState = document.getElementById('mockTableEmptyState');
    if (!tbody) return;

    const mocks = Storage.getMocks();

    if (mocks.length === 0) {
      tbody.innerHTML = '';
      if (emptyState) emptyState.style.display = 'block';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';

    // Newest mock normally appears first
    const sorted = [...mocks].sort((a, b) => {
      const dDiff = new Date(b.date) - new Date(a.date);
      return dDiff !== 0 ? dDiff : (b.createdAt || 0) - (a.createdAt || 0);
    });

    let html = '';
    sorted.forEach(m => {
      const pct = ((m.score / (m.maxScore || 120)) * 100).toFixed(1);

      // Sectional pill summary with proper independent maximum marks!
      let sectionsSummary = '';
      if (m.sections && Object.keys(m.sections).length > 0) {
        const parts = [];
        SUBJECTS.forEach(({ key, label }) => {
          const s = m.sections[key];
          if (s && s.score !== undefined) {
            const maxPart = s.maxScore !== undefined ? `/${s.maxScore}` : '';
            parts.push(`${label} ${s.score}${maxPart}`);
          }
        });
        if (parts.length > 0) {
          sectionsSummary = `<div class="mock-sections-sub font-mono">${parts.join(' | ')}</div>`;
        }
      }

      // Calculate aggregate attempt rate & accuracy for the row if available
      let rateBadgeHtml = '';
      let tot = 0, att = 0, corr = 0;
      let hasQ = false;
      if (m.sections) {
        SUBJECTS.forEach(({ key }) => {
          const s = m.sections[key];
          if (s) {
            if (s.totalQuestions !== undefined) { tot += s.totalQuestions; hasQ = true; }
            if (s.attempted !== undefined) { att += s.attempted; hasQ = true; }
            if (s.correct !== undefined) { corr += s.correct; hasQ = true; }
          }
        });
      }
      if (hasQ && tot > 0) {
        const attRate = ((att / tot) * 100).toFixed(0);
        const accRate = att > 0 ? ((corr / att) * 100).toFixed(0) + '%' : '—';
        rateBadgeHtml = `<div class="mock-rates-sub font-mono">Att: <strong>${attRate}%</strong> • Acc: <strong>${accRate}</strong></div>`;
      }

      html += `
        <tr class="mock-row" data-id="${m.id}">
          <td class="mock-cell-name">
            <div class="mock-name-title font-mono">${escapeHtml(m.name)}</div>
            ${sectionsSummary}
            ${rateBadgeHtml}
          </td>
          <td class="mock-cell-date font-mono">${m.date}</td>
          <td class="mock-cell-score font-mono">
            <strong>${m.score}</strong> <span class="text-muted">/ ${m.maxScore || 120}</span>
          </td>
          <td class="mock-cell-pct font-mono">
            <span class="pct-badge ${pct >= 70 ? 'badge-high' : pct >= 50 ? 'badge-mid' : 'badge-low'}">
              ${pct}%
            </span>
          </td>
          <td class="mock-cell-actions">
            <button type="button" class="btn-action btn-view" data-id="${m.id}" title="View detailed analysis">View</button>
            <button type="button" class="btn-action btn-edit" data-id="${m.id}" title="Edit mock">Edit</button>
            <button type="button" class="btn-action btn-delete" data-id="${m.id}" title="Delete mock">Delete</button>
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = html;

    // Attach row action listeners
    tbody.querySelectorAll('.btn-view').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openMockDetailModal(btn.getAttribute('data-id'));
      });
    });

    tbody.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleEditMock(btn.getAttribute('data-id'));
      });
    });

    tbody.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleDeleteMock(btn.getAttribute('data-id'));
      });
    });

    // Row click also opens details
    tbody.querySelectorAll('.mock-row').forEach(row => {
      row.addEventListener('click', () => {
        openMockDetailModal(row.getAttribute('data-id'));
      });
      row.style.cursor = 'pointer';
    });
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
    openMockModal,
    openMockDetailModal
  };
})();
