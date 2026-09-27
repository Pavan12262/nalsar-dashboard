/**
 * timer.js - Resilient Study Stopwatch Engine
 * Uses absolute timestamps in LocalStorage to survive page refreshes, tab switches, and restarts.
 */

const StudyTimer = (() => {
  let intervalId = null;
  let onTickCallback = null;
  let onStopCallback = null;

  // Active state representation
  let state = {
    taskId: '',
    taskName: '',
    subtaskName: 'General',
    startedAtTimestamp: 0, // Date.now() when last started/resumed
    accumulatedSeconds: 0, // accumulated before current run
    isRunning: false,
    sessionStartTimeIso: '' // when session first began
  };

  function init(callbacks = {}) {
    onTickCallback = callbacks.onTick || null;
    onStopCallback = callbacks.onStop || null;

    // Load any saved timer state from LocalStorage
    const saved = Storage.getActiveTimer();
    if (saved && (saved.isRunning || saved.accumulatedSeconds > 0)) {
      state = saved;
      if (state.isRunning) {
        startInterval();
      }
    }
  }

  function getElapsedSeconds() {
    if (!state.isRunning) {
      return state.accumulatedSeconds;
    }
    const currentSegment = Math.floor((Date.now() - state.startedAtTimestamp) / 1000);
    return state.accumulatedSeconds + Math.max(0, currentSegment);
  }

  function startInterval() {
    if (intervalId) clearInterval(intervalId);
    intervalId = setInterval(() => {
      if (onTickCallback) {
        onTickCallback(getElapsedSeconds(), state);
      }
    }, 1000);
  }

  function stopInterval() {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }

  function start(taskId, taskName, subtaskName = 'General') {
    if (state.isRunning) return;

    const now = Date.now();
    // If not paused previously, it's a brand new start
    if (state.accumulatedSeconds === 0) {
      state.taskId = taskId;
      state.taskName = taskName;
      state.subtaskName = subtaskName;
      state.sessionStartTimeIso = new Date(now).toISOString();
    } else if (taskId && taskId !== state.taskId) {
      // Switching tasks resets
      state.taskId = taskId;
      state.taskName = taskName;
      state.subtaskName = subtaskName;
    }

    state.startedAtTimestamp = now;
    state.isRunning = true;

    Storage.setActiveTimer(state);
    startInterval();
    if (onTickCallback) onTickCallback(getElapsedSeconds(), state);
  }

  function pause() {
    if (!state.isRunning) return;

    state.accumulatedSeconds = getElapsedSeconds();
    state.isRunning = false;
    state.startedAtTimestamp = 0;

    Storage.setActiveTimer(state);
    stopInterval();
    if (onTickCallback) onTickCallback(state.accumulatedSeconds, state);
  }

  function resume() {
    if (state.isRunning) return;
    start(state.taskId, state.taskName);
  }

  function stop() {
    const elapsed = getElapsedSeconds();
    stopInterval();

    let savedSession = null;
    if (elapsed > 0 && state.taskId) {
      const todayStr = Storage.getLocalDateString();
      const endTimeIso = new Date().toISOString();
      const sessionData = {
        date: todayStr,
        taskId: state.taskId,
        taskName: state.taskName,
        subtaskName: state.subtaskName,
        startTime: state.sessionStartTimeIso || endTimeIso,
        endTime: endTimeIso,
        duration: elapsed
      };
      savedSession = Storage.saveSession(sessionData);
    }

    // Reset timer
    state = {
      taskId: '',
      taskName: '',
      subtaskName: 'General',
      startedAtTimestamp: 0,
      accumulatedSeconds: 0,
      isRunning: false,
      sessionStartTimeIso: ''
    };
    Storage.setActiveTimer(null);

    if (onTickCallback) onTickCallback(0, state);
    if (onStopCallback) onStopCallback(savedSession);
    return savedSession;
  }

  function discard() {
    stopInterval();
    state = {
      taskId: '',
      taskName: '',
      subtaskName: 'General',
      startedAtTimestamp: 0,
      accumulatedSeconds: 0,
      isRunning: false,
      sessionStartTimeIso: ''
    };
    Storage.setActiveTimer(null);
    if (onTickCallback) onTickCallback(0, state);
  }

  function getState() {
    return {
      ...state,
      elapsed: getElapsedSeconds()
    };
  }

  // Format seconds into HH:MM:SS
  function formatTime(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return [
      String(hours).padStart(2, '0'),
      String(minutes).padStart(2, '0'),
      String(seconds).padStart(2, '0')
    ].join(':');
  }

  // Format seconds into human readable format: "5h 24m" or "42m" or "1h 05m"
  function formatDurationHuman(totalSeconds, includeSeconds = false) {
    if (!totalSeconds || totalSeconds <= 0) return '0m';
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0 || (hours > 0 && seconds > 0)) {
      parts.push(hours > 0 ? `${String(minutes).padStart(2, '0')}m` : `${minutes}m`);
    }
    if (includeSeconds && seconds > 0 && hours === 0) {
      parts.push(`${seconds}s`);
    }
    return parts.length > 0 ? parts.join(' ') : '0m';
  }

  return {
    init,
    start,
    pause,
    resume,
    stop,
    discard,
    getState,
    getElapsedSeconds,
    formatTime,
    formatDurationHuman
  };
})();

window.StudyTimer = StudyTimer;
