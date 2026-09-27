/**
 * charts.js - Lightweight, Crisp SVG Data Visualizations
 * Provides Mock Score Progress Line Graph, Today's Task Breakdown, and Weekly Study Bar Charts.
 */

const Charts = (() => {

  /**
   * Render the Overall Mock Performance Line Graph
   * Strictly tracks overall mock score progression over time.
   * @param {string} containerId - Target element ID
   * @param {Array} mocks - Array of mock objects
   */
  function renderMockGraph(containerId, mocks) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Filter mocks to sort chronologically by date and createdAt
    const sortedMocks = [...mocks].sort((a, b) => {
      const dDiff = new Date(a.date) - new Date(b.date);
      return dDiff !== 0 ? dDiff : (a.createdAt || 0) - (b.createdAt || 0);
    });

    // Extract valid overall score points
    const validPoints = [];
    sortedMocks.forEach(m => {
      if (typeof m.score === 'number' && !isNaN(m.score)) {
        const maxScore = m.maxScore || 120;
        const pct = ((m.score / maxScore) * 100).toFixed(1);
        validPoints.push({
          mock: m,
          label: m.name,
          date: m.date,
          score: m.score,
          maxScore: maxScore,
          percentage: pct
        });
      }
    });

    if (validPoints.length === 0) {
      container.innerHTML = `
        <div class="empty-chart-state">
          <div class="empty-icon">📈</div>
          <p class="empty-title">No mock tests recorded yet</p>
          <p class="empty-subtitle">Add a mock test above to see your overall score progression curve.</p>
        </div>
      `;
      return;
    }

    // Chart Dimensions
    const width = 800;
    const height = 300;
    const padding = { top: 35, right: 35, bottom: 45, left: 55 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    // Y-Scale calculations
    const minVal = Math.min(...validPoints.map(p => p.score));
    const maxVal = Math.max(...validPoints.map(p => p.score));
    
    // Create sensible y-axis bounds
    let yMin = Math.max(0, Math.floor(minVal * 0.85));
    let yMax = Math.ceil(maxVal * 1.15);
    if (yMin === yMax) {
      yMin = Math.max(0, yMin - 10);
      yMax = yMax + 10;
    }
    // Round to nice ticks
    const yRange = yMax - yMin;
    const tickCount = 4;
    const yTicks = [];
    for (let i = 0; i <= tickCount; i++) {
      yTicks.push(Math.round(yMin + (yRange / tickCount) * i));
    }

    const getY = (val) => {
      return padding.top + chartH - ((val - yMin) / (yMax - yMin)) * chartH;
    };

    const getX = (index) => {
      if (validPoints.length === 1) {
        return padding.left + chartW / 2;
      }
      return padding.left + (index / (validPoints.length - 1)) * chartW;
    };

    // Build SVG Grid & Axis lines
    let gridSvg = '';
    yTicks.forEach(tickVal => {
      const yPos = getY(tickVal);
      gridSvg += `
        <line x1="${padding.left}" y1="${yPos}" x2="${width - padding.right}" y2="${yPos}" class="chart-grid-line" />
        <text x="${padding.left - 10}" y="${yPos + 4}" text-anchor="end" class="chart-axis-label">${tickVal}</text>
      `;
    });

    // Build Line Path and Dots
    let pathD = '';
    let areaD = '';
    let dotsSvg = '';

    validPoints.forEach((pt, i) => {
      const x = getX(i);
      const y = getY(pt.score);

      if (i === 0) {
        pathD += `M ${x} ${y}`;
        areaD += `M ${x} ${padding.top + chartH} L ${x} ${y}`;
      } else {
        pathD += ` L ${x} ${y}`;
        areaD += ` L ${x} ${y}`;
      }

      // X Axis Label
      // Format date short e.g. "10 Sep"
      const dateParts = pt.date ? pt.date.split('-') : [];
      let dateShort = pt.date;
      if (dateParts.length === 3) {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const mIdx = parseInt(dateParts[1], 10) - 1;
        dateShort = `${parseInt(dateParts[2], 10)} ${monthNames[mIdx] || ''}`;
      }

      gridSvg += `
        <text x="${x}" y="${height - padding.bottom + 20}" text-anchor="middle" class="chart-axis-label-x">
          <tspan x="${x}" dy="0" font-weight="600">${pt.label}</tspan>
          <tspan x="${x}" dy="14" fill="var(--text-muted)" font-size="10">${dateShort}</tspan>
        </text>
      `;

      // Interactive Point
      dotsSvg += `
        <g class="chart-point-group" data-index="${i}">
          <circle cx="${x}" cy="${y}" r="14" class="chart-point-hitarea" />
          <circle cx="${x}" cy="${y}" r="5" class="chart-point-dot" />
          <circle cx="${x}" cy="${y}" r="2" class="chart-point-inner" />
        </g>
      `;
    });

    if (validPoints.length > 1) {
      const lastX = getX(validPoints.length - 1);
      areaD += ` L ${lastX} ${padding.top + chartH} Z`;
    }

    // Analytics summary metrics
    const latestScore = validPoints[validPoints.length - 1].score;
    const highestScore = maxVal;
    const lowestScore = minVal;
    const firstScore = validPoints[0].score;
    const delta = latestScore - firstScore;
    const deltaSign = delta > 0 ? `+${delta}` : `${delta}`;
    const deltaClass = delta > 0 ? 'trend-up' : delta < 0 ? 'trend-down' : 'trend-neutral';

    const svgHtml = `
      <div class="chart-meta-bar">
        <div class="chart-stat">
          <span class="stat-label">LATEST</span>
          <span id="chartStatLatest" class="stat-val font-mono">${latestScore}</span>
        </div>
        <div class="chart-stat">
          <span class="stat-label">HIGHEST</span>
          <span id="chartStatHighest" class="stat-val font-mono">${highestScore}</span>
        </div>
        <div class="chart-stat">
          <span class="stat-label">LOWEST</span>
          <span id="chartStatLowest" class="stat-val font-mono">${lowestScore}</span>
        </div>
        <div class="chart-stat">
          <span class="stat-label">OVERALL TRAJECTORY</span>
          <span class="stat-val font-mono ${deltaClass}">
            ${deltaSign} ${delta > 0 ? '▲' : delta < 0 ? '▼' : '–'}
          </span>
        </div>
      </div>

      <div class="svg-chart-wrapper">
        <svg viewBox="0 0 ${width} ${height}" class="chart-svg" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#8b5cf6" stop-opacity="0.35" />
              <stop offset="60%" stop-color="#6366f1" stop-opacity="0.10" />
              <stop offset="100%" stop-color="#8b5cf6" stop-opacity="0.0" />
            </linearGradient>
          </defs>
          ${validPoints.length > 1 ? `<path d="${areaD}" fill="url(#chartGradient)" class="chart-area-path" />` : ''}
          <g class="chart-grid">${gridSvg}</g>
          ${validPoints.length > 1 ? `<path d="${pathD}" class="chart-line-path" />` : ''}
          <g class="chart-points">${dotsSvg}</g>
        </svg>
        <div id="chartTooltip" class="chart-tooltip"></div>
      </div>
    `;

    container.innerHTML = svgHtml;

    if (window.animateNumber) {
      const latEl = container.querySelector('#chartStatLatest');
      const highEl = container.querySelector('#chartStatHighest');
      const lowEl = container.querySelector('#chartStatLowest');
      if (latEl) window.animateNumber(latEl, 0, latestScore, 600);
      if (highEl) window.animateNumber(highEl, 0, highestScore, 600);
      if (lowEl) window.animateNumber(lowEl, 0, lowestScore, 600);
    }

    // Attach Hover Tooltip Handlers
    const tooltip = container.querySelector('#chartTooltip');
    const pointGroups = container.querySelectorAll('.chart-point-group');

    pointGroups.forEach(group => {
      group.addEventListener('mouseenter', (e) => {
        const idx = parseInt(group.getAttribute('data-index'), 10);
        const pt = validPoints[idx];
        if (!pt) return;

        tooltip.innerHTML = `
          <div class="tooltip-header font-mono"><strong>${pt.label}</strong> • ${pt.date}</div>
          <div class="tooltip-body">
            <div>Score: <strong class="tooltip-score font-mono">${pt.score}</strong> / ${pt.maxScore}</div>
            <div class="tooltip-sub font-mono">${pt.percentage}% achieved</div>
          </div>
        `;

        tooltip.classList.add('visible');

        // Position tooltip relative to container
        const rect = group.querySelector('.chart-point-dot').getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const left = rect.left - containerRect.left + (rect.width / 2);
        const top = rect.top - containerRect.top - 12;

        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;
      });

      group.addEventListener('mouseleave', () => {
        tooltip.classList.remove('visible');
      });
    });
  }

  /**
   * Render Today's Task Breakdown (Horizontal proportional bars)
   * Example:
   * Legal   █████████████ 1h 20m
   * GK      ██████████    1h 10m
   */
  function renderTodayBreakdown(containerId, sessions, todayDateStr) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Filter sessions for today
    const todaySessions = sessions.filter(s => s.date === todayDateStr);

    if (todaySessions.length === 0) {
      container.innerHTML = `
        <div class="empty-breakdown">
          <p class="empty-muted">No study sessions logged for today yet.</p>
          <p class="empty-hint">Start the timer or log manual time above to see your task distribution.</p>
        </div>
      `;
      return;
    }

    // Aggregate by parent task and subtask
    const taskMap = {};
    let totalSeconds = 0;

    todaySessions.forEach(s => {
      const parentTask = s.taskName || 'General';
      const subtask = s.subtaskName || 'General';
      const dur = s.duration || 0;

      if (!taskMap[parentTask]) {
        taskMap[parentTask] = {
          name: parentTask,
          total: 0,
          subtasks: {}
        };
      }

      taskMap[parentTask].total += dur;
      taskMap[parentTask].subtasks[subtask] = (taskMap[parentTask].subtasks[subtask] || 0) + dur;
      totalSeconds += dur;
    });

    // Sort parent tasks descending by duration
    const sortedTasks = Object.values(taskMap).sort((a, b) => b.total - a.total);
    const maxDuration = sortedTasks[0]?.total || 1;

    let html = `
      <div class="breakdown-header">
        <span class="breakdown-title">Today's Total: <strong class="font-mono">${StudyTimer.formatDurationHuman(totalSeconds, true)}</strong></span>
        <span class="breakdown-count font-mono">${todaySessions.length} session${todaySessions.length > 1 ? 's' : ''}</span>
      </div>
      <div class="breakdown-list">
    `;

    sortedTasks.forEach((item, idx) => {
      const pctOfTotal = Math.round((item.total / (totalSeconds || 1)) * 100);
      const barPct = Math.max(4, Math.round((item.total / maxDuration) * 100));

      const subEntries = Object.entries(item.subtasks).sort((a, b) => b[1] - a[1]);
      const hasSubtasks = subEntries.length > 0;
      const subCountText = subEntries.length === 1 && subEntries[0][0] === 'General'
        ? ''
        : `<span class="subtask-count-chip">${subEntries.length} subtopic${subEntries.length > 1 ? 's' : ''} ▾</span>`;

      html += `
        <div class="breakdown-item-wrapper" data-task-index="${idx}">
          <div class="breakdown-row ${hasSubtasks ? 'clickable' : ''}">
            <div class="breakdown-task-info">
              <span class="breakdown-task-name">
                ${escapeHtml(item.name)} ${subCountText}
              </span>
              <span class="breakdown-task-time font-mono">${StudyTimer.formatDurationHuman(item.total)} <span class="breakdown-pct">(${pctOfTotal}%)</span></span>
            </div>
            <div class="breakdown-bar-bg">
              <div class="breakdown-bar-fill" style="width: ${barPct}%;"></div>
            </div>
          </div>
      `;

      // Subtasks list container
      if (hasSubtasks) {
        html += `<div class="subtasks-dropdown-list">`;
        subEntries.forEach(([subName, subDur]) => {
          const subPctOfParent = Math.round((subDur / (item.total || 1)) * 100);
          const subBarPct = Math.max(3, Math.round((subDur / (item.total || 1)) * 100));

          html += `
            <div class="subtask-breakdown-row">
              <div class="subtask-info-left">
                <span class="subtask-tree-branch">└─</span>
                <span class="subtask-name">${escapeHtml(subName)}</span>
              </div>
              <div class="subtask-info-right font-mono">
                ${StudyTimer.formatDurationHuman(subDur)} <span class="subtask-pct">(${subPctOfParent}%)</span>
              </div>
              <div class="subtask-bar-track">
                <div class="subtask-bar-fill" style="width: ${subBarPct}%;"></div>
              </div>
            </div>
          `;
        });
        html += `</div>`;
      }

      html += `</div>`;
    });

    html += `</div>`;
    container.innerHTML = html;

    // Attach expand/collapse toggles
    container.querySelectorAll('.breakdown-row.clickable').forEach(row => {
      row.addEventListener('click', () => {
        const parentWrapper = row.closest('.breakdown-item-wrapper');
        if (parentWrapper) {
          parentWrapper.classList.toggle('expanded');
        }
      });
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /**
   * Render Last 7 Days Weekly Study Bar Chart
   */
  function renderWeeklyStudyChart(containerId, sessions) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const today = new Date();
    const days = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Collect last 7 calendar days
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = Storage.getLocalDateString(d);
      const dayName = dayNames[d.getDay()];
      const isToday = i === 0;

      // Calculate total duration for this day
      const daySeconds = sessions
        .filter(s => s.date === dateStr)
        .reduce((sum, s) => sum + (s.duration || 0), 0);

      days.push({
        dateStr,
        dayName,
        isToday,
        seconds: daySeconds,
        hours: (daySeconds / 3600)
      });
    }

    const maxSeconds = Math.max(3600, ...days.map(d => d.seconds)); // Minimum scale of 1 hour

    let html = `
      <div class="weekly-bars-container">
    `;

    days.forEach(d => {
      const heightPct = Math.round((d.seconds / maxSeconds) * 100);
      const formatted = StudyTimer.formatDurationHuman(d.seconds);
      const barClass = d.isToday ? 'weekly-bar-today' : 'weekly-bar-past';
      const hasStudied = d.seconds > 0;

      html += `
        <div class="weekly-col ${d.isToday ? 'col-today' : ''}">
          <div class="weekly-time-label font-mono">${formatted}</div>
          <div class="weekly-bar-track">
            <div class="weekly-bar-fill ${barClass} ${hasStudied ? 'has-studied' : 'zero-studied'}" style="height: ${Math.max(hasStudied ? 6 : 2, heightPct)}%;"></div>
          </div>
          <div class="weekly-day-label ${d.isToday ? 'day-today' : ''}">${d.dayName}</div>
          <div class="weekly-date-sub font-mono">${d.dateStr.slice(5)}</div>
        </div>
      `;
    });

    html += `</div>`;
    container.innerHTML = html;
  }

  return {
    renderMockGraph,
    renderTodayBreakdown,
    renderWeeklyStudyChart
  };
})();
