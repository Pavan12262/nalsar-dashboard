/**
 * weakness.js - Weakness Tracker & Priority Topics Analysis Engine
 * Analyzes stored mock tests and error log entries to detect accuracy bottlenecks,
 * ranks subjects from weakest to strongest, and surfaces recurring mistake topics.
 */

const WeaknessTracker = (() => {
  const SUBJECTS = [
    { key: 'logical', label: 'Logical Reasoning', shortLabel: 'Logical', badgeClass: 'subject-logical', defaultMax: 24 },
    { key: 'gk', label: 'Current Affairs & GK', shortLabel: 'GK', badgeClass: 'subject-gk', defaultMax: 28 },
    { key: 'legal', label: 'Legal Reasoning', shortLabel: 'Legal', badgeClass: 'subject-legal', defaultMax: 30 },
    { key: 'english', label: 'English Language', shortLabel: 'English', badgeClass: 'subject-english', defaultMax: 24 },
    { key: 'quant', label: 'Quantitative Techniques', shortLabel: 'Quant', badgeClass: 'subject-quant', defaultMax: 14 }
  ];

  function init() {
    setupEventListeners();
    render();
  }

  function setupEventListeners() {
    // Delegated click for Priority Topic chips/cards to filter Error Log
    const container = document.getElementById('priorityTopicsContainer');
    if (container) {
      container.addEventListener('click', (e) => {
        const topicBtn = e.target.closest('[data-filter-topic]');
        if (topicBtn) {
          const topicName = topicBtn.getAttribute('data-filter-topic');
          const subject = topicBtn.getAttribute('data-filter-subject');
          filterErrorNotebookByTopic(topicName, subject);
        }
      });
    }
  }

  function filterErrorNotebookByTopic(topicName, subject) {
    const searchInput = document.getElementById('errorSearchInput');
    const errorSection = document.getElementById('section-errors');

    // If subject filter is available, set it
    if (subject) {
      const filterPill = document.querySelector(`#errorFilterTabs .filter-pill[data-filter="${subject}"]`);
      if (filterPill) filterPill.click();
    }

    if (searchInput) {
      searchInput.value = topicName;
      searchInput.dispatchEvent(new Event('input'));
    }

    if (errorSection) {
      errorSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  /**
   * Calculates subject statistics strictly from real stored data.
   */
  function calculateSubjectMetrics() {
    const mocks = Storage.getMocks() || [];
    const errors = Storage.getErrors() || [];

    const subjectStats = SUBJECTS.map(subj => {
      let totalScore = 0;
      let totalMaxScore = 0;
      let totalAttempted = 0;
      let totalCorrect = 0;
      let totalWrong = 0;
      let recordedMocksCount = 0;

      mocks.forEach(mock => {
        const sec = mock.sections && mock.sections[subj.key];
        if (sec) {
          let hasData = false;
          if (typeof sec.score === 'number' && !isNaN(sec.score)) {
            totalScore += sec.score;
            hasData = true;
          }
          const maxVal = typeof sec.maxScore === 'number' ? sec.maxScore : (typeof sec.totalQuestions === 'number' ? sec.totalQuestions : subj.defaultMax);
          totalMaxScore += maxVal;

          if (typeof sec.attempted === 'number' && !isNaN(sec.attempted)) {
            totalAttempted += sec.attempted;
            hasData = true;
          }
          if (typeof sec.correct === 'number' && !isNaN(sec.correct)) {
            totalCorrect += sec.correct;
            hasData = true;
          }
          if (typeof sec.wrong === 'number' && !isNaN(sec.wrong)) {
            totalWrong += sec.wrong;
          } else if (typeof sec.attempted === 'number' && typeof sec.correct === 'number') {
            totalWrong += Math.max(0, sec.attempted - sec.correct);
          }

          if (hasData) recordedMocksCount++;
        }
      });

      // Number of logged error notes for this subject in the Error Log
      const loggedMistakes = errors.filter(e => 
        e.subject && e.subject.toLowerCase() === subj.shortLabel.toLowerCase()
      ).length;

      const avgScore = recordedMocksCount > 0 ? (totalScore / recordedMocksCount) : 0;
      const avgMax = recordedMocksCount > 0 ? (totalMaxScore / recordedMocksCount) : subj.defaultMax;
      const scorePct = avgMax > 0 ? (avgScore / avgMax) * 100 : 0;

      const accuracyPct = totalAttempted > 0 ? (totalCorrect / totalAttempted) * 100 : 0;
      const attemptRatePct = totalMaxScore > 0 ? (totalAttempted / totalMaxScore) * 100 : 0;

      // Strength/Weakness indicator
      let statusKey = 'moderate';
      let statusLabel = 'Competent';
      let statusBadgeClass = 'badge-moderate';

      if (totalAttempted === 0 && recordedMocksCount === 0) {
        statusKey = 'no-data';
        statusLabel = 'No Data';
        statusBadgeClass = 'badge-nodata';
      } else if (accuracyPct < 65) {
        statusKey = 'critical';
        statusLabel = 'Critical Weakness';
        statusBadgeClass = 'badge-critical';
      } else if (accuracyPct < 75) {
        statusKey = 'focus';
        statusLabel = 'Needs Focus';
        statusBadgeClass = 'badge-warning';
      } else if (accuracyPct < 85) {
        statusKey = 'competent';
        statusLabel = 'Competent';
        statusBadgeClass = 'badge-moderate';
      } else {
        statusKey = 'strong';
        statusLabel = 'Strong Area';
        statusBadgeClass = 'badge-strong';
      }

      return {
        ...subj,
        totalScore,
        recordedMocksCount,
        avgScore,
        avgMax,
        scorePct,
        totalAttempted,
        totalCorrect,
        totalWrong,
        accuracyPct,
        attemptRatePct,
        loggedMistakes,
        statusKey,
        statusLabel,
        statusBadgeClass,
        hasData: recordedMocksCount > 0 || totalAttempted > 0 || loggedMistakes > 0
      };
    });

    // Automatically rank from WEAKEST to STRONGEST
    // Primary: Accuracy % (ascending, lower accuracy is weaker)
    // Secondary: Attempt Rate % (ascending)
    subjectStats.sort((a, b) => {
      if (!a.hasData && b.hasData) return 1;
      if (a.hasData && !b.hasData) return -1;
      if (Math.abs(a.accuracyPct - b.accuracyPct) > 0.01) {
        return a.accuracyPct - b.accuracyPct;
      }
      return a.attemptRatePct - b.attemptRatePct;
    });

    return subjectStats;
  }

  /**
   * Aggregates recurring error topics from Error Log.
   */
  function calculatePriorityTopics() {
    const errors = Storage.getErrors() || [];
    const topicMap = {};

    errors.forEach(err => {
      if (!err.topic || !err.topic.trim()) return;
      const rawTopic = err.topic.trim();
      const normKey = rawTopic.toLowerCase();

      if (!topicMap[normKey]) {
        topicMap[normKey] = {
          topic: rawTopic,
          subject: err.subject || 'General',
          count: 0,
          errorIds: []
        };
      }
      topicMap[normKey].count++;
      topicMap[normKey].errorIds.push(err.id);
    });

    const topics = Object.values(topicMap);
    // Sort descending by frequency
    topics.sort((a, b) => b.count - a.count);

    return topics;
  }

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function render() {
    const weakAreasContainer = document.getElementById('weakAreasContainer');
    const priorityTopicsContainer = document.getElementById('priorityTopicsContainer');
    const weaknessBannerEl = document.getElementById('weaknessInsightBanner');

    if (!weakAreasContainer && !priorityTopicsContainer) return;

    const subjects = calculateSubjectMetrics();
    const priorityTopics = calculatePriorityTopics();
    const totalMocks = (Storage.getMocks() || []).length;
    const totalErrors = (Storage.getErrors() || []).length;

    // Render Weak Areas (Subject Ranking)
    if (weakAreasContainer) {
      if (totalMocks === 0 && totalErrors === 0) {
        weakAreasContainer.innerHTML = `
          <div class="empty-weakness-state">
            <div class="empty-icon">🎯</div>
            <p class="empty-title">No Performance Data Yet</p>
            <p class="empty-subtitle">Log mock test sectional scores to reveal your weakest subjects, accuracy levels, and attempt rates.</p>
          </div>
        `;
      } else {
        let html = '<div class="weakness-subjects-list">';
        subjects.forEach((subj, idx) => {
          const rankNum = idx + 1;
          const rankBadgeClass = rankNum === 1 ? 'rank-badge-weakest' : (rankNum === 2 ? 'rank-badge-secondary' : 'rank-badge-normal');
          const accStr = subj.hasData && subj.totalAttempted > 0 ? `${subj.accuracyPct.toFixed(1)}%` : '—';
          const attStr = subj.hasData && subj.avgMax > 0 ? `${subj.attemptRatePct.toFixed(1)}%` : '—';
          const scoreStr = subj.hasData && subj.recordedMocksCount > 0 ? `${subj.avgScore.toFixed(1)} / ${subj.avgMax}` : '—';
          const progressWidth = subj.hasData && subj.totalAttempted > 0 ? Math.min(100, Math.max(0, subj.accuracyPct)) : 0;
          
          let barGradient = 'linear-gradient(90deg, #f43f5e 0%, #fb7185 100%)';
          if (subj.accuracyPct >= 85) {
            barGradient = 'linear-gradient(90deg, #10b981 0%, #34d399 100%)';
          } else if (subj.accuracyPct >= 75) {
            barGradient = 'linear-gradient(90deg, #06b6d4 0%, #38bdf8 100%)';
          } else if (subj.accuracyPct >= 65) {
            barGradient = 'linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%)';
          }

          html += `
            <div class="weakness-subject-card" data-subject="${subj.key}">
              <div class="weakness-card-top">
                <div class="weakness-card-brand">
                  <span class="weakness-rank-pill ${rankBadgeClass} font-mono">#${rankNum}</span>
                  <div class="weakness-title-wrap">
                    <div class="weakness-subject-name-row">
                      <span class="subject-badge ${subj.badgeClass}">${subj.shortLabel}</span>
                      <h4 class="weakness-subject-title">${subj.label}</h4>
                    </div>
                  </div>
                </div>
                <div class="weakness-status-wrap">
                  <span class="weakness-status-badge ${subj.statusBadgeClass}">${subj.statusLabel}</span>
                </div>
              </div>

              <!-- Accuracy Progress Bar -->
              <div class="weakness-progress-row">
                <div class="weakness-progress-meta">
                  <span class="weakness-progress-label">ACCURACY RATE</span>
                  <span class="weakness-progress-val font-mono">${accStr}</span>
                </div>
                <div class="weakness-bar-track">
                  <div class="weakness-bar-fill" style="width: ${progressWidth}%; background: ${barGradient};"></div>
                </div>
              </div>

              <!-- Metric Pills Grid -->
              <div class="weakness-metrics-grid">
                <div class="weakness-metric-box">
                  <span class="w-metric-label">AVERAGE SCORE</span>
                  <span class="w-metric-val font-mono">${scoreStr}</span>
                </div>
                <div class="weakness-metric-box">
                  <span class="w-metric-label">ATTEMPT RATE</span>
                  <span class="w-metric-val font-mono">${attStr}</span>
                </div>
                <div class="weakness-metric-box">
                  <span class="w-metric-label">LOGGED ERRORS</span>
                  <span class="w-metric-val font-mono ${subj.loggedMistakes > 0 ? 'text-amber' : ''}">${subj.loggedMistakes} ${subj.loggedMistakes === 1 ? 'error' : 'errors'}</span>
                </div>
                <div class="weakness-metric-box">
                  <span class="w-metric-label">MOCK MISTAKES</span>
                  <span class="w-metric-val font-mono">${subj.totalWrong} wrong</span>
                </div>
              </div>
            </div>
          `;
        });
        html += '</div>';
        weakAreasContainer.innerHTML = html;
      }
    }

    // Render Priority Topics
    if (priorityTopicsContainer) {
      if (priorityTopics.length === 0) {
        priorityTopicsContainer.innerHTML = `
          <div class="empty-priority-topics">
            <div class="empty-topic-icon">📋</div>
            <p class="empty-title">No Error Topics Logged Yet</p>
            <p class="empty-subtitle">Log questions into the Error Log to identify repeating mistakes and priority topics to review.</p>
          </div>
        `;
      } else {
        const topTopics = priorityTopics.slice(0, 8); // Top 8 recurring topics
        const maxTopicCount = Math.max(...topTopics.map(t => t.count), 1);

        let html = '<div class="priority-topics-list">';
        topTopics.forEach(item => {
          const subjectClass = `subject-${(item.subject || 'other').toLowerCase()}`;
          const pct = Math.min(100, Math.round((item.count / maxTopicCount) * 100));
          const isHighFrequency = item.count >= 2;

          html += `
            <div class="priority-topic-item ${isHighFrequency ? 'high-frequency-item' : ''}">
              <div class="priority-topic-header">
                <div class="priority-topic-meta">
                  <span class="subject-badge ${subjectClass}">${item.subject}</span>
                  <span class="priority-topic-title" title="${escapeHtml(item.topic)}">${escapeHtml(item.topic)}</span>
                </div>
                <div class="priority-topic-right">
                  <span class="priority-count-badge font-mono ${isHighFrequency ? 'count-hot' : ''}">
                    ${item.count} ${item.count === 1 ? 'error' : 'errors'}
                  </span>
                  <button type="button" class="btn btn-secondary btn-xs priority-filter-btn" 
                          data-filter-topic="${escapeHtml(item.topic)}" 
                          data-filter-subject="${escapeHtml(item.subject)}"
                          title="View all errors for this topic in Error Log">
                    View
                  </button>
                </div>
              </div>
              <div class="priority-topic-bar-track">
                <div class="priority-topic-bar-fill" style="width: ${pct}%;"></div>
              </div>
            </div>
          `;
        });
        html += '</div>';
        priorityTopicsContainer.innerHTML = html;
      }
    }

    // Update Weakness Insight Banner
    if (weaknessBannerEl) {
      if (subjects.length > 0 && subjects[0].hasData) {
        const weakest = subjects[0];
        const topTopic = priorityTopics.length > 0 ? priorityTopics[0] : null;
        let topicText = '';
        if (topTopic) {
          topicText = ` • Priority Topic: <strong class="text-bright">${escapeHtml(topTopic.topic)}</strong> (${topTopic.count} errors)`;
        }

        weaknessBannerEl.innerHTML = `
          <div class="weakness-banner-content">
            <span class="weakness-banner-icon">⚠️</span>
            <div class="weakness-banner-text">
              <span>Primary Bottleneck: <strong class="text-bright">${weakest.label}</strong> with lowest accuracy (<span class="font-mono text-bright">${weakest.accuracyPct.toFixed(1)}%</span>)${topicText}</span>
            </div>
          </div>
        `;
        weaknessBannerEl.style.display = 'block';
      } else {
        weaknessBannerEl.style.display = 'none';
      }
    }
  }

  return {
    init,
    render,
    calculateSubjectMetrics,
    calculatePriorityTopics
  };
})();

// Export to window
if (typeof window !== 'undefined') {
  window.WeaknessTracker = WeaknessTracker;
}
