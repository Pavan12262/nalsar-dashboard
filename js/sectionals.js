/**
 * sectionals.js - Daily Sectional Marks Tracker, Previous-Day Comparison Engine,
 * Multi-Day Progression Chart, and History Inspector.
 */

const SectionalsManager = (() => {
  // Section definitions with brand colors and standard default maximum marks
  const SECTIONS = [
    { key: 'english', label: 'English', defaultMax: 24, color: '#38bdf8' },
    { key: 'gk', label: 'GK', defaultMax: 28, color: '#fbbf24' },
    { key: 'legal', label: 'Legal', defaultMax: 30, color: '#a855f7' },
    { key: 'logical', label: 'Logical', defaultMax: 24, color: '#ec4899' },
    { key: 'quant', label: 'Quant', defaultMax: 14, color: '#10b981' }
  ];

  let selectedDate = Storage.getLocalDateString();
  let chartActiveView = 'all'; // 'all', 'overall', 'english', 'gk', 'legal', 'logical', 'quant'
  let chartActiveMetric = 'marks'; // 'marks', 'attemptRate', 'accuracy'

  function init() {
    setupEventListeners();
    loadFormForDate(selectedDate);
    render();
  }

  function setupEventListeners() {
    // Date navigation controls
    const dateInput = document.getElementById('secSelectedDateInput');
    const prevBtn = document.getElementById('secPrevDateBtn');
    const nextBtn = document.getElementById('secNextDateBtn');
    const todayBtn = document.getElementById('secTodayBtn');
    const yesterdayBtn = document.getElementById('secYesterdayBtn');

    if (dateInput) {
      dateInput.value = selectedDate;
      dateInput.addEventListener('change', (e) => {
        if (e.target.value) {
          selectedDate = e.target.value;
          onDateChanged();
        }
      });
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', () => shiftSelectedDate(-1));
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => shiftSelectedDate(1));
    }

    if (todayBtn) {
      todayBtn.addEventListener('click', () => {
        selectedDate = Storage.getLocalDateString();
        onDateChanged();
      });
    }

    if (yesterdayBtn) {
      yesterdayBtn.addEventListener('click', () => {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        selectedDate = Storage.getLocalDateString(d);
        onDateChanged();
      });
    }

    // Daily Sectional Form Submit
    const form = document.getElementById('sectionalEntryForm');
    if (form) {
      form.addEventListener('submit', handleFormSubmit);
    }

    // Live calculations and totals as any input changes
    const allFormInputs = document.querySelectorAll(
      '.sec-form-score-input, .sec-form-max-input, .sec-totalq-input, .sec-attempted-input, .sec-correct-input'
    );
    allFormInputs.forEach(input => {
      input.addEventListener('input', () => {
        updateLiveCalculations();
        updateLiveFormTotals();
      });
    });

    // Reset / Clear Form button
    const clearBtn = document.getElementById('secClearFormBtn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        clearForm();
        updateLiveCalculations();
        updateLiveFormTotals();
      });
    }

    // Chart Scope/Subject filter pills
    const chartFilterContainer = document.getElementById('secChartFilterGroup');
    if (chartFilterContainer) {
      chartFilterContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.chart-filter-btn');
        if (btn) {
          const view = btn.getAttribute('data-view');
          if (view) {
            chartActiveView = view;
            chartFilterContainer.querySelectorAll('.chart-filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderGraph();
          }
        }
      });
    }

    // Chart Metric Type filter pills (Marks, Attempt Rate %, Accuracy %)
    const metricFilterContainer = document.getElementById('secChartMetricFilterGroup');
    if (metricFilterContainer) {
      metricFilterContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.chart-metric-btn');
        if (btn) {
          const metric = btn.getAttribute('data-metric');
          if (metric) {
            chartActiveMetric = metric;
            metricFilterContainer.querySelectorAll('.chart-metric-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderGraph();
          }
        }
      });
    }
  }

  function shiftSelectedDate(days) {
    const parts = selectedDate.split('-').map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2] + days);
    selectedDate = Storage.getLocalDateString(d);
    onDateChanged();
  }

  function onDateChanged() {
    const dateInput = document.getElementById('secSelectedDateInput');
    if (dateInput) dateInput.value = selectedDate;
    updateDateDisplayLabel();
    loadFormForDate(selectedDate);
    renderComparison();
    renderHistory();
  }

  function updateDateDisplayLabel() {
    const label = document.getElementById('secDateHeaderLabel');
    if (!label) return;

    const todayStr = Storage.getLocalDateString();
    const yestDate = new Date();
    yestDate.setDate(yestDate.getDate() - 1);
    const yestStr = Storage.getLocalDateString(yestDate);

    const parts = selectedDate.split('-').map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    const options = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' };
    const dateText = d.toLocaleDateString(undefined, options);

    if (selectedDate === todayStr) {
      label.innerHTML = `<strong>Today</strong> • ${dateText}`;
    } else if (selectedDate === yestStr) {
      label.innerHTML = `<strong>Yesterday</strong> • ${dateText}`;
    } else {
      label.innerHTML = `<strong>${dateText}</strong>`;
    }
  }

  function loadFormForDate(dateStr) {
    const entry = Storage.getSectionalByDate(dateStr);
    const statusNotice = document.getElementById('secFormStatusNotice');

    SECTIONS.forEach(sec => {
      const scoreInput = document.getElementById(`input_score_${sec.key}`);
      const maxInput = document.getElementById(`input_max_${sec.key}`);
      const totalqInput = document.getElementById(`input_totalq_${sec.key}`);
      const attInput = document.getElementById(`input_attempted_${sec.key}`);
      const corrInput = document.getElementById(`input_correct_${sec.key}`);

      if (entry && entry.sections && entry.sections[sec.key]) {
        const data = entry.sections[sec.key];
        if (scoreInput) scoreInput.value = (typeof data.score === 'number') ? data.score : '';
        if (maxInput) maxInput.value = (typeof data.maxScore === 'number') ? data.maxScore : sec.defaultMax;
        if (totalqInput) totalqInput.value = (typeof data.totalQuestions === 'number') ? data.totalQuestions : (data.maxScore || sec.defaultMax);
        if (attInput) attInput.value = (typeof data.attempted === 'number') ? data.attempted : '';
        if (corrInput) corrInput.value = (typeof data.correct === 'number') ? data.correct : '';
      } else {
        if (scoreInput) scoreInput.value = '';
        if (maxInput) maxInput.value = sec.defaultMax;
        if (totalqInput) totalqInput.value = sec.defaultMax;
        if (attInput) attInput.value = '';
        if (corrInput) corrInput.value = '';
      }
    });

    if (statusNotice) {
      if (entry) {
        statusNotice.innerHTML = `<span class="sec-badge-saved">✓ Saved Record (${entry.totalScore !== null ? entry.totalScore : 0} marks)</span>`;
      } else {
        statusNotice.innerHTML = `<span class="sec-badge-unsaved">No entry yet for this date</span>`;
      }
    }

    updateLiveCalculations();
    updateLiveFormTotals();
  }

  function clearForm() {
    SECTIONS.forEach(sec => {
      const scoreInput = document.getElementById(`input_score_${sec.key}`);
      const maxInput = document.getElementById(`input_max_${sec.key}`);
      const totalqInput = document.getElementById(`input_totalq_${sec.key}`);
      const attInput = document.getElementById(`input_attempted_${sec.key}`);
      const corrInput = document.getElementById(`input_correct_${sec.key}`);

      if (scoreInput) scoreInput.value = '';
      if (maxInput) maxInput.value = sec.defaultMax;
      if (totalqInput) totalqInput.value = sec.defaultMax;
      if (attInput) attInput.value = '';
      if (corrInput) corrInput.value = '';
    });
  }

  /**
   * Automatically calculates:
   * Wrong = Attempted - Correct
   * Unattempted = Total Questions - Attempted
   * Score = Correct - (Wrong * 0.25)
   *
   * Updates Score field instantly when Attempted or Correct changes.
   */
  function updateLiveCalculations() {
    SECTIONS.forEach(sec => {
      const totalqInput = document.getElementById(`input_totalq_${sec.key}`);
      const attInput = document.getElementById(`input_attempted_${sec.key}`);
      const corrInput = document.getElementById(`input_correct_${sec.key}`);
      const scoreInput = document.getElementById(`input_score_${sec.key}`);
      const wrongDisplay = document.getElementById(`calc_wrong_${sec.key}`);
      const unattDisplay = document.getElementById(`calc_unatt_${sec.key}`);

      const totalQ = totalqInput && totalqInput.value.trim() !== '' ? parseInt(totalqInput.value.trim(), 10) : sec.defaultMax;
      const attVal = attInput && attInput.value.trim() !== '' ? parseInt(attInput.value.trim(), 10) : null;
      const corrVal = corrInput && corrInput.value.trim() !== '' ? parseInt(corrInput.value.trim(), 10) : null;

      // Wrong = Attempted - Correct
      let wrong = null;
      if (attVal !== null && corrVal !== null && !isNaN(attVal) && !isNaN(corrVal)) {
        wrong = Math.max(0, attVal - corrVal);
        if (wrongDisplay) wrongDisplay.textContent = wrong;
      } else {
        if (wrongDisplay) wrongDisplay.textContent = '—';
      }

      // Unattempted = Total Questions - Attempted
      if (!isNaN(totalQ) && attVal !== null && !isNaN(attVal)) {
        const unattempted = Math.max(0, totalQ - attVal);
        if (unattDisplay) unattDisplay.textContent = unattempted;
      } else {
        if (unattDisplay) unattDisplay.textContent = '—';
      }

      // Score = Correct - (Wrong * 0.25)
      // The Score field must update instantly whenever Correct or Attempted changes.
      if (corrVal !== null && attVal !== null && !isNaN(corrVal) && !isNaN(attVal) && wrong !== null) {
        const calculatedScore = Math.round((corrVal - (wrong * 0.25)) * 100) / 100;
        if (scoreInput) {
          scoreInput.value = calculatedScore;
        }
      }
    });
  }

  function updateLiveFormTotals() {
    let totalScore = 0;
    let totalMax = 0;
    let hasScore = false;

    SECTIONS.forEach(sec => {
      const scoreInput = document.getElementById(`input_score_${sec.key}`);
      const maxInput = document.getElementById(`input_max_${sec.key}`);
      const scoreVal = scoreInput && scoreInput.value.trim() !== '' ? parseFloat(scoreInput.value) : null;
      const maxVal = maxInput && maxInput.value.trim() !== '' ? parseFloat(maxInput.value) : sec.defaultMax;

      if (scoreVal !== null && !isNaN(scoreVal)) {
        totalScore += scoreVal;
        hasScore = true;
        totalMax += (!isNaN(maxVal) ? maxVal : sec.defaultMax);
      }
    });

    const scoreDisplay = document.getElementById('secFormLiveTotalScore');
    const maxDisplay = document.getElementById('secFormLiveTotalMax');
    const pctDisplay = document.getElementById('secFormLivePct');

    if (scoreDisplay) scoreDisplay.textContent = hasScore ? (Math.round(totalScore * 100) / 100) : '0';
    if (maxDisplay) maxDisplay.textContent = hasScore ? (Math.round(totalMax * 100) / 100) : '120';
    if (pctDisplay) {
      if (hasScore && totalMax > 0) {
        const pct = ((totalScore / totalMax) * 100).toFixed(1);
        pctDisplay.textContent = `${pct}%`;
      } else {
        pctDisplay.textContent = '—%';
      }
    }
  }

  function handleFormSubmit(e) {
    e.preventDefault();

    const sectionsData = {};
    let anyDataEntered = false;

    SECTIONS.forEach(sec => {
      const scoreInput = document.getElementById(`input_score_${sec.key}`);
      const maxInput = document.getElementById(`input_max_${sec.key}`);
      const totalqInput = document.getElementById(`input_totalq_${sec.key}`);
      const attInput = document.getElementById(`input_attempted_${sec.key}`);
      const corrInput = document.getElementById(`input_correct_${sec.key}`);

      const rawScore = scoreInput ? scoreInput.value.trim() : '';
      const rawMax = maxInput ? maxInput.value.trim() : '';
      const rawTotalQ = totalqInput ? totalqInput.value.trim() : '';
      const rawAtt = attInput ? attInput.value.trim() : '';
      const rawCorr = corrInput ? corrInput.value.trim() : '';

      const score = rawScore !== '' ? parseFloat(rawScore) : null;
      const maxScore = rawMax !== '' ? parseFloat(rawMax) : sec.defaultMax;
      const totalQuestions = rawTotalQ !== '' ? parseInt(rawTotalQ, 10) : sec.defaultMax;
      const attempted = rawAtt !== '' ? parseInt(rawAtt, 10) : null;
      const correct = rawCorr !== '' ? parseInt(rawCorr, 10) : null;

      let wrong = null;
      if (attempted !== null && correct !== null && !isNaN(attempted) && !isNaN(correct)) {
        wrong = Math.max(0, attempted - correct);
      }

      let unattempted = null;
      if (!isNaN(totalQuestions) && attempted !== null && !isNaN(attempted)) {
        unattempted = Math.max(0, totalQuestions - attempted);
      }

      let calculatedScore = (correct !== null && wrong !== null) ? Math.round((correct - (wrong * 0.25)) * 100) / 100 : null;
      let finalScore = (score !== null && !isNaN(score)) ? score : calculatedScore;

      if ((finalScore !== null && !isNaN(finalScore)) || (attempted !== null && !isNaN(attempted))) {
        sectionsData[sec.key] = {
          score: (finalScore !== null && !isNaN(finalScore)) ? Math.round(finalScore * 100) / 100 : null,
          maxScore: !isNaN(maxScore) ? Math.round(maxScore * 100) / 100 : sec.defaultMax,
          totalQuestions: !isNaN(totalQuestions) ? totalQuestions : sec.defaultMax,
          attempted: (attempted !== null && !isNaN(attempted)) ? attempted : null,
          correct: (correct !== null && !isNaN(correct)) ? correct : null,
          wrong: wrong,
          unattempted: unattempted
        };
        anyDataEntered = true;
      }
    });

    if (!anyDataEntered) {
      alert('Please enter marks or question attempts for at least one section before saving.');
      return;
    }

    Storage.saveSectional({
      date: selectedDate,
      sections: sectionsData
    });

    // Show temporary toast / notice
    const statusNotice = document.getElementById('secFormStatusNotice');
    if (statusNotice) {
      statusNotice.innerHTML = `<span class="sec-badge-saved animate-pulse">✓ Saved Successfully!</span>`;
      setTimeout(() => {
        loadFormForDate(selectedDate);
      }, 1500);
    }

    render();
  }

  /**
   * Calendar Day Comparison Calculation:
   * Compares the selected date directly against the exact previous calendar day (date - 1 day).
   */
  function getPreviousCalendarDay(dateStr) {
    const parts = dateStr.split('-').map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2] - 1);
    return Storage.getLocalDateString(d);
  }

  function renderComparison() {
    const container = document.getElementById('sectionalProgressContainer');
    if (!container) return;

    const currentEntry = Storage.getSectionalByDate(selectedDate);
    const prevDateStr = getPreviousCalendarDay(selectedDate);
    const prevEntry = Storage.getSectionalByDate(prevDateStr);

    // Format display dates
    const partsCur = selectedDate.split('-').map(Number);
    const curDateObj = new Date(partsCur[0], partsCur[1] - 1, partsCur[2]);
    const partsPrev = prevDateStr.split('-').map(Number);
    const prevDateObj = new Date(partsPrev[0], partsPrev[1] - 1, partsPrev[2]);

    const curFormatted = curDateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const prevFormatted = prevDateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

    let rowsHtml = '';

    // If current day has no entry at all
    if (!currentEntry) {
      container.innerHTML = `
        <div class="sec-empty-comparison">
          <div class="sec-empty-icon">📊</div>
          <h4>No marks logged for ${curFormatted}</h4>
          <p class="text-muted" style="font-size: 13px; max-width: 480px; margin: 0 auto 16px;">
            Enter your sectional marks above and click <strong>"Save Daily Sectionals"</strong> to see your progress and comparison.
          </p>
        </div>
      `;
      return;
    }

    // 1. Process Section rows
    SECTIONS.forEach(sec => {
      const curSec = currentEntry.sections ? currentEntry.sections[sec.key] : null;
      const prevSec = (prevEntry && prevEntry.sections) ? prevEntry.sections[sec.key] : null;

      const hasCurScore = curSec && typeof curSec.score === 'number' && !isNaN(curSec.score);
      const hasPrevScore = prevSec && typeof prevSec.score === 'number' && !isNaN(prevSec.score);

      const curScore = hasCurScore ? curSec.score : null;
      const prevScore = hasPrevScore ? prevSec.score : null;
      const curMax = hasCurScore && curSec.maxScore ? curSec.maxScore : sec.defaultMax;

      rowsHtml += buildComparisonRowHtml({
        label: sec.label,
        key: sec.key,
        color: sec.color,
        curScore,
        curMax,
        prevScore,
        hasPrevData: hasPrevScore,
        prevDateFormatted: prevFormatted
      });
    });

    // 2. Process OVERALL total row
    const hasCurOverall = typeof currentEntry.totalScore === 'number';
    const hasPrevOverall = prevEntry && typeof prevEntry.totalScore === 'number';

    const curOverallScore = hasCurOverall ? currentEntry.totalScore : null;
    const curOverallMax = currentEntry.totalMaxScore || 120;
    const prevOverallScore = hasPrevOverall ? prevEntry.totalScore : null;

    const overallRowHtml = buildComparisonRowHtml({
      label: 'OVERALL',
      key: 'overall',
      color: '#c084fc',
      isOverall: true,
      curScore: curOverallScore,
      curMax: curOverallMax,
      prevScore: prevOverallScore,
      hasPrevData: hasPrevOverall,
      prevDateFormatted: prevFormatted
    });

    container.innerHTML = `
      <div class="sec-progress-card">
        <div class="sec-progress-header">
          <div class="sec-progress-title-wrap">
            <span class="sec-progress-kicker font-mono">DAILY EVOLUTION</span>
            <h3 class="sec-progress-headline">SECTIONAL PROGRESS</h3>
          </div>
          <div class="sec-comparison-dates font-mono">
            <span class="prev-date-pill">Previous: ${prevFormatted}</span>
            <span class="date-arrow">→</span>
            <span class="cur-date-pill">Selected: ${curFormatted}</span>
          </div>
        </div>

        <div class="sec-comparison-list">
          ${rowsHtml}
          ${overallRowHtml}
        </div>
      </div>
    `;
  }

  function buildComparisonRowHtml(item) {
    const { label, key, color, isOverall, curScore, curMax, prevScore, hasPrevData } = item;

    // Display string for current marks
    const curDisplay = curScore !== null ? curScore : '—';
    const maxDisplay = curMax ? `<span class="sec-denom text-muted font-mono">/${curMax}</span>` : '';

    let comparisonCenter = '';
    let statusBadge = '';

    if (curScore === null) {
      // Unattempted today
      comparisonCenter = `<span class="sec-arrow-text font-mono text-muted">Not Attempted</span>`;
      statusBadge = `<span class="sec-status-badge status-neutral font-mono">UNATTEMPTED</span>`;
    } else if (!hasPrevData) {
      // Missing previous calendar day data
      comparisonCenter = `
        <div class="sec-values-flow font-mono">
          <span class="sec-prev-val text-muted">—</span>
          <span class="sec-arrow">→</span>
          <strong class="sec-cur-val" style="color: ${color};">${curDisplay}</strong>
          ${maxDisplay}
        </div>
      `;
      statusBadge = `<span class="sec-status-badge status-no-data font-mono">NO PREVIOUS DATA</span>`;
    } else {
      // Both current and previous exist! Calculate diff
      const diff = Math.round((curScore - prevScore) * 100) / 100;
      let diffSign = '';
      let badgeClass = '';
      let badgeText = '';

      if (diff > 0) {
        diffSign = `↑ +${diff}`;
        badgeClass = 'status-improved';
        badgeText = 'IMPROVED';
      } else if (diff < 0) {
        diffSign = `↓ ${diff}`;
        badgeClass = 'status-decreased';
        badgeText = 'DECREASED';
      } else {
        diffSign = '—';
        badgeClass = 'status-same';
        badgeText = 'SAME';
      }

      comparisonCenter = `
        <div class="sec-values-flow font-mono">
          <span class="sec-prev-val">${prevScore}</span>
          <span class="sec-arrow">→</span>
          <strong class="sec-cur-val" style="color: ${color};">${curDisplay}</strong>
          ${maxDisplay}
        </div>
      `;

      statusBadge = `
        <div class="sec-status-group">
          <span class="sec-diff-text ${badgeClass} font-mono">${diffSign}</span>
          <span class="sec-status-badge ${badgeClass} font-mono">${badgeText}</span>
        </div>
      `;
    }

    return `
      <div class="sec-comp-row ${isOverall ? 'sec-comp-row-overall' : ''}" data-section="${key}">
        <div class="sec-comp-label-wrap">
          <span class="sec-subject-indicator" style="background: ${color};"></span>
          <span class="sec-comp-label ${isOverall ? 'font-mono font-bold' : ''}">${escapeHtml(label)}</span>
        </div>
        <div class="sec-comp-middle">
          ${comparisonCenter}
        </div>
        <div class="sec-comp-status">
          ${statusBadge}
        </div>
      </div>
    `;
  }

  function renderHistory() {
    const tbody = document.getElementById('secHistoryTableBody');
    const emptyState = document.getElementById('secHistoryEmptyState');
    if (!tbody) return;

    const list = Storage.getSectionals();
    // Sort descending by date for the history table
    const sortedDesc = [...list].sort((a, b) => b.date.localeCompare(a.date));

    if (sortedDesc.length === 0) {
      tbody.innerHTML = '';
      if (emptyState) emptyState.style.display = 'block';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';

    tbody.innerHTML = sortedDesc.map(entry => {
      const isSelected = entry.date === selectedDate;
      const parts = entry.date.split('-').map(Number);
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      const dateText = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

      const getSecVal = (key) => {
        const sec = entry.sections ? entry.sections[key] : null;
        if (sec && typeof sec.score === 'number') {
          let attHtml = '';
          if (typeof sec.attempted === 'number') {
            attHtml = `<div class="sec-table-attempts font-mono">${sec.attempted} att • ${sec.correct ?? 0}C ${sec.wrong ?? 0}W</div>`;
          }
          return `<div><strong>${sec.score}</strong><span class="sec-table-sub">/${sec.maxScore || '—'}</span>${attHtml}</div>`;
        }
        return '<span class="text-muted">—</span>';
      };

      let overallAttHtml = '';
      if (typeof entry.totalAttempted === 'number') {
        overallAttHtml = `<div class="sec-table-attempts font-mono" style="color: #c084fc; opacity: 0.85;">${entry.totalAttempted} att • ${entry.totalCorrect ?? 0}C ${entry.totalWrong ?? 0}W</div>`;
      }

      const overallDisplay = typeof entry.totalScore === 'number'
        ? `<div><strong>${entry.totalScore}</strong><span class="sec-table-sub">/${entry.totalMaxScore || 120}</span>${overallAttHtml}</div>`
        : '<span class="text-muted">—</span>';

      return `
        <tr class="${isSelected ? 'sec-row-active' : ''}">
          <td>
            <div class="sec-table-date font-mono">
              <strong>${dateText}</strong>
              ${isSelected ? '<span class="sec-badge-active-day">ACTIVE</span>' : ''}
            </div>
          </td>
          <td class="font-mono">${getSecVal('english')}</td>
          <td class="font-mono">${getSecVal('gk')}</td>
          <td class="font-mono">${getSecVal('legal')}</td>
          <td class="font-mono">${getSecVal('logical')}</td>
          <td class="font-mono">${getSecVal('quant')}</td>
          <td class="font-mono sec-col-overall">${overallDisplay}</td>
          <td style="text-align: right;">
            <div class="table-actions">
              <button class="btn-action-icon btn-sec-edit" data-date="${entry.date}" title="View & Edit this date">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              </button>
              <button class="btn-action-icon btn-sec-delete" data-date="${entry.date}" title="Delete this entry">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Attach row action listeners
    tbody.querySelectorAll('.btn-sec-edit').forEach(btn => {
      btn.addEventListener('click', () => {
        const date = btn.getAttribute('data-date');
        if (date) {
          selectedDate = date;
          onDateChanged();
          const entrySection = document.getElementById('sectionalEntrySection');
          if (entrySection) {
            entrySection.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      });
    });

    tbody.querySelectorAll('.btn-sec-delete').forEach(btn => {
      btn.addEventListener('click', () => {
        const date = btn.getAttribute('data-date');
        if (date && confirm(`Are you sure you want to delete sectional marks for ${date}?`)) {
          Storage.deleteSectional(date);
          if (selectedDate === date) {
            loadFormForDate(selectedDate);
          }
          render();
        }
      });
    });
  }

  /**
   * Multi-Day Historical Progression Graph (Glowing SVG with Tooltips & Metric Selectors)
   */
  function renderGraph() {
    const container = document.getElementById('secGraphContainer');
    if (!container) return;

    const list = Storage.getSectionals();
    if (list.length === 0) {
      container.innerHTML = `
        <div class="chart-empty-state">
          <p class="text-muted">No sectional marks logged yet. Enter your scores above to generate your progression curve.</p>
        </div>
      `;
      return;
    }

    // Sort ascending for timeline chart
    const data = [...list].sort((a, b) => a.date.localeCompare(b.date));

    // SVG dimensions & responsive layout
    const width = 860;
    const height = 280;
    const padding = { top: 30, right: 40, bottom: 45, left: 55 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    // Helper functions for metrics
    const getSectionMetric = (d, secKey, metric) => {
      const sec = d.sections ? d.sections[secKey] : null;
      if (!sec) return null;

      if (metric === 'marks') {
        return (typeof sec.score === 'number') ? sec.score : null;
      }
      if (metric === 'attemptRate') {
        const maxQ = sec.totalQuestions || sec.maxScore || 1;
        if (typeof sec.attempted === 'number' && maxQ > 0) {
          return Math.round((sec.attempted / maxQ) * 1000) / 10;
        }
        return null;
      }
      if (metric === 'accuracy') {
        if (typeof sec.correct === 'number' && typeof sec.attempted === 'number' && sec.attempted > 0) {
          return Math.round((sec.correct / sec.attempted) * 1000) / 10;
        }
        return null;
      }
      return null;
    };

    const getOverallMetric = (d, metric) => {
      if (metric === 'marks') {
        return (typeof d.totalScore === 'number') ? d.totalScore : null;
      }
      if (metric === 'attemptRate') {
        const totalQ = d.totalQuestions || d.totalMaxScore || 120;
        if (typeof d.totalAttempted === 'number' && totalQ > 0) {
          return Math.round((d.totalAttempted / totalQ) * 1000) / 10;
        }
        return null;
      }
      if (metric === 'accuracy') {
        if (typeof d.totalCorrect === 'number' && typeof d.totalAttempted === 'number' && d.totalAttempted > 0) {
          return Math.round((d.totalCorrect / d.totalAttempted) * 1000) / 10;
        }
        return null;
      }
      return null;
    };

    // Build series configurations
    const seriesToDraw = [];

    if (chartActiveView === 'all' || chartActiveView === 'overall') {
      seriesToDraw.push({
        id: 'overall',
        label: 'Overall',
        color: '#c084fc',
        strokeWidth: 3.5,
        getValue: (d) => getOverallMetric(d, chartActiveMetric),
        getMetricsAll: (d) => ({
          marks: (typeof d.totalScore === 'number') ? `${d.totalScore} / ${d.totalMaxScore || 120}` : '—',
          attemptRate: (typeof d.totalAttempted === 'number' && (d.totalQuestions || d.totalMaxScore))
            ? `${((d.totalAttempted / (d.totalQuestions || d.totalMaxScore || 120)) * 100).toFixed(1)}% (${d.totalAttempted}/${d.totalQuestions || d.totalMaxScore || 120})`
            : '—',
          accuracy: (typeof d.totalCorrect === 'number' && typeof d.totalAttempted === 'number' && d.totalAttempted > 0)
            ? `${((d.totalCorrect / d.totalAttempted) * 100).toFixed(1)}% (${d.totalCorrect}C / ${d.totalWrong ?? 0}W)`
            : '—'
        })
      });
    }

    if (chartActiveView === 'all') {
      SECTIONS.forEach(sec => {
        seriesToDraw.push({
          id: sec.key,
          label: sec.label,
          color: sec.color,
          strokeWidth: 2,
          getValue: (d) => getSectionMetric(d, sec.key, chartActiveMetric),
          getMetricsAll: (d) => {
            const s = d.sections ? d.sections[sec.key] : null;
            if (!s) return { marks: '—', attemptRate: '—', accuracy: '—' };
            const maxQ = s.totalQuestions || s.maxScore || sec.defaultMax;
            return {
              marks: (typeof s.score === 'number') ? `${s.score} / ${s.maxScore || sec.defaultMax}` : '—',
              attemptRate: (typeof s.attempted === 'number' && maxQ > 0)
                ? `${((s.attempted / maxQ) * 100).toFixed(1)}% (${s.attempted}/${maxQ})`
                : '—',
              accuracy: (typeof s.correct === 'number' && typeof s.attempted === 'number' && s.attempted > 0)
                ? `${((s.correct / s.attempted) * 100).toFixed(1)}% (${s.correct}C / ${s.wrong ?? 0}W)`
                : '—'
            };
          }
        });
      });
    } else if (chartActiveView !== 'overall') {
      // Individual section view
      const targetSec = SECTIONS.find(s => s.key === chartActiveView);
      if (targetSec) {
        seriesToDraw.push({
          id: targetSec.key,
          label: targetSec.label,
          color: targetSec.color,
          strokeWidth: 3,
          getValue: (d) => getSectionMetric(d, targetSec.key, chartActiveMetric),
          getMetricsAll: (d) => {
            const s = d.sections ? d.sections[targetSec.key] : null;
            if (!s) return { marks: '—', attemptRate: '—', accuracy: '—' };
            const maxQ = s.totalQuestions || s.maxScore || targetSec.defaultMax;
            return {
              marks: (typeof s.score === 'number') ? `${s.score} / ${s.maxScore || targetSec.defaultMax}` : '—',
              attemptRate: (typeof s.attempted === 'number' && maxQ > 0)
                ? `${((s.attempted / maxQ) * 100).toFixed(1)}% (${s.attempted}/${maxQ})`
                : '—',
              accuracy: (typeof s.correct === 'number' && typeof s.attempted === 'number' && s.attempted > 0)
                ? `${((s.correct / s.attempted) * 100).toFixed(1)}% (${s.correct}C / ${s.wrong ?? 0}W)`
                : '—'
            };
          }
        });
      }
    }

    // Determine Y-scale range based on active metric
    let maxY = 0;
    seriesToDraw.forEach(s => {
      data.forEach(d => {
        const val = s.getValue(d);
        if (val !== null && val > maxY) maxY = val;
      });
    });

    if (chartActiveMetric === 'attemptRate' || chartActiveMetric === 'accuracy') {
      maxY = 100;
    } else {
      if (chartActiveView === 'all' || chartActiveView === 'overall') {
        maxY = Math.max(maxY + 10, 120);
      } else {
        maxY = Math.max(maxY + 4, 32);
      }
    }
    const minY = 0;

    // Scale helpers
    const count = data.length;
    const getX = (index) => {
      if (count === 1) return padding.left + chartW / 2;
      return padding.left + (index / (count - 1)) * chartW;
    };

    const getY = (val) => {
      if (val === null || val === undefined) return null;
      const ratio = (val - minY) / (maxY - minY);
      return padding.top + chartH - (ratio * chartH);
    };

    // Define glowing SVG filter gradients and shadow filters
    const filterDefs = `
      <defs>
        <!-- Intense Glow Filter for lines -->
        <filter id="secGlowFilter" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="4.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <!-- Soft Glow Filter for background halo -->
        <filter id="secSoftGlowFilter" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="9" result="bigBlur" />
          <feMerge>
            <feMergeNode in="bigBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <!-- Point Pulse Filter -->
        <filter id="secDotGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="dotBlur" />
          <feMerge>
            <feMergeNode in="dotBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
    `;

    // SVG horizontal grid lines (4 steps)
    let gridLinesSvg = '';
    const ySteps = 4;
    for (let i = 0; i <= ySteps; i++) {
      const stepVal = Math.round(minY + (maxY - minY) * (i / ySteps));
      const yPos = getY(stepVal);
      const unitLabel = (chartActiveMetric === 'attemptRate' || chartActiveMetric === 'accuracy') ? `${stepVal}%` : `${stepVal}`;
      gridLinesSvg += `
        <line x1="${padding.left}" y1="${yPos}" x2="${width - padding.right}" y2="${yPos}" stroke="rgba(255,255,255,0.06)" stroke-dasharray="3,3" />
        <text x="${padding.left - 10}" y="${yPos + 4}" font-family="JetBrains Mono, monospace" font-size="10" fill="rgba(255,255,255,0.35)" text-anchor="end">${unitLabel}</text>
      `;
    }

    // X-axis date labels
    let xLabelsSvg = '';
    data.forEach((d, idx) => {
      const x = getX(idx);
      const parts = d.date.split('-').map(Number);
      const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
      const label = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      xLabelsSvg += `
        <text x="${x}" y="${height - 12}" font-family="JetBrains Mono, monospace" font-size="10" fill="rgba(255,255,255,0.4)" text-anchor="middle">${label}</text>
      `;
    });

    // Helper to generate smooth Catmull-Rom or cubic Bezier curve path
    function createSmoothPath(points) {
      if (points.length === 0) return '';
      if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
      if (points.length === 2) return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;

      let d = `M ${points[0].x} ${points[0].y}`;
      for (let i = 0; i < points.length - 1; i++) {
        const p0 = (i > 0) ? points[i - 1] : points[0];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = (i < points.length - 2) ? points[i + 2] : p2;

        const cp1x = p1.x + (p2.x - p0.x) / 6;
        const cp1y = p1.y + (p2.y - p0.y) / 6;
        const cp2x = p2.x - (p3.x - p1.x) / 6;
        const cp2y = p2.y - (p3.y - p1.y) / 6;

        d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
      }
      return d;
    }

    // Draw glowing lines & visible points
    let linesSvg = '';
    let dotsSvg = '';

    seriesToDraw.forEach(series => {
      const validPoints = [];

      data.forEach((d, idx) => {
        const val = series.getValue(d);
        if (val !== null && !isNaN(val)) {
          validPoints.push({
            x: getX(idx),
            y: getY(val),
            val: val,
            date: d.date,
            entry: d
          });
        }
      });

      if (validPoints.length > 0) {
        const smoothPath = createSmoothPath(validPoints);

        // 1. Soft glowing halo underlayer
        linesSvg += `
          <path d="${smoothPath}" fill="none" stroke="${series.color}" stroke-width="${series.strokeWidth * 2.8}" stroke-linecap="round" stroke-linejoin="round" opacity="0.25" filter="url(#secSoftGlowFilter)" />
        `;

        // 2. Focused glowing line
        linesSvg += `
          <path d="${smoothPath}" class="sec-chart-glow-line" fill="none" stroke="${series.color}" stroke-width="${series.strokeWidth}" stroke-linecap="round" stroke-linejoin="round" filter="url(#secGlowFilter)" />
        `;

        // 3. Crisp solid foreground line
        linesSvg += `
          <path d="${smoothPath}" fill="none" stroke="${series.color}" stroke-width="${Math.max(1.5, series.strokeWidth - 0.5)}" stroke-linecap="round" stroke-linejoin="round" />
        `;

        // 4. Data points with rich hover telemetry
        validPoints.forEach(pt => {
          const metrics = series.getMetricsAll(pt.entry);
          const parts = pt.date.split('-').map(Number);
          const dObj = new Date(parts[0], parts[1] - 1, parts[2]);
          const dateStr = dObj.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

          const dataPayload = JSON.stringify({
            seriesLabel: series.label,
            color: series.color,
            date: dateStr,
            marks: metrics.marks,
            attemptRate: metrics.attemptRate,
            accuracy: metrics.accuracy,
            activeMetric: chartActiveMetric,
            activeVal: pt.val
          }).replace(/"/g, '&quot;');

          dotsSvg += `
            <g class="sec-point-wrap" data-pt="${dataPayload}">
              <!-- Outer glowing aura -->
              <circle cx="${pt.x}" cy="${pt.y}" r="6" fill="${series.color}" opacity="0.3" filter="url(#secDotGlow)" />
              <!-- Core visible point -->
              <circle cx="${pt.x}" cy="${pt.y}" r="4.5" fill="#080B14" stroke="${series.color}" stroke-width="2.5" class="sec-chart-point" />
            </g>
          `;
        });
      }
    });

    container.innerHTML = `
      <div class="sec-svg-wrap">
        <svg viewBox="0 0 ${width} ${height}" class="sec-progression-svg" style="width: 100%; height: auto; display: block;">
          ${filterDefs}
          ${gridLinesSvg}
          ${linesSvg}
          ${dotsSvg}
          ${xLabelsSvg}
        </svg>
        <div id="secChartTooltip" class="sec-chart-tooltip font-mono"></div>
      </div>
    `;

    // Attach interactive hover listeners for floating tooltip
    const svgWrap = container.querySelector('.sec-svg-wrap');
    const tooltip = container.querySelector('#secChartTooltip');
    const points = container.querySelectorAll('.sec-point-wrap');

    if (svgWrap && tooltip && points) {
      points.forEach(ptElem => {
        ptElem.addEventListener('mouseenter', (e) => {
          try {
            const raw = ptElem.getAttribute('data-pt');
            if (!raw) return;
            const data = JSON.parse(raw);

            tooltip.innerHTML = `
              <div class="sec-tooltip-date">${escapeHtml(data.date)}</div>
              <div class="sec-tooltip-title" style="color: ${data.color};">
                <span class="sec-tooltip-indicator" style="background: ${data.color};"></span>
                <span>${escapeHtml(data.seriesLabel)}</span>
              </div>
              <div class="sec-tooltip-grid">
                <div class="sec-tooltip-row">
                  <span class="sec-tooltip-label">Marks:</span>
                  <strong class="sec-tooltip-val" style="color: #38bdf8;">${escapeHtml(data.marks)}</strong>
                </div>
                <div class="sec-tooltip-row">
                  <span class="sec-tooltip-label">Attempt Rate:</span>
                  <strong class="sec-tooltip-val" style="color: #fbbf24;">${escapeHtml(data.attemptRate)}</strong>
                </div>
                <div class="sec-tooltip-row">
                  <span class="sec-tooltip-label">Accuracy:</span>
                  <strong class="sec-tooltip-val" style="color: #34d399;">${escapeHtml(data.accuracy)}</strong>
                </div>
              </div>
            `;

            const wrapRect = svgWrap.getBoundingClientRect();
            const circle = ptElem.querySelector('.sec-chart-point');
            const circleRect = circle.getBoundingClientRect();

            const left = circleRect.left - wrapRect.left + circleRect.width / 2;
            const top = circleRect.top - wrapRect.top;

            tooltip.style.left = `${left}px`;
            tooltip.style.top = `${top}px`;
            tooltip.classList.add('tooltip-visible');

            if (circle) circle.classList.add('point-hovered');
          } catch (err) {
            console.error('Tooltip error', err);
          }
        });

        ptElem.addEventListener('mouseleave', () => {
          tooltip.classList.remove('tooltip-visible');
          const circle = ptElem.querySelector('.sec-chart-point');
          if (circle) circle.classList.remove('point-hovered');
        });
      });
    }
  }

  function render() {
    updateDateDisplayLabel();
    renderComparison();
    renderGraph();
    renderHistory();
    if (window.SectionalWeaknessTracker && typeof window.SectionalWeaknessTracker.render === 'function') {
      window.SectionalWeaknessTracker.render();
    }
    if (window.SectionalErrorLog && typeof window.SectionalErrorLog.render === 'function') {
      window.SectionalErrorLog.render();
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  return {
    init,
    render,
    onDateChanged
  };
})();

window.SectionalsManager = SectionalsManager;
