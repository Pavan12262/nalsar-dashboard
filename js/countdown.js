/**
 * countdown.js - Precision Custom Study Countdown Timer
 * 
 * Simple, customizable countdown timer for focused studying:
 * - Enter any custom duration in minutes (e.g. 25, 40, 60, 90 min)
 * - Immediate MM:SS display update
 * - Countdown: MM:SS -> ... -> 00:00
 * - Accurate timestamp-based calculations (immune to tab throttling/idle)
 * - Start / Pause / Resume / Reset
 * - Stops automatically at 00:00, never goes negative
 * - User can change duration after Reset or whenever stopped
 * - Automatically logs completed study session to daily history
 * - Supports durations > 60 minutes (e.g. 90:00)
 * - ZERO Pomodoro, zero cycles, zero breaks
 */

const CountdownTimer = (() => {
  let timerInterval = null;
  let targetEndTime = 0;
  let audioCtx = null;

  let state = {
    durationMinutes: 25,
    totalSeconds: 25 * 60,
    remainingSeconds: 25 * 60,
    isRunning: false,
    isPaused: false,
    taskId: '',
    taskName: '',
    subtaskName: 'General',
    sessionStartTime: null
  };

  const STORAGE_KEY_DURATION = 'myprep_countdown_duration';
  const STORAGE_KEY_STATE = 'myprep_countdown_state';

  function init() {
    loadSavedDuration();
    setupDOM();
    restoreState();
    updateUI();
  }

  function loadSavedDuration() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_DURATION);
      if (saved) {
        const val = parseInt(saved, 10);
        if (!isNaN(val) && val >= 1 && val <= 720) {
          state.durationMinutes = val;
        }
      }
    } catch {}
    state.totalSeconds = state.durationMinutes * 60;
    state.remainingSeconds = state.totalSeconds;
  }

  function setDuration(minutes) {
    const m = parseInt(minutes, 10);
    if (isNaN(m) || m < 1 || m > 720) {
      showToast('Please enter a valid duration between 1 and 720 minutes.');
      return false;
    }

    state.durationMinutes = m;
    state.totalSeconds = m * 60;
    try {
      localStorage.setItem(STORAGE_KEY_DURATION, String(m));
    } catch {}

    // Only update remaining seconds if timer is not actively running or paused
    if (!state.isRunning && !state.isPaused) {
      state.remainingSeconds = state.totalSeconds;
    }

    const input = document.getElementById('countdownDurationInput');
    if (input && parseInt(input.value, 10) !== m) {
      input.value = m;
    }

    hideCompletionBanner();
    saveState();
    updateUI();
    return true;
  }

  function formatMMSS(totalSeconds) {
    const clamped = Math.max(0, Math.floor(totalSeconds));
    const mins = Math.floor(clamped / 60);
    const secs = clamped % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  function setupDOM() {
    const startBtn = document.getElementById('countdownStartBtn');
    const pauseBtn = document.getElementById('countdownPauseBtn');
    const resumeBtn = document.getElementById('countdownResumeBtn');
    const resetBtn = document.getElementById('countdownResetBtn');
    const durationInput = document.getElementById('countdownDurationInput');

    if (startBtn) startBtn.addEventListener('click', start);
    if (pauseBtn) pauseBtn.addEventListener('click', pause);
    if (resumeBtn) resumeBtn.addEventListener('click', resume);
    if (resetBtn) resetBtn.addEventListener('click', reset);

    if (durationInput) {
      durationInput.value = state.durationMinutes;
      durationInput.addEventListener('input', () => {
        if (!state.isRunning && !state.isPaused) {
          const val = parseInt(durationInput.value, 10);
          if (!isNaN(val) && val >= 1 && val <= 720) {
            setDuration(val);
          }
        }
      });
      durationInput.addEventListener('change', () => {
        if (!state.isRunning && !state.isPaused) {
          const val = parseInt(durationInput.value, 10);
          if (!isNaN(val) && val >= 1 && val <= 720) {
            setDuration(val);
          } else {
            durationInput.value = state.durationMinutes;
            showToast('Please enter a valid duration between 1 and 720 minutes.');
          }
        }
      });
    }

    // Quick duration presets (25m, 40m, 60m, 90m)
    document.querySelectorAll('.countdown-preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (state.isRunning) {
          showToast('Please pause or reset the timer before changing duration.');
          return;
        }
        const mins = btn.getAttribute('data-minutes');
        if (mins) {
          if (state.isPaused) {
            reset();
          }
          setDuration(mins);
        }
      });
    });

    const taskSelect = document.getElementById('countdownTaskSelect');
    if (taskSelect) {
      taskSelect.addEventListener('change', populateSubtaskSelect);
    }

    populateTaskSelect();
  }

  function populateTaskSelect() {
    const taskSelect = document.getElementById('countdownTaskSelect');
    if (!taskSelect) return;
    const tasks = Storage.getTasks();
    const prevVal = taskSelect.value;
    taskSelect.innerHTML = tasks.map(t => `<option value="${t.id}">${escapeHtml(t.name)}</option>`).join('');
    if (prevVal && tasks.some(t => t.id === prevVal)) {
      taskSelect.value = prevVal;
    }
    populateSubtaskSelect();
  }

  function populateSubtaskSelect() {
    const taskSelect = document.getElementById('countdownTaskSelect');
    const subtaskSelect = document.getElementById('countdownSubtaskSelect');
    if (!taskSelect || !subtaskSelect) return;

    const taskId = taskSelect.value;
    const tasks = Storage.getTasks();
    const task = tasks.find(t => t.id === taskId);

    const subtasks = task && Array.isArray(task.subtasks) && task.subtasks.length > 0
      ? task.subtasks
      : ['General'];

    const prevSub = subtaskSelect.value;
    let opts = '<option value="General">General</option>';
    subtasks.forEach(st => {
      if (st.toLowerCase() !== 'general') {
        opts += `<option value="${escapeHtml(st)}">${escapeHtml(st)}</option>`;
      }
    });

    subtaskSelect.innerHTML = opts;
    if (prevSub && subtasks.some(st => st.toLowerCase() === prevSub.toLowerCase())) {
      subtaskSelect.value = prevSub;
    }
  }

  function triggerCardAnimation(type = 'start') {
    const card = document.getElementById('countdownTimerCard');
    if (!card) return;
    card.classList.remove('timer-activating', 'timer-resuming');
    void card.offsetWidth; // Force CSS reflow
    if (type === 'start') {
      card.classList.add('timer-activating');
      setTimeout(() => {
        card.classList.remove('timer-activating');
      }, 650);
    } else if (type === 'resume') {
      card.classList.add('timer-resuming');
      setTimeout(() => {
        card.classList.remove('timer-resuming');
      }, 450);
    }
  }

  function start() {
    if (state.isRunning) return;

    hideCompletionBanner();

    // If remainingSeconds was 0, restart from full duration
    if (state.remainingSeconds <= 0) {
      state.remainingSeconds = state.totalSeconds;
    }

    // Capture task and subtask
    const taskSelect = document.getElementById('countdownTaskSelect');
    const subtaskSelect = document.getElementById('countdownSubtaskSelect');

    if (taskSelect && taskSelect.value) {
      state.taskId = taskSelect.value;
      state.taskName = taskSelect.options[taskSelect.selectedIndex]?.text || 'Study';
    } else {
      const allTasks = Storage.getTasks();
      if (allTasks && allTasks.length > 0) {
        state.taskId = allTasks[0].id;
        state.taskName = allTasks[0].name;
        if (taskSelect) taskSelect.value = allTasks[0].id;
      }
    }

    state.subtaskName = (subtaskSelect && subtaskSelect.value) ? subtaskSelect.value : 'General';
    state.sessionStartTime = new Date().toISOString();

    // Set absolute target end timestamp for tab-inactive resilience
    targetEndTime = Date.now() + (state.remainingSeconds * 1000);
    state.isRunning = true;
    state.isPaused = false;
    saveState();

    triggerCardAnimation('start');

    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(tick, 200);

    updateUI();
  }

  function pause() {
    if (!state.isRunning) return;

    // Freeze exact remaining time from targetEndTime
    const remainingMs = targetEndTime - Date.now();
    state.remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
    state.isRunning = false;
    state.isPaused = true;

    const card = document.getElementById('countdownTimerCard');
    if (card) card.classList.remove('timer-activating', 'timer-resuming');

    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }

    saveState();
    updateUI();
  }

  function resume() {
    if (state.isRunning || !state.isPaused) return;

    if (state.remainingSeconds <= 0) {
      state.remainingSeconds = state.totalSeconds;
    }

    // Continue from exact remaining time
    targetEndTime = Date.now() + (state.remainingSeconds * 1000);
    state.isRunning = true;
    state.isPaused = false;
    saveState();

    triggerCardAnimation('resume');

    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(tick, 200);

    updateUI();
  }

  function reset() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }

    state.isRunning = false;
    state.isPaused = false;
    state.totalSeconds = state.durationMinutes * 60;
    state.remainingSeconds = state.totalSeconds;

    const card = document.getElementById('countdownTimerCard');
    if (card) card.classList.remove('timer-activating', 'timer-resuming', 'is-running', 'is-paused');

    hideCompletionBanner();
    saveState();
    updateUI();
  }

  function tick() {
    if (!state.isRunning) return;

    const remainingMs = targetEndTime - Date.now();
    const newRemaining = Math.max(0, Math.ceil(remainingMs / 1000));

    if (newRemaining !== state.remainingSeconds) {
      state.remainingSeconds = newRemaining;
      updateDigitsDisplay();
      updateProgressBar();
    }

    if (state.remainingSeconds <= 0) {
      handleComplete();
    }
  }

  function handleComplete() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }

    state.isRunning = false;
    state.isPaused = false;
    state.remainingSeconds = 0;

    playChime();
    showCompletionBanner();

    // Log completed study time
    logCompletedSession(state.totalSeconds);

    saveState();
    updateUI();
  }

  function logCompletedSession(seconds) {
    if (seconds <= 0 || !state.taskId) return;

    const todayStr = Storage.getLocalDateString();
    const nowIso = new Date().toISOString();
    const startIso = state.sessionStartTime || new Date(Date.now() - seconds * 1000).toISOString();

    const sessionData = {
      date: todayStr,
      taskId: state.taskId,
      taskName: state.taskName || 'Study',
      subtaskName: state.subtaskName || 'General',
      startTime: startIso,
      endTime: nowIso,
      duration: Math.round(seconds)
    };

    Storage.saveSession(sessionData);

    if (window.StudyManager && typeof window.StudyManager.render === 'function') {
      window.StudyManager.render();
    }
    if (window.App && typeof window.App.updateMetrics === 'function') {
      window.App.updateMetrics();
    }
    if (window.StreakManager && typeof window.StreakManager.render === 'function') {
      window.StreakManager.render();
    }
  }

  function updateDigitsDisplay() {
    const digitsEl = document.getElementById('countdownDigitsDisplay');
    if (digitsEl) {
      digitsEl.textContent = formatMMSS(state.remainingSeconds);
    }
  }

  function updateProgressBar() {
    const bar = document.getElementById('countdownProgressBar');
    if (!bar) return;
    if (state.totalSeconds <= 0) {
      bar.style.width = '0%';
      return;
    }
    const elapsed = state.totalSeconds - state.remainingSeconds;
    const pct = Math.min(100, Math.max(0, (elapsed / state.totalSeconds) * 100));
    bar.style.width = `${pct}%`;
  }

  function showCompletionBanner() {
    const banner = document.getElementById('countdownCompleteBanner');
    if (banner) {
      banner.style.display = 'block';
    }
  }

  function hideCompletionBanner() {
    const banner = document.getElementById('countdownCompleteBanner');
    if (banner) {
      banner.style.display = 'none';
    }
  }

  function updateUI() {
    const card = document.getElementById('countdownTimerCard');
    const statusBadge = document.getElementById('countdownStatusBadge');
    const startBtn = document.getElementById('countdownStartBtn');
    const pauseBtn = document.getElementById('countdownPauseBtn');
    const resumeBtn = document.getElementById('countdownResumeBtn');
    const durationInput = document.getElementById('countdownDurationInput');
    const taskSelect = document.getElementById('countdownTaskSelect');
    const subtaskSelect = document.getElementById('countdownSubtaskSelect');
    const activeTag = document.getElementById('countdownActiveTaskTag');

    updateDigitsDisplay();
    updateProgressBar();

    if (card) {
      card.classList.remove('is-running', 'is-paused');
      if (state.isRunning) card.classList.add('is-running');
      if (state.isPaused) card.classList.add('is-paused');
    }

    if (statusBadge) {
      statusBadge.classList.remove('status-ready', 'status-tracking', 'status-paused');
      if (state.isRunning) {
        statusBadge.textContent = 'COUNTING DOWN';
        statusBadge.classList.add('status-tracking');
      } else if (state.isPaused) {
        statusBadge.textContent = 'PAUSED';
        statusBadge.classList.add('status-paused');
      } else if (state.remainingSeconds === 0) {
        statusBadge.textContent = 'COMPLETED';
        statusBadge.classList.add('status-ready');
      } else {
        statusBadge.textContent = 'READY';
        statusBadge.classList.add('status-ready');
      }
    }

    // Button states
    if (startBtn && pauseBtn && resumeBtn) {
      if (state.isRunning) {
        startBtn.style.display = 'none';
        pauseBtn.style.display = 'inline-flex';
        resumeBtn.style.display = 'none';
      } else if (state.isPaused) {
        startBtn.style.display = 'none';
        pauseBtn.style.display = 'none';
        resumeBtn.style.display = 'inline-flex';
      } else {
        startBtn.style.display = 'inline-flex';
        pauseBtn.style.display = 'none';
        resumeBtn.style.display = 'none';
      }
    }

    // Disable duration input and selectors while actively running
    if (durationInput) {
      durationInput.disabled = state.isRunning;
    }
    if (taskSelect) {
      taskSelect.disabled = state.isRunning;
    }
    if (subtaskSelect) {
      subtaskSelect.disabled = state.isRunning;
    }

    // Active Task Tag
    if (activeTag) {
      if (state.isRunning) {
        const sub = state.subtaskName && state.subtaskName !== 'General' ? ` • ${state.subtaskName}` : '';
        activeTag.textContent = `Studying: ${state.taskName || 'Study'}${sub}`;
        activeTag.style.display = 'inline-block';
      } else if (state.isPaused) {
        activeTag.textContent = `Paused: ${state.taskName || 'Study'}`;
        activeTag.style.display = 'inline-block';
      } else {
        activeTag.style.display = 'none';
      }
    }

    if (window.FullscreenTimer && typeof window.FullscreenTimer.update === 'function') {
      window.FullscreenTimer.update();
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY_STATE, JSON.stringify({
        durationMinutes: state.durationMinutes,
        remainingSeconds: state.remainingSeconds,
        totalSeconds: state.totalSeconds,
        taskId: state.taskId,
        taskName: state.taskName,
        subtaskName: state.subtaskName,
        isPaused: state.isPaused
      }));
    } catch {}
  }

  function restoreState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_STATE);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved && typeof saved.durationMinutes === 'number') {
          state.durationMinutes = saved.durationMinutes;
          state.totalSeconds = saved.totalSeconds || state.durationMinutes * 60;
          state.remainingSeconds = typeof saved.remainingSeconds === 'number' ? saved.remainingSeconds : state.totalSeconds;
          state.isPaused = !!saved.isPaused;
          state.taskId = saved.taskId || '';
          state.taskName = saved.taskName || '';
          state.subtaskName = saved.subtaskName || 'General';

          const taskSelect = document.getElementById('countdownTaskSelect');
          if (taskSelect && state.taskId) {
            taskSelect.value = state.taskId;
            populateSubtaskSelect();
            const subtaskSelect = document.getElementById('countdownSubtaskSelect');
            if (subtaskSelect && state.subtaskName) {
              subtaskSelect.value = state.subtaskName;
            }
          }
        }
      }
    } catch {}
  }

  function playChime() {
    try {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(880, now + 0.15); // A5
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(now + 0.6);
    } catch {}
  }

  function showToast(msg) {
    let toast = document.getElementById('countdownToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'countdownToast';
      toast.className = 'pomo-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('visible');
    setTimeout(() => {
      toast.classList.remove('visible');
    }, 4000);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  return {
    init,
    setDuration,
    start,
    pause,
    resume,
    reset,
    formatMMSS,
    populateTaskSelect,
    populateSubtaskSelect,
    getState: () => ({ ...state })
  };
})();

window.CountdownTimer = CountdownTimer;

