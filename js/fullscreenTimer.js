/**
 * fullscreenTimer.js - Dedicated Distraction-Free Fullscreen Timer Mode
 * Supports both:
 * 1. Custom Countdown Timer (Massive Centered Digits + Real Circular Progress Ring)
 * 2. Continuous Stopwatch (Massive Centered Elapsed Digits + Ambient Frame)
 * 
 * Features:
 * - Real mathematical circular depletion tied to countdown duration
 * - Full Pause/Resume/Reset synchronization
 * - Escape key & Exit button handling
 * - Spacebar shortcut for Start/Pause
 * - Resilient to tab inactivity & state preservation
 * - Works on desktop and mobile
 */

const FullscreenTimer = (() => {
  let activeMode = 'countdown'; // 'countdown' | 'stopwatch'
  let isOpen = false;
  let animFrameId = null;

  const RING_RADIUS = 180;
  const CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS; // ~1130.973

  function init() {
    setupDOM();
    setupKeyboard();
    setupFullscreenChange();
  }

  function setupDOM() {
    // Open buttons from regular timer cards
    const countdownFsBtn = document.getElementById('countdownFullscreenBtn');
    const stopwatchFsBtn = document.getElementById('stopwatchFullscreenBtn');
    const exitFsBtn = document.getElementById('exitFullscreenTimerBtn');

    if (countdownFsBtn) {
      countdownFsBtn.addEventListener('click', (e) => {
        e.preventDefault();
        open('countdown');
      });
    }

    if (stopwatchFsBtn) {
      stopwatchFsBtn.addEventListener('click', (e) => {
        e.preventDefault();
        open('stopwatch');
      });
    }

    if (exitFsBtn) {
      exitFsBtn.addEventListener('click', (e) => {
        e.preventDefault();
        close();
      });
    }

    // Mode switch pills inside fullscreen topbar
    const modeSwitchCountdown = document.getElementById('fsModeSwitchCountdown');
    const modeSwitchStopwatch = document.getElementById('fsModeSwitchStopwatch');

    if (modeSwitchCountdown) {
      modeSwitchCountdown.addEventListener('click', () => switchMode('countdown'));
    }
    if (modeSwitchStopwatch) {
      modeSwitchStopwatch.addEventListener('click', () => switchMode('stopwatch'));
    }

    // Countdown controls in fullscreen
    const fsCdStartBtn = document.getElementById('fsCountdownStartBtn');
    const fsCdPauseBtn = document.getElementById('fsCountdownPauseBtn');
    const fsCdResumeBtn = document.getElementById('fsCountdownResumeBtn');
    const fsCdResetBtn = document.getElementById('fsCountdownResetBtn');

    if (fsCdStartBtn) {
      fsCdStartBtn.addEventListener('click', () => {
        if (window.CountdownTimer) window.CountdownTimer.start();
        updateView();
      });
    }
    if (fsCdPauseBtn) {
      fsCdPauseBtn.addEventListener('click', () => {
        if (window.CountdownTimer) window.CountdownTimer.pause();
        updateView();
      });
    }
    if (fsCdResumeBtn) {
      fsCdResumeBtn.addEventListener('click', () => {
        if (window.CountdownTimer) window.CountdownTimer.resume();
        updateView();
      });
    }
    if (fsCdResetBtn) {
      fsCdResetBtn.addEventListener('click', () => {
        if (window.CountdownTimer) window.CountdownTimer.reset();
        updateView();
      });
    }

    // Stopwatch controls in fullscreen
    const fsSwStartBtn = document.getElementById('fsStopwatchStartBtn');
    const fsSwPauseBtn = document.getElementById('fsStopwatchPauseBtn');
    const fsSwResumeBtn = document.getElementById('fsStopwatchResumeBtn');
    const fsSwStopBtn = document.getElementById('fsStopwatchStopBtn');
    const fsSwResetBtn = document.getElementById('fsStopwatchResetBtn');

    if (fsSwStartBtn) {
      fsSwStartBtn.addEventListener('click', () => {
        const timerStartBtn = document.getElementById('timerStartBtn');
        if (timerStartBtn) {
          timerStartBtn.click();
        } else if (window.StudyTimer) {
          window.StudyTimer.start('study', 'Study', 'General');
        }
        updateView();
      });
    }
    if (fsSwPauseBtn) {
      fsSwPauseBtn.addEventListener('click', () => {
        if (window.StudyTimer) window.StudyTimer.pause();
        updateView();
      });
    }
    if (fsSwResumeBtn) {
      fsSwResumeBtn.addEventListener('click', () => {
        if (window.StudyTimer) window.StudyTimer.resume();
        updateView();
      });
    }
    if (fsSwStopBtn) {
      fsSwStopBtn.addEventListener('click', () => {
        const timerStopBtn = document.getElementById('timerStopBtn');
        if (timerStopBtn) {
          timerStopBtn.click();
        } else if (window.StudyTimer) {
          window.StudyTimer.stop();
        }
        updateView();
      });
    }
    if (fsSwResetBtn) {
      fsSwResetBtn.addEventListener('click', () => {
        if (window.StudyTimer) window.StudyTimer.discard();
        updateView();
      });
    }

    // Initialize SVG dash array
    const progressRing = document.getElementById('fsProgressRingCircle');
    if (progressRing) {
      progressRing.style.strokeDasharray = `${CIRCUMFERENCE} ${CIRCUMFERENCE}`;
      progressRing.style.strokeDashoffset = '0';
    }
  }

  function setupKeyboard() {
    window.addEventListener('keydown', (e) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        close();
        return;
      }

      // Spacebar toggles start/pause/resume
      if (e.code === 'Space' || e.key === ' ') {
        const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
        if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') return;

        e.preventDefault();
        handleSpaceToggle();
      }
    });
  }

  function handleSpaceToggle() {
    if (activeMode === 'countdown' && window.CountdownTimer) {
      const state = window.CountdownTimer.getState();
      if (state.isRunning) {
        window.CountdownTimer.pause();
      } else if (state.isPaused) {
        window.CountdownTimer.resume();
      } else {
        window.CountdownTimer.start();
      }
      updateView();
    } else if (activeMode === 'stopwatch' && window.StudyTimer) {
      const state = window.StudyTimer.getState();
      if (state.isRunning) {
        window.StudyTimer.pause();
      } else if (state.accumulatedSeconds > 0) {
        window.StudyTimer.resume();
      } else {
        const timerStartBtn = document.getElementById('timerStartBtn');
        if (timerStartBtn) timerStartBtn.click();
      }
      updateView();
    }
  }

  let isTransitioning = false;
  let lastSourceTransform = { dX: 0, dY: 30, scale: 0.65 };

  function getSourceTransform(mode) {
    let sourceEl = null;
    if (mode === 'countdown') {
      sourceEl = document.getElementById('countdownTimerCard') || document.querySelector('.countdown-timer-card');
    } else {
      sourceEl = document.getElementById('heroTimerCard') || document.getElementById('activeTimerCard') || document.querySelector('.continuous-stopwatch-card');
    }

    if (!sourceEl) {
      return { dX: 0, dY: 30, scale: 0.7 };
    }

    const rect = sourceEl.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0 || rect.bottom <= 0 || rect.top >= window.innerHeight) {
      return { dX: 0, dY: 30, scale: 0.7 };
    }

    const sourceCenterX = rect.left + rect.width / 2;
    const sourceCenterY = rect.top + rect.height / 2;
    const viewportCenterX = window.innerWidth / 2;
    const viewportCenterY = window.innerHeight / 2;

    const dX = Math.round(sourceCenterX - viewportCenterX);
    const dY = Math.round(sourceCenterY - viewportCenterY);
    const targetSize = mode === 'countdown' ? 440 : 520;
    const scale = Math.max(0.35, Math.min(0.72, rect.width / targetSize));

    return { dX, dY, scale };
  }

  function setupFullscreenChange() {
    document.addEventListener('fullscreenchange', () => {
      // If browser fullscreen was exited externally (e.g. F11 or Esc), close our overlay smoothly
      if (!document.fullscreenElement && isOpen && !isTransitioning) {
        close(false); // don't re-call exitFullscreen
      }
    });
  }

  function open(mode = 'countdown') {
    if (isOpen && !isTransitioning) return;
    activeMode = mode;
    isOpen = true;
    isTransitioning = true;

    const overlay = document.getElementById('fullscreenTimerOverlay');
    if (!overlay) {
      isOpen = false;
      isTransitioning = false;
      return;
    }

    const cdCenter = document.getElementById('fsCountdownCenter');
    const swCenter = document.getElementById('fsStopwatchCenter');
    const activeCenter = mode === 'countdown' ? cdCenter : swCenter;
    const inactiveCenter = mode === 'countdown' ? swCenter : cdCenter;
    const topBar = overlay.querySelector('.fs-top-bar');
    const controls = activeCenter ? activeCenter.querySelector('.fs-controls-bar') : null;
    const ring = document.getElementById('fsProgressRingCircle');
    const footerHint = overlay.querySelector('.fs-footer-hint');

    // 1. Calculate origin delta from source card in viewport
    const origin = getSourceTransform(mode);
    lastSourceTransform = origin;

    // 2. Synchronize view & digits immediately before displaying overlay
    updateView();
    updateRealtimeState();

    if (inactiveCenter) inactiveCenter.style.display = 'none';
    if (activeCenter) activeCenter.style.display = 'flex';

    const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // 3. Set initial state: position center container right at source card
    document.body.classList.add('fullscreen-timer-active');
    overlay.classList.remove('fs-closing', 'fs-settled');
    overlay.classList.add('fs-opening');
    overlay.style.display = 'flex';
    overlay.style.opacity = '0';

    if (activeCenter) {
      activeCenter.style.transform = prefersReduced ? 'none' : `translate3d(${origin.dX}px, ${origin.dY}px, 0) scale(${origin.scale.toFixed(3)})`;
      activeCenter.style.opacity = '0.92';
      activeCenter.style.transition = 'none';
    }

    if (topBar) {
      topBar.style.opacity = '0';
      topBar.style.transform = prefersReduced ? 'none' : 'translateY(-14px)';
      topBar.style.transition = 'none';
    }

    if (controls) {
      controls.style.opacity = '0';
      controls.style.transform = prefersReduced ? 'none' : 'translateY(16px)';
      controls.style.transition = 'none';
    }

    if (footerHint) {
      footerHint.style.opacity = '0';
      footerHint.style.transition = 'none';
    }

    if (ring && mode === 'countdown') {
      ring.style.opacity = prefersReduced ? '1' : '0';
      ring.style.transform = prefersReduced ? 'none' : 'scale(0.88)';
      ring.style.transition = 'none';
    }

    // Force browser reflow to lock in start values
    void overlay.offsetWidth;

    // 4. Start live sync loop right away
    startSyncLoop();

    // 5. Expand smoothly into the center of the screen
    requestAnimationFrame(() => {
      overlay.classList.add('fs-animating');
      overlay.style.transition = prefersReduced ? 'opacity 0.15s ease' : 'opacity 380ms cubic-bezier(0.22, 1, 0.36, 1)';
      overlay.style.opacity = '1';

      if (activeCenter) {
        activeCenter.style.transition = prefersReduced ? 'opacity 0.15s ease' : 'transform 420ms cubic-bezier(0.22, 1, 0.36, 1), opacity 320ms ease';
        activeCenter.style.transform = 'translate3d(0, 0, 0) scale(1)';
        activeCenter.style.opacity = '1';
      }

      if (ring && mode === 'countdown') {
        ring.style.transition = prefersReduced ? 'none' : 'opacity 360ms ease 100ms, transform 420ms cubic-bezier(0.22, 1, 0.36, 1) 100ms';
        ring.style.opacity = '1';
        ring.style.transform = 'scale(1)';
      }
    });

    // 6. After center timer settles, fade & slide in top bar and controls
    setTimeout(() => {
      if (topBar) {
        topBar.style.transition = 'opacity 260ms ease, transform 260ms cubic-bezier(0.22, 1, 0.36, 1)';
        topBar.style.opacity = '1';
        topBar.style.transform = 'translateY(0)';
      }
      if (controls) {
        controls.style.transition = 'opacity 260ms ease, transform 260ms cubic-bezier(0.22, 1, 0.36, 1)';
        controls.style.opacity = '1';
        controls.style.transform = 'translateY(0)';
      }
      if (footerHint) {
        footerHint.style.transition = 'opacity 260ms ease';
        footerHint.style.opacity = '1';
      }
    }, prefersReduced ? 50 : 220);

    // 7. Settle animation and clean up temporary inline transitions
    setTimeout(() => {
      overlay.classList.add('fs-settled');
      overlay.classList.remove('fs-opening', 'fs-animating');
      if (activeCenter) {
        activeCenter.style.transition = '';
        activeCenter.style.transform = '';
      }
      if (topBar) {
        topBar.style.transition = '';
        topBar.style.transform = '';
        topBar.style.opacity = '';
      }
      if (controls) {
        controls.style.transition = '';
        controls.style.transform = '';
        controls.style.opacity = '';
      }
      if (ring) {
        ring.style.transition = '';
        ring.style.transform = '';
        ring.style.opacity = '';
      }
      if (footerHint) {
        footerHint.style.transition = '';
        footerHint.style.opacity = '';
      }
      isTransitioning = false;
    }, prefersReduced ? 160 : 480);

    // Request browser native fullscreen if supported
    try {
      if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    } catch {}
  }

  function close(triggerBrowserExit = true) {
    if (!isOpen || isTransitioning) return;
    isTransitioning = true;

    const overlay = document.getElementById('fullscreenTimerOverlay');
    if (!overlay) {
      isOpen = false;
      isTransitioning = false;
      return;
    }

    const cdCenter = document.getElementById('fsCountdownCenter');
    const swCenter = document.getElementById('fsStopwatchCenter');
    const activeCenter = activeMode === 'countdown' ? cdCenter : swCenter;
    const topBar = overlay.querySelector('.fs-top-bar');
    const controls = activeCenter ? activeCenter.querySelector('.fs-controls-bar') : null;
    const footerHint = overlay.querySelector('.fs-footer-hint');

    // Recalculate target shrink position relative to source card
    const origin = getSourceTransform(activeMode);

    overlay.classList.remove('fs-settled', 'fs-opening');
    overlay.classList.add('fs-closing');

    const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // 1. Controls & top bar fade out smoothly
    if (topBar) {
      topBar.style.transition = 'opacity 160ms ease, transform 160ms ease';
      topBar.style.opacity = '0';
      topBar.style.transform = prefersReduced ? 'none' : 'translateY(-10px)';
    }
    if (controls) {
      controls.style.transition = 'opacity 160ms ease, transform 160ms ease';
      controls.style.opacity = '0';
      controls.style.transform = prefersReduced ? 'none' : 'translateY(12px)';
    }
    if (footerHint) {
      footerHint.style.transition = 'opacity 160ms ease';
      footerHint.style.opacity = '0';
    }

    // 2. Center container smoothly shrinks back towards the card
    if (activeCenter) {
      activeCenter.style.transition = prefersReduced ? 'opacity 0.16s ease' : 'transform 360ms cubic-bezier(0.22, 1, 0.36, 1), opacity 300ms ease';
      activeCenter.style.transform = prefersReduced ? 'none' : `translate3d(${origin.dX}px, ${origin.dY}px, 0) scale(${origin.scale.toFixed(3)})`;
      activeCenter.style.opacity = '0';
    }

    // 3. Overlay background fades to 0
    overlay.style.transition = 'opacity 360ms cubic-bezier(0.22, 1, 0.36, 1)';
    overlay.style.opacity = '0';

    // 4. Complete exit after animation finishes without interrupting timer state
    setTimeout(() => {
      isOpen = false;
      stopSyncLoop();

      overlay.style.display = 'none';
      overlay.style.opacity = '';
      overlay.style.transition = '';
      overlay.classList.remove('fs-closing');

      if (activeCenter) {
        activeCenter.style.transform = '';
        activeCenter.style.opacity = '';
        activeCenter.style.transition = '';
      }
      if (topBar) {
        topBar.style.opacity = '';
        topBar.style.transform = '';
        topBar.style.transition = '';
      }
      if (controls) {
        controls.style.opacity = '';
        controls.style.transform = '';
        controls.style.transition = '';
      }
      if (footerHint) {
        footerHint.style.opacity = '';
        footerHint.style.transition = '';
      }

      document.body.classList.remove('fullscreen-timer-active');
      isTransitioning = false;

      // Exit browser native fullscreen if requested
      if (triggerBrowserExit) {
        try {
          if (document.fullscreenElement && document.exitFullscreen) {
            document.exitFullscreen().catch(() => {});
          }
        } catch {}
      }
    }, prefersReduced ? 120 : 370);
  }

  function switchMode(newMode) {
    if (newMode === activeMode || !isOpen) return;

    const cdCenter = document.getElementById('fsCountdownCenter');
    const swCenter = document.getElementById('fsStopwatchCenter');
    const curCenter = activeMode === 'countdown' ? cdCenter : swCenter;
    const nextCenter = newMode === 'countdown' ? cdCenter : swCenter;

    activeMode = newMode;

    if (curCenter && nextCenter) {
      curCenter.style.transition = 'opacity 180ms ease, transform 180ms ease';
      curCenter.style.opacity = '0';
      curCenter.style.transform = 'scale(0.96)';

      setTimeout(() => {
        curCenter.style.display = 'none';
        curCenter.style.transform = '';
        curCenter.style.opacity = '';

        nextCenter.style.display = 'flex';
        nextCenter.style.opacity = '0';
        nextCenter.style.transform = 'scale(1.04)';
        void nextCenter.offsetWidth;

        nextCenter.style.transition = 'opacity 220ms ease, transform 220ms cubic-bezier(0.22, 1, 0.36, 1)';
        nextCenter.style.opacity = '1';
        nextCenter.style.transform = 'scale(1)';

        updateView();
        updateRealtimeState();

        setTimeout(() => {
          nextCenter.style.transition = '';
          nextCenter.style.transform = '';
          nextCenter.style.opacity = '';
        }, 240);
      }, 180);
    } else {
      updateView();
      updateRealtimeState();
    }
  }

  function startSyncLoop() {
    stopSyncLoop();
    function loop() {
      if (!isOpen) return;
      updateRealtimeState();
      animFrameId = requestAnimationFrame(loop);
    }
    animFrameId = requestAnimationFrame(loop);
  }

  function stopSyncLoop() {
    if (animFrameId) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }
  }

  function updateRealtimeState() {
    if (!isOpen) return;

    if (activeMode === 'countdown') {
      updateCountdownRealtime();
    } else {
      updateStopwatchRealtime();
    }
  }

  function updateCountdownRealtime() {
    if (!window.CountdownTimer) return;
    const state = window.CountdownTimer.getState();

    // 1. Digital Display
    const digitsEl = document.getElementById('fsCountdownDigits');
    if (digitsEl) {
      digitsEl.textContent = window.CountdownTimer.formatMMSS(state.remainingSeconds);
    }

    // 2. Circular Progress Ring (Mathematically exact)
    const progressRing = document.getElementById('fsProgressRingCircle');
    if (progressRing) {
      const totalSec = Math.max(1, state.totalSeconds);
      const remainingSec = Math.max(0, Math.min(totalSec, state.remainingSeconds));

      // At start: remainingSec == totalSec => fraction = 1 => offset = 0 (full circle)
      // At end: remainingSec == 0 => fraction = 0 => offset = CIRCUMFERENCE (empty circle)
      const fractionRemaining = remainingSec / totalSec;
      const offset = CIRCUMFERENCE * (1 - fractionRemaining);
      progressRing.style.strokeDashoffset = offset.toFixed(2);

      // Color/Glow adjustments based on state
      if (state.isPaused) {
        progressRing.classList.add('is-paused');
        progressRing.classList.remove('is-running');
      } else if (state.isRunning) {
        progressRing.classList.add('is-running');
        progressRing.classList.remove('is-paused');
      } else {
        progressRing.classList.remove('is-running', 'is-paused');
      }
    }

    // 3. Status Pill
    const statusEl = document.getElementById('fsCountdownStatus');
    if (statusEl) {
      statusEl.className = 'fs-status-pill font-mono';
      if (state.isRunning) {
        statusEl.textContent = 'COUNTING DOWN';
        statusEl.classList.add('status-running');
      } else if (state.isPaused) {
        statusEl.textContent = 'PAUSED';
        statusEl.classList.add('status-paused');
      } else if (state.remainingSeconds === 0) {
        statusEl.textContent = 'SESSION COMPLETE';
        statusEl.classList.add('status-complete');
      } else {
        statusEl.textContent = 'READY';
        statusEl.classList.add('status-ready');
      }
    }
  }

  function updateStopwatchRealtime() {
    if (!window.StudyTimer) return;
    const elapsed = window.StudyTimer.getElapsedSeconds();
    const state = window.StudyTimer.getState();

    // 1. Digital Display
    const digitsEl = document.getElementById('fsStopwatchDigits');
    if (digitsEl) {
      digitsEl.textContent = window.StudyTimer.formatTime(elapsed);
    }

    // 2. Frame Glow
    const frameEl = document.getElementById('fsStopwatchFrame');
    if (frameEl) {
      if (state.isRunning) {
        frameEl.classList.add('is-running');
        frameEl.classList.remove('is-paused');
      } else if (state.accumulatedSeconds > 0) {
        frameEl.classList.add('is-paused');
        frameEl.classList.remove('is-running');
      } else {
        frameEl.classList.remove('is-running', 'is-paused');
      }
    }

    // 3. Status Pill
    const statusEl = document.getElementById('fsStopwatchStatus');
    if (statusEl) {
      statusEl.className = 'fs-status-pill font-mono';
      if (state.isRunning) {
        statusEl.textContent = 'TRACKING';
        statusEl.classList.add('status-running');
      } else if (state.accumulatedSeconds > 0) {
        statusEl.textContent = 'PAUSED';
        statusEl.classList.add('status-paused');
      } else {
        statusEl.textContent = 'READY';
        statusEl.classList.add('status-ready');
      }
    }
  }

  function updateView() {
    const cdCenter = document.getElementById('fsCountdownCenter');
    const swCenter = document.getElementById('fsStopwatchCenter');
    const switchCd = document.getElementById('fsModeSwitchCountdown');
    const switchSw = document.getElementById('fsModeSwitchStopwatch');
    const taskContext = document.getElementById('fsTaskContext');

    if (activeMode === 'countdown') {
      if (cdCenter) cdCenter.style.display = 'flex';
      if (swCenter) swCenter.style.display = 'none';

      if (switchCd) switchCd.classList.add('active');
      if (switchSw) switchSw.classList.remove('active');

      if (window.CountdownTimer) {
        const state = window.CountdownTimer.getState();
        const sub = state.subtaskName && state.subtaskName !== 'General' ? ` • ${state.subtaskName}` : '';
        if (taskContext) {
          taskContext.textContent = state.taskName ? `Studying: ${state.taskName}${sub}` : 'Studying: Custom Session';
        }

        const metaEl = document.getElementById('fsCountdownMeta');
        if (metaEl) {
          metaEl.textContent = `${state.durationMinutes} min focus session`;
        }

        // Button visibility
        const startBtn = document.getElementById('fsCountdownStartBtn');
        const pauseBtn = document.getElementById('fsCountdownPauseBtn');
        const resumeBtn = document.getElementById('fsCountdownResumeBtn');
        const resetBtn = document.getElementById('fsCountdownResetBtn');

        if (startBtn && pauseBtn && resumeBtn && resetBtn) {
          if (state.isRunning) {
            startBtn.style.display = 'none';
            pauseBtn.style.display = 'inline-flex';
            resumeBtn.style.display = 'none';
            resetBtn.style.display = 'inline-flex';
          } else if (state.isPaused) {
            startBtn.style.display = 'none';
            pauseBtn.style.display = 'none';
            resumeBtn.style.display = 'inline-flex';
            resetBtn.style.display = 'inline-flex';
          } else {
            startBtn.style.display = 'inline-flex';
            pauseBtn.style.display = 'none';
            resumeBtn.style.display = 'none';
            resetBtn.style.display = 'inline-flex';
          }
        }
      }
    } else {
      if (cdCenter) cdCenter.style.display = 'none';
      if (swCenter) swCenter.style.display = 'flex';

      if (switchCd) switchCd.classList.remove('active');
      if (switchSw) switchSw.classList.add('active');

      if (window.StudyTimer) {
        const state = window.StudyTimer.getState();
        const sub = state.subtaskName && state.subtaskName !== 'General' ? ` • ${state.subtaskName}` : '';
        if (taskContext) {
          taskContext.textContent = state.taskName ? `Tracking: ${state.taskName}${sub}` : 'Tracking: Continuous Session';
        }

        // Button visibility
        const startBtn = document.getElementById('fsStopwatchStartBtn');
        const pauseBtn = document.getElementById('fsStopwatchPauseBtn');
        const resumeBtn = document.getElementById('fsStopwatchResumeBtn');
        const stopBtn = document.getElementById('fsStopwatchStopBtn');
        const resetBtn = document.getElementById('fsStopwatchResetBtn');

        if (startBtn && pauseBtn && resumeBtn && stopBtn && resetBtn) {
          if (state.isRunning) {
            startBtn.style.display = 'none';
            pauseBtn.style.display = 'inline-flex';
            resumeBtn.style.display = 'none';
            stopBtn.style.display = 'inline-flex';
            resetBtn.style.display = 'none';
          } else if (state.accumulatedSeconds > 0) {
            startBtn.style.display = 'none';
            pauseBtn.style.display = 'none';
            resumeBtn.style.display = 'inline-flex';
            stopBtn.style.display = 'inline-flex';
            resetBtn.style.display = 'inline-flex';
          } else {
            startBtn.style.display = 'inline-flex';
            pauseBtn.style.display = 'none';
            resumeBtn.style.display = 'none';
            stopBtn.style.display = 'none';
            resetBtn.style.display = 'none';
          }
        }
      }
    }

    updateRealtimeState();
  }

  // Public API
  return {
    init,
    open,
    close,
    switchMode,
    update: updateView,
    isOpen: () => isOpen,
    getActiveMode: () => activeMode
  };
})();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => FullscreenTimer.init());
} else {
  FullscreenTimer.init();
}

window.FullscreenTimer = FullscreenTimer;
