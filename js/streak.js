/**
 * streak.js - Full-Screen Study Consistency & Streak Analytics
 * Implements configurable study threshold (default 30 min), historical longest streak,
 * real-time streak calculations, and interactive statistics display.
 */

const StreakManager = (() => {
  function init() {
    setupEventListeners();
    render();
  }

  function setupEventListeners() {
    const thresholdInput = document.getElementById('streakThresholdInput');
    if (thresholdInput) {
      thresholdInput.value = Storage.getStreakThresholdMinutes();
      thresholdInput.addEventListener('change', () => {
        const val = parseInt(thresholdInput.value, 10);
        if (!isNaN(val) && val >= 1) {
          Storage.setStreakThresholdMinutes(val);
          render();
          if (window.App && typeof window.App.updateMetrics === 'function') {
            window.App.updateMetrics();
          }
        }
      });
    }
  }

  /**
   * Aggregate all sessions into a dictionary: { 'YYYY-MM-DD': { totalSeconds, tasks: { name: seconds } } }
   */
  function getDailyStudyMap() {
    const sessions = Storage.getSessions();
    const map = {};

    sessions.forEach(s => {
      if (!s.date || typeof s.duration !== 'number' || s.duration <= 0) return;
      if (!map[s.date]) {
        map[s.date] = { totalSeconds: 0, tasks: {} };
      }
      map[s.date].totalSeconds += s.duration;
      const tName = s.taskName || 'General';
      map[s.date].tasks[tName] = (map[s.date].tasks[tName] || 0) + s.duration;
    });

    return map;
  }

  /**
   * Calculate all streak analytics based on the configured threshold
   */
  function calculateAnalytics() {
    const thresholdMin = Storage.getStreakThresholdMinutes();
    const thresholdSec = thresholdMin * 60;
    const dailyMap = getDailyStudyMap();

    const todayStr = Storage.getLocalDateString();
    const dMinus = (days) => {
      const d = new Date();
      d.setDate(d.getDate() - days);
      return Storage.getLocalDateString(d);
    };

    // 1. Current Streak
    let currentStreak = 0;
    const todaySec = dailyMap[todayStr]?.totalSeconds || 0;

    if (todaySec >= thresholdSec) {
      currentStreak = 1;
      let dayIdx = 1;
      while ((dailyMap[dMinus(dayIdx)]?.totalSeconds || 0) >= thresholdSec) {
        currentStreak++;
        dayIdx++;
      }
    } else {
      // Check yesterday so student doesn't lose streak before studying today
      const yesterdayStr = dMinus(1);
      const yesterdaySec = dailyMap[yesterdayStr]?.totalSeconds || 0;
      if (yesterdaySec >= thresholdSec) {
        currentStreak = 1;
        let dayIdx = 2;
        while ((dailyMap[dMinus(dayIdx)]?.totalSeconds || 0) >= thresholdSec) {
          currentStreak++;
          dayIdx++;
        }
      } else {
        currentStreak = 0;
      }
    }

    // 2. Longest Streak
    const allDates = Object.keys(dailyMap).sort();
    let longestStreak = 0;
    if (allDates.length > 0) {
      const minDate = new Date(allDates[0] + 'T00:00:00');
      const maxDate = new Date(todayStr + 'T00:00:00');
      let tempStreak = 0;

      const cur = new Date(minDate);
      while (cur <= maxDate) {
        const dStr = Storage.getLocalDateString(cur);
        const secs = dailyMap[dStr]?.totalSeconds || 0;
        if (secs >= thresholdSec) {
          tempStreak++;
          if (tempStreak > longestStreak) longestStreak = tempStreak;
        } else {
          tempStreak = 0;
        }
        cur.setDate(cur.getDate() + 1);
      }
    }

    // 3. Total Study Days & Hours
    const studyDayEntries = Object.entries(dailyMap).filter(([_, data]) => data.totalSeconds > 0);
    const totalStudyDays = studyDayEntries.length;
    const qualifyingStudyDays = studyDayEntries.filter(([_, data]) => data.totalSeconds >= thresholdSec).length;

    const totalSeconds = studyDayEntries.reduce((acc, [_, data]) => acc + data.totalSeconds, 0);

    // 4. Average Study Time Per Day (on studied days)
    const avgSeconds = totalStudyDays > 0 ? Math.round(totalSeconds / totalStudyDays) : 0;

    return {
      currentStreak,
      longestStreak,
      totalStudyDays,
      qualifyingStudyDays,
      totalSeconds,
      avgSeconds,
      thresholdMin,
      todaySec
    };
  }

  function render() {
    const analytics = calculateAnalytics();

    // 1. Hero Streak Display
    const streakNumEl = document.getElementById('streakHeroNumber');
    const streakSubEl = document.getElementById('streakHeroSubtitle');
    if (streakNumEl) {
      const prevVal = parseInt(streakNumEl.textContent, 10) || 0;
      if (window.animateNumber && prevVal !== analytics.currentStreak) {
        window.animateNumber(streakNumEl, prevVal, analytics.currentStreak, 650);
      } else {
        streakNumEl.textContent = analytics.currentStreak;
      }
    }
    if (streakSubEl) {
      const todayMins = Math.round((analytics.todaySec || 0) / 60);
      const metToday = (analytics.todaySec || 0) >= (analytics.thresholdMin * 60);
      if (metToday) {
        streakSubEl.innerHTML = `<span style="color: var(--accent-emerald); font-weight: 700;">✔ Today's study target reached (${todayMins}m / ${analytics.thresholdMin}m)!</span> You've studied for <strong class="text-bright">${analytics.currentStreak} consecutive day${analytics.currentStreak === 1 ? '' : 's'}</strong>. Keep showing up!`;
      } else if (todayMins > 0) {
        streakSubEl.innerHTML = `<span style="color: var(--accent-amber); font-weight: 700;">⏳ Today: ${todayMins}m completed of ${analytics.thresholdMin}m target.</span> Current streak: <strong class="text-bright">${analytics.currentStreak} day${analytics.currentStreak === 1 ? '' : 's'}</strong>. Complete today's session to lock in your streak!`;
      } else if (analytics.currentStreak > 0) {
        streakSubEl.innerHTML = `You've studied for <strong class="text-bright">${analytics.currentStreak} consecutive day${analytics.currentStreak === 1 ? '' : 's'}</strong>. Complete at least <strong class="text-bright">${analytics.thresholdMin} minutes</strong> today to maintain your streak!`;
      } else {
        streakSubEl.innerHTML = `Start your study streak today! Complete at least <strong class="text-bright">${analytics.thresholdMin} minutes</strong> of focus time.`;
      }
    }

    // 2. Statistics Grid
    const curStreakEl = document.getElementById('statCurrentStreak');
    const longestStreakEl = document.getElementById('statLongestStreak');
    const totalDaysEl = document.getElementById('statTotalStudyDays');
    const totalHoursEl = document.getElementById('statTotalStudyHours');
    const avgDayEl = document.getElementById('statAvgStudyTime');

    if (curStreakEl) curStreakEl.textContent = `${analytics.currentStreak} day${analytics.currentStreak === 1 ? '' : 's'}`;
    if (longestStreakEl) longestStreakEl.textContent = `${analytics.longestStreak} day${analytics.longestStreak === 1 ? '' : 's'}`;
    if (totalDaysEl) totalDaysEl.textContent = `${analytics.totalStudyDays} days`;
    if (totalHoursEl) totalHoursEl.textContent = StudyTimer.formatDurationHuman(analytics.totalSeconds, false);
    if (avgDayEl) avgDayEl.textContent = `${StudyTimer.formatDurationHuman(analytics.avgSeconds, false)}/day`;
  }

  return {
    init,
    render,
    calculateAnalytics
  };
})();

window.StreakManager = StreakManager;

