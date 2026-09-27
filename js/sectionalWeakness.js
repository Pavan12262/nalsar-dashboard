/**
 * sectionalWeakness.js - Sectional Weakness Tracker Engine
 * Analyzes daily sectional test history (Storage.getSectionals()) and sectional error entries
 * (Storage.getSectionalErrors()) to dynamically rank weakest sections, identify bottleneck topics,
 * track repeated mistakes, and prioritize revision topics.
 */

const SectionalWeaknessTracker = (() => {
  const SECTIONS = [
    { key: 'english', label: 'English Language', shortLabel: 'English', color: '#38bdf8', defaultMax: 24 },
    { key: 'gk', label: 'Current Affairs & GK', shortLabel: 'GK', color: '#fbbf24', defaultMax: 28 },
    { key: 'legal', label: 'Legal Reasoning', shortLabel: 'Legal', color: '#a855f7', defaultMax: 30 },
    { key: 'logical', label: 'Logical Reasoning', shortLabel: 'Logical', color: '#ec4899', defaultMax: 24 },
    { key: 'quant', label: 'Quantitative Techniques', shortLabel: 'Quant', color: '#10b981', defaultMax: 14 }
  ];

  function init() {
    setupEventListeners();
    render();
  }

  function setupEventListeners() {
    // Delegated click for Priority Topic cards / chips to jump to and filter Sectional Error Log
    const container = document.getElementById('secPriorityTopicsContainer');
    if (container) {
      container.addEventListener('click', (e) => {
        const topicBtn = e.target.closest('[data-filter-sec-topic]');
        if (topicBtn) {
          const topicName = topicBtn.getAttribute('data-filter-sec-topic');
          const sectionName = topicBtn.getAttribute('data-filter-sec-name');
          if (window.SectionalErrorLog) {
            window.SectionalErrorLog.filterByTopic(topicName, sectionName);
          }
        }
      });
    }
  }

  /**
   * Calculates section statistics strictly from real stored sectional logs and errors.
   */
  function calculateSectionMetrics() {
    const sectionals = Storage.getSectionals() || [];
    const sectionalErrors = Storage.getSectionalErrors() || [];

    const stats = SECTIONS.map(sec => {
      let totalScore = 0;
      let totalMaxScore = 0;
      let totalQuestions = 0;
      let totalAttempted = 0;
      let totalCorrect = 0;
      let totalWrong = 0;
      let totalUnattempted = 0;
      let daysWithData = 0;

      sectionals.forEach(entry => {
        const s = entry.sections && entry.sections[sec.key];
        if (s) {
          let dayHasData = false;
          if (typeof s.score === 'number' && !isNaN(s.score)) {
            totalScore += s.score;
            dayHasData = true;
          }
          const maxQ = typeof s.maxScore === 'number' ? s.maxScore : (typeof s.totalQuestions === 'number' ? s.totalQuestions : sec.defaultMax);
          totalMaxScore += maxQ;

          if (typeof s.totalQuestions === 'number' && !isNaN(s.totalQuestions)) {
            totalQuestions += s.totalQuestions;
          } else {
            totalQuestions += maxQ;
          }

          if (typeof s.attempted === 'number' && !isNaN(s.attempted)) {
            totalAttempted += s.attempted;
            dayHasData = true;
          }
          if (typeof s.correct === 'number' && !isNaN(s.correct)) {
            totalCorrect += s.correct;
            dayHasData = true;
          }
          if (typeof s.wrong === 'number' && !isNaN(s.wrong)) {
            totalWrong += s.wrong;
          } else if (typeof s.attempted === 'number' && typeof s.correct === 'number') {
            totalWrong += Math.max(0, s.attempted - s.correct);
          }
          if (typeof s.unattempted === 'number' && !isNaN(s.unattempted)) {
            totalUnattempted += s.unattempted;
          }

          if (dayHasData) daysWithData++;
        }
      });

      // Errors logged for this section
      const secErrors = sectionalErrors.filter(e => 
        e.subject && e.subject.toLowerCase() === sec.shortLabel.toLowerCase()
      );
      const errorCount = secErrors.length;
      const unrevisedErrorCount = secErrors.filter(e => (e.status || 'Unrevised') === 'Unrevised').length;

      const accuracyPct = totalAttempted > 0 ? (totalCorrect / totalAttempted) * 100 : 0;
      const attemptRatePct = totalQuestions > 0 ? (totalAttempted / totalQuestions) * 100 : 0;
      const avgScore = daysWithData > 0 ? (totalScore / daysWithData) : 0;
      const avgMax = daysWithData > 0 ? (totalMaxScore / daysWithData) : sec.defaultMax;
      const scorePct = avgMax > 0 ? (avgScore / avgMax) * 100 : 0;

      const hasData = daysWithData > 0 || totalAttempted > 0 || errorCount > 0;

      let statusKey = 'competent';
      let statusLabel = 'Competent';
      let statusBadgeClass = 'badge-moderate';

      if (!hasData || totalAttempted === 0) {
        statusKey = 'no-data';
        statusLabel = 'No Data Logged';
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
        ...sec,
        daysWithData,
        totalScore,
        totalMaxScore,
        avgScore,
        avgMax,
        scorePct,
        totalQuestions,
        totalAttempted,
        totalCorrect,
        totalWrong,
        totalUnattempted,
        accuracyPct,
        attemptRatePct,
        errorCount,
        unrevisedErrorCount,
        statusKey,
        statusLabel,
        statusBadgeClass,
        hasData
      };
    });

    // Rank from WEAKEST to STRONGEST:
    // Sections with real attempts come first: lowest accuracyPct ascending, then lowest attemptRatePct ascending.
    // Sections with no attempts placed at the bottom without invented stats.
    stats.sort((a, b) => {
      const aAttempts = a.totalAttempted || 0;
      const bAttempts = b.totalAttempted || 0;
      if (aAttempts === 0 && bAttempts > 0) return 1;
      if (aAttempts > 0 && bAttempts === 0) return -1;
      if (aAttempts === 0 && bAttempts === 0) return 0;

      if (Math.abs(a.accuracyPct - b.accuracyPct) > 0.1) {
        return a.accuracyPct - b.accuracyPct;
      }
      return a.attemptRatePct - b.attemptRatePct;
    });

    return stats;
  }

  /**
   * Aggregates sectional error topics and tracks recurring mistakes.
   */
  function calculateTopicMetrics() {
    const sectionalErrors = Storage.getSectionalErrors() || [];
    const topicMap = {};

    sectionalErrors.forEach(err => {
      if (!err.topic || !err.topic.trim()) return;
      const rawTopic = err.topic.trim();
      const normKey = rawTopic.toLowerCase();

      if (!topicMap[normKey]) {
        topicMap[normKey] = {
          topic: rawTopic,
          subject: err.subject || 'General',
          count: 0,
          unrevisedCount: 0,
          revisedCount: 0,
          masteredCount: 0,
          mistakeTypes: {},
          recentDate: err.date || ''
        };
      }

      const t = topicMap[normKey];
      t.count++;
      const st = err.status || 'Unrevised';
      if (st === 'Unrevised') t.unrevisedCount++;
      else if (st === 'Revised') t.revisedCount++;
      else if (st === 'Mastered') t.masteredCount++;

      if (err.mistakeType) {
        t.mistakeTypes[err.mistakeType] = (t.mistakeTypes[err.mistakeType] || 0) + 1;
      }

      if (err.date && (!t.recentDate || err.date > t.recentDate)) {
        t.recentDate = err.date;
      }
    });

    const topics = Object.values(topicMap);

    // Rank topics by weakness: (1) total mistakes descending, (2) unrevised count descending
    topics.sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return b.unrevisedCount - a.unrevisedCount;
    });

    return topics;
  }

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function render() {
    const sectionRankingContainer = document.getElementById('secWeaknessRankingContainer');
    const priorityTopicsContainer = document.getElementById('secPriorityTopicsContainer');
    const insightBanner = document.getElementById('secWeaknessInsightBanner');

    if (!sectionRankingContainer && !priorityTopicsContainer) return;

    const sectionStats = calculateSectionMetrics();
    const topicStats = calculateTopicMetrics();
    const totalSectionals = (Storage.getSectionals() || []).length;
    const totalErrors = (Storage.getSectionalErrors() || []).length;

    // 1. Overall Insight Banner
    if (insightBanner) {
      if (totalSectionals === 0 && totalErrors === 0) {
        insightBanner.innerHTML = `
          <div class="sec-insight-alert sec-insight-nodata font-mono">
            <span class="insight-icon">ℹ️</span>
            <span>No sectional history or error logs recorded yet. Log your daily marks or mistakes above to activate automated weakness tracking.</span>
          </div>
        `;
      } else {
        const sectionsWithAttempts = sectionStats.filter(s => s.totalAttempted > 0);
        const weakest = sectionsWithAttempts.length > 0 ? sectionsWithAttempts[0] : null;
        const repeatedTopics = topicStats.filter(t => t.count >= 2);

        let insightMsg = '';
        if (weakest && weakest.accuracyPct < 70) {
          insightMsg = `Primary Sectional Bottleneck: <strong style="color: ${weakest.color}">${weakest.label}</strong> with <strong>${weakest.accuracyPct.toFixed(1)}% accuracy</strong> and ${weakest.unrevisedErrorCount} unrevised errors.`;
        } else if (weakest) {
          insightMsg = `Current lowest sectional accuracy: <strong style="color: ${weakest.color}">${weakest.label}</strong> at <strong>${weakest.accuracyPct.toFixed(1)}%</strong>.`;
        } else {
          insightMsg = `Logged <strong>${totalSectionals} daily sectional sessions</strong> and <strong>${totalErrors} mistake notes</strong>.`;
        }

        let repeatAlert = '';
        if (repeatedTopics.length > 0) {
          repeatAlert = `<span class="sec-repeated-alert-badge font-mono">⚠️ ${repeatedTopics.length} Repeated Error Topic${repeatedTopics.length > 1 ? 's' : ''} Identified</span>`;
        }

        insightBanner.innerHTML = `
          <div class="sec-insight-alert font-mono">
            <div class="sec-insight-text">
              <span class="insight-icon">🎯</span>
              <span>${insightMsg}</span>
            </div>
            ${repeatAlert}
          </div>
        `;
      }
    }

    // 2. Weakest Sections Ranking Container
    if (sectionRankingContainer) {
      if (totalSectionals === 0 && totalErrors === 0) {
        sectionRankingContainer.innerHTML = `
          <div class="sec-empty-state-box">
            <div class="sec-empty-icon">📊</div>
            <p class="sec-empty-title">Insufficient Sectional Performance Data</p>
            <p class="sec-empty-subtitle">Daily sectional scores and attempts will automatically generate your weakest-to-strongest section hierarchy here.</p>
          </div>
        `;
      } else {
        let html = '<div class="sec-ranking-cards-list">';
        sectionStats.forEach((sec, idx) => {
          const hasAttempts = sec.totalAttempted > 0;
          const rankNum = idx + 1;
          const accuracyDisplay = hasAttempts ? `${sec.accuracyPct.toFixed(1)}%` : '—';
          const attemptRateDisplay = hasAttempts ? `${sec.attemptRatePct.toFixed(1)}%` : '—';
          const totalAttemptDisplay = hasAttempts ? `${sec.totalAttempted} / ${sec.totalQuestions}` : '0 attempted';

          html += `
            <div class="sec-ranking-row-card ${sec.statusKey === 'critical' ? 'card-critical-highlight' : ''}">
              <div class="sec-rank-badge font-mono">#${rankNum}</div>
              
              <div class="sec-rank-name-col">
                <div class="sec-rank-title-group">
                  <span class="sec-dot-indicator" style="background: ${sec.color};"></span>
                  <strong class="sec-rank-name">${escapeHtml(sec.label)}</strong>
                </div>
                <span class="sec-rank-status-tag ${sec.statusBadgeClass} font-mono">${sec.statusLabel}</span>
              </div>

              <!-- Accuracy Metric -->
              <div class="sec-rank-metric-col">
                <span class="sec-metric-kicker font-mono">ACCURACY</span>
                <strong class="sec-metric-main font-mono text-bright">${accuracyDisplay}</strong>
                <div class="sec-metric-bar-track">
                  <div class="sec-metric-bar-fill" style="width: ${hasAttempts ? Math.min(100, sec.accuracyPct) : 0}%; background: ${sec.color};"></div>
                </div>
              </div>

              <!-- Attempt Rate Metric -->
              <div class="sec-rank-metric-col">
                <span class="sec-metric-kicker font-mono">ATTEMPT RATE</span>
                <strong class="sec-metric-main font-mono text-muted">${attemptRateDisplay}</strong>
                <span class="sec-metric-sub font-mono">${totalAttemptDisplay}</span>
              </div>

              <!-- Mistakes & Unrevised Errors -->
              <div class="sec-rank-errors-col font-mono">
                <span class="sec-metric-kicker">SECTIONAL ERRORS</span>
                <div class="sec-err-counts-wrap">
                  <span class="sec-err-total-tag text-bright">${sec.errorCount} Total</span>
                  ${sec.unrevisedErrorCount > 0 ? `<span class="sec-err-unrev-tag text-amber">${sec.unrevisedErrorCount} Unrevised</span>` : ''}
                </div>
              </div>
            </div>
          `;
        });
        html += '</div>';
        sectionRankingContainer.innerHTML = html;
      }
    }

    // 3. Priority Topics for Revision & Repeated Errors
    if (priorityTopicsContainer) {
      if (topicStats.length === 0) {
        priorityTopicsContainer.innerHTML = `
          <div class="sec-empty-state-box">
            <div class="sec-empty-icon">🔍</div>
            <p class="sec-empty-title">No Sectional Error Topics Logged</p>
            <p class="sec-empty-subtitle">Use the Sectional Error Log below to track question mistakes. Repeated errors and revision bottlenecks will surface here automatically.</p>
          </div>
        `;
      } else {
        // Priority topics: unrevised mistakes first, repeated errors (count >= 2) emphasized
        let html = '<div class="sec-priority-topics-grid">';
        topicStats.slice(0, 8).forEach(t => {
          const isRepeated = t.count >= 2;
          const topMistakeType = Object.entries(t.mistakeTypes).sort((a, b) => b[1] - a[1])[0];
          const mistakeTypeLabel = topMistakeType ? topMistakeType[0] : 'Error';

          const secObj = SECTIONS.find(s => s.shortLabel.toLowerCase() === t.subject.toLowerCase());
          const brandColor = secObj ? secObj.color : '#a855f7';

          html += `
            <div class="sec-priority-topic-card ${isRepeated ? 'sec-topic-repeated-border' : ''}">
              <div class="sec-topic-card-top">
                <div class="sec-topic-badges">
                  <span class="sec-topic-sec-badge font-mono" style="color: ${brandColor}; background: ${brandColor}18; border-color: ${brandColor}38;">
                    ${escapeHtml(t.subject)}
                  </span>
                  ${isRepeated ? `<span class="sec-repeated-flag font-mono">⚠️ REPEATED (${t.count}x)</span>` : `<span class="sec-single-flag font-mono">${t.count} Error</span>`}
                </div>
                <div class="sec-topic-status-counts font-mono">
                  ${t.unrevisedCount > 0 ? `<span class="sec-unrevised-dot text-amber" title="${t.unrevisedCount} Unrevised mistakes">● ${t.unrevisedCount} unrevised</span>` : '<span class="sec-revised-dot text-emerald">✓ all revised</span>'}
                </div>
              </div>

              <h4 class="sec-topic-card-title">${escapeHtml(t.topic)}</h4>

              <div class="sec-topic-card-meta font-mono">
                <span class="text-muted">Dominant Mistake:</span>
                <span class="sec-mistake-type-pill">${escapeHtml(mistakeTypeLabel)}</span>
              </div>

              <div class="sec-topic-card-footer">
                <button type="button" class="btn btn-secondary btn-xs sec-filter-topic-btn font-mono" data-filter-sec-topic="${escapeHtml(t.topic)}" data-filter-sec-name="${escapeHtml(t.subject)}" title="Filter Sectional Error Log to this topic">
                  <span>Review in Log</span>
                  <span aria-hidden="true">&rarr;</span>
                </button>
              </div>
            </div>
          `;
        });
        html += '</div>';
        priorityTopicsContainer.innerHTML = html;
      }
    }
  }

  return {
    init,
    render,
    calculateSectionMetrics,
    calculateTopicMetrics
  };
})();

window.SectionalWeaknessTracker = SectionalWeaknessTracker;
