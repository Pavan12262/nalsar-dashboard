/**
 * app.js - Main Application Coordinator for My Prep Dashboard
 * Coordinates the 3 major tabs (Performance, Study Timer, Streak),
 * subsystems bootstrap, and data backup/restore.
 */

const App = (() => {
  let activeTab = 'performance';

  function init() {
    // 1. Initialize Storage
    Storage.init();

    // 2. Display Today's Date & Initialize CLAT 2027 D-Day Countdown
    displayCurrentDate();
    initClatCountdown();

    // 3. Initialize Subsystems (Performance, Sectionals, Study Timer, Streak)
    MockManager.init();
    ErrorNotebook.init();
    if (window.WeaknessTracker) WeaknessTracker.init();
    if (window.SectionalsManager) SectionalsManager.init();
    if (window.SectionalErrorLog) SectionalErrorLog.init();
    if (window.SectionalWeaknessTracker) SectionalWeaknessTracker.init();
    if (window.StudyManager) StudyManager.init();
    if (window.CountdownTimer) CountdownTimer.init();
    if (window.StreakManager) StreakManager.init();
    if (window.MockScheduleManager) MockScheduleManager.init();

    // 4. Setup Global Event Handlers & Tabs
    setupGlobalHandlers();
    initWelcomeScreen();

    // 5. Setup initial tab from URL hash or default
    const initialTab = getTabFromHash() || 'performance';
    switchTab(initialTab);
  }

  function displayCurrentDate() {
    const dateEl = document.getElementById('currentDateDisplay');
    if (!dateEl) return;
    const now = new Date();
    const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    dateEl.textContent = now.toLocaleDateString(undefined, options);
  }

  function getTabFromHash() {
    const hash = window.location.hash.toLowerCase().replace('#', '');
    if (hash === 'performance' || hash === 'mocks' || hash === 'errors') return 'performance';
    if (hash === 'sectionals' || hash === 'sectional') return 'sectionals';
    if (hash === 'study' || hash === 'timer') return 'study';
    if (hash === 'streak') return 'streak';
    return null;
  }

  function switchTab(tabKey) {
    activeTab = tabKey;

    // 1. Update navigation pills
    const navPills = document.querySelectorAll('.nav-pill');
    navPills.forEach(pill => {
      const isTarget = pill.getAttribute('data-tab') === tabKey;
      if (isTarget) {
        pill.classList.add('active');
        pill.setAttribute('aria-selected', 'true');
      } else {
        pill.classList.remove('active');
        pill.setAttribute('aria-selected', 'false');
      }
    });

    // 2. Toggle Tab Panes
    const tabPanes = document.querySelectorAll('.tab-pane');
    tabPanes.forEach(pane => {
      if (pane.id === `tab-${tabKey}`) {
        pane.classList.add('active');
      } else {
        pane.classList.remove('active');
      }
    });

    // 3. Update URL hash without scroll jumps
    if (history.replaceState) {
      history.replaceState(null, null, `#${tabKey}`);
    } else {
      window.location.hash = tabKey;
    }

    // 4. Trigger subsystem re-render for proper SVG/chart sizing in visible pane
    if (tabKey === 'performance') {
      MockManager.render();
      ErrorNotebook.render();
      if (window.WeaknessTracker) WeaknessTracker.render();
      if (window.MockScheduleManager) MockScheduleManager.render();

    } else if (tabKey === 'sectionals') {
      if (window.SectionalsManager) SectionalsManager.render();
      if (window.SectionalWeaknessTracker) SectionalWeaknessTracker.render();
      if (window.SectionalErrorLog) SectionalErrorLog.render();
    } else if (tabKey === 'study') {
      if (window.StudyManager) StudyManager.render();
    } else if (tabKey === 'streak') {
      if (window.StreakManager) StreakManager.render();
    }

    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function setupGlobalHandlers() {
    // 3 Main Navigation Tabs
    const navLinks = document.querySelectorAll('.nav-pill');
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const tabKey = link.getAttribute('data-tab');
        if (tabKey) {
          switchTab(tabKey);
        }
      });
    });

    // Listen for browser forward/back buttons
    window.addEventListener('hashchange', () => {
      const tabFromHash = getTabFromHash();
      if (tabFromHash && tabFromHash !== activeTab) {
        switchTab(tabFromHash);
      }
    });

    // Backup Export
    const exportBtn = document.getElementById('exportDataBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        Storage.exportData();
      });
    }

    // Backup Import
    const importBtn = document.getElementById('importDataBtn');
    const importFileInput = document.getElementById('importFileInput');
    if (importBtn && importFileInput) {
      importBtn.addEventListener('click', () => {
        importFileInput.click();
      });

      importFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
          const content = evt.target.result;
          const res = Storage.importData(content);
          if (res.success) {
            alert('Backup successfully imported! All metrics, mocks, errors, and study sessions are restored.');
            refreshAll();
          } else {
            alert('Failed to import backup: ' + res.error);
          }
        };
        reader.readAsText(file);
        importFileInput.value = '';
      });
    }

    // Reset Menu Modal
    const settingsBtn = document.getElementById('settingsMenuBtn');
    const settingsModal = document.getElementById('settingsModal');
    const closeSettingsBtn = document.getElementById('closeSettingsModalBtn');

    if (settingsBtn && settingsModal) {
      settingsBtn.addEventListener('click', () => {
        settingsModal.classList.add('active');
      });
    }
    if (closeSettingsBtn && settingsModal) {
      closeSettingsBtn.addEventListener('click', () => {
        settingsModal.classList.remove('active');
      });
    }

    const resetSampleBtn = document.getElementById('resetSampleDataBtn');
    if (resetSampleBtn) {
      resetSampleBtn.addEventListener('click', () => {
        if (confirm('Load realistic sample data? This will replace current entries with realistic mock, error, and study records.')) {
          Storage.resetToSample();
          settingsModal.classList.remove('active');
          refreshAll();
        }
      });
    }

    const resetEmptyBtn = document.getElementById('resetEmptyDataBtn');
    if (resetEmptyBtn) {
      resetEmptyBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear all data and start completely fresh? This cannot be undone unless you have a backup.')) {
          Storage.resetToEmpty();
          settingsModal.classList.remove('active');
          refreshAll();
        }
      });
    }

    // Keyboard ESC closes any active modal
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.active').forEach(m => {
          m.classList.remove('active');
        });
        const pomoSettings = document.getElementById('pomoSettingsPanel');
        if (pomoSettings) pomoSettings.classList.remove('active');
      }
    });

    // Close modal when clicking backdrop
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          overlay.classList.remove('active');
        }
      });
    });
  }

  // =========================================================================
  // =========================================================================
  // Full-Screen NALSAR Image Welcome Screen with Glowing LOCK IN Button
  // =========================================================================
  function initWelcomeScreen() {
    const welcomeScreen = document.getElementById('welcomeScreen');
    const lockInBtn = document.getElementById('welcomeLockInBtn');
    const brandTrigger = document.getElementById('brandWelcomeTrigger');

    if (!welcomeScreen) return;

    // ONLY the LOCK IN button transitions into the dashboard
    if (lockInBtn) {
      lockInBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dismissWelcomeScreen();
      });

      // Support keyboard Enter or Space on button
      lockInBtn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          dismissWelcomeScreen();
        }
      });
    }

    if (brandTrigger) {
      brandTrigger.addEventListener('click', () => {
        showWelcomeScreen();
      });
    }
  }

  function dismissWelcomeScreen() {
    const welcomeScreen = document.getElementById('welcomeScreen');
    if (!welcomeScreen) return;
    welcomeScreen.classList.add('exiting');
    setTimeout(() => {
      welcomeScreen.style.display = 'none';
      // Trigger subsystem re-render for crisp SVG chart sizing
      if (activeTab === 'performance') {
        MockManager.render();
        ErrorNotebook.render();
        if (window.WeaknessTracker) WeaknessTracker.render();
      } else if (activeTab === 'sectionals' && window.SectionalsManager) {
        SectionalsManager.render();
        if (window.SectionalWeaknessTracker) SectionalWeaknessTracker.render();
        if (window.SectionalErrorLog) SectionalErrorLog.render();
      } else if (activeTab === 'study' && window.StudyManager) {
        StudyManager.render();
      } else if (activeTab === 'streak' && window.StreakManager) {
        StreakManager.render();
      }
    }, 800);
  }

  function showWelcomeScreen() {
    const welcomeScreen = document.getElementById('welcomeScreen');
    if (!welcomeScreen) return;
    welcomeScreen.style.display = 'flex';
    void welcomeScreen.offsetWidth; // Force layout recalculation
    welcomeScreen.classList.remove('exiting');
  }

  function refreshAll() {
    MockManager.render();
    ErrorNotebook.render();
    if (window.WeaknessTracker) WeaknessTracker.render();
    if (window.SectionalsManager) SectionalsManager.render();
    if (window.SectionalWeaknessTracker) SectionalWeaknessTracker.render();
    if (window.SectionalErrorLog) SectionalErrorLog.render();
    if (window.StudyManager) StudyManager.render();
    if (window.StreakManager) StreakManager.render();
    if (window.MockScheduleManager) MockScheduleManager.render();
    renderClatCountdown(true);
  }

  // =========================================================================
  // CLAT 2027 D-Day Countdown Engine
  // =========================================================================
  let lastCountdownDateStr = '';
  let currentDDayValue = null;

  function initClatCountdown() {
    renderClatCountdown(true);
    setupClatEventHandlers();
    scheduleMidnightCountdownUpdate();

    // Health-check: automatically check every 60 seconds if date rolled over
    setInterval(() => {
      const todayStr = Storage.getLocalDateString();
      if (todayStr !== lastCountdownDateStr) {
        displayCurrentDate();
        renderClatCountdown(false);
      }
    }, 60000);

    // Refresh immediately when student brings browser tab back into focus
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        displayCurrentDate();
        renderClatCountdown(false);
      }
    });
  }

  function calculateDDayDiff(targetDateStr) {
    if (!targetDateStr || typeof targetDateStr !== 'string') return null;
    const parts = targetDateStr.split('-');
    if (parts.length !== 3) return null;
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    if (isNaN(y) || isNaN(m) || isNaN(d)) return null;

    const targetDate = new Date(y, m, d, 0, 0, 0, 0);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

    const msPerDay = 1000 * 60 * 60 * 24;
    const diffDays = Math.round((targetDate.getTime() - today.getTime()) / msPerDay);
    return {
      diffDays,
      targetDate
    };
  }

  function formatExamDateDisplay(dateObj) {
    if (!dateObj || !(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
      return 'No target date set';
    }
    const options = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' };
    return dateObj.toLocaleDateString(undefined, options);
  }

  function animateNumber(el, start, end, duration = 650, prefix = '', suffix = '') {
    if (!el) return;
    if (typeof end !== 'number' || isNaN(end)) {
      el.textContent = `${prefix}${end}${suffix}`;
      return;
    }
    const safeStart = typeof start === 'number' && !isNaN(start) ? start : 0;
    if (safeStart === end) {
      el.textContent = `${prefix}${end}${suffix}`;
      return;
    }
    const startTime = performance.now();
    function frame(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      const current = Math.round(safeStart + (end - safeStart) * ease);
      el.textContent = `${prefix}${current}${suffix}`;
      if (progress < 1) {
        requestAnimationFrame(frame);
      } else {
        el.textContent = `${prefix}${end}${suffix}`;
      }
    }
    requestAnimationFrame(frame);
  }
  window.animateNumber = animateNumber;

  function animateDDayNumber(el, start, end, duration = 650) {
    animateNumber(el, start, end, duration);
  }

  function renderClatCountdown(shouldAnimate = true) {
    const numEl = document.getElementById('clatDDayNumber');
    const dateEl = document.getElementById('clatExamDateDisplay');
    const editBtnText = document.getElementById('clatEditBtnText');
    const previewPill = document.getElementById('clatDDayPreviewPill');
    const inputEl = document.getElementById('clatExamDateInput');

    lastCountdownDateStr = Storage.getLocalDateString();
    const targetDateStr = Storage.getClatExamDate();

    if (inputEl && inputEl.value !== (targetDateStr || '')) {
      inputEl.value = targetDateStr || '';
    }

    if (!targetDateStr) {
      if (numEl) numEl.textContent = '---';
      if (dateEl) dateEl.textContent = 'No target date set';
      if (editBtnText) editBtnText.textContent = 'Set Date';
      if (previewPill) previewPill.textContent = 'D — ---';
      currentDDayValue = null;
      return;
    }

    const calc = calculateDDayDiff(targetDateStr);
    if (!calc) {
      if (numEl) numEl.textContent = '---';
      if (dateEl) dateEl.textContent = 'Invalid date';
      if (editBtnText) editBtnText.textContent = 'Set Date';
      if (previewPill) previewPill.textContent = 'D — ---';
      currentDDayValue = null;
      return;
    }

    const { diffDays, targetDate } = calc;
    const formatted = formatExamDateDisplay(targetDate);

    if (dateEl) dateEl.textContent = formatted;
    if (editBtnText) editBtnText.textContent = 'Edit Date';

    if (diffDays > 0) {
      if (previewPill) previewPill.textContent = `D — ${diffDays}`;
      if (numEl) {
        if (shouldAnimate) {
          animateDDayNumber(numEl, currentDDayValue !== null ? currentDDayValue : 0, diffDays, 650);
        } else {
          numEl.textContent = diffDays;
        }
      }
      currentDDayValue = diffDays;
    } else if (diffDays === 0) {
      if (previewPill) previewPill.textContent = 'D — DAY';
      if (numEl) numEl.textContent = 'DAY';
      currentDDayValue = 0;
    } else {
      const pastDays = Math.abs(diffDays);
      if (previewPill) previewPill.textContent = `D + ${pastDays}`;
      if (numEl) numEl.textContent = `+${pastDays}`;
      currentDDayValue = diffDays;
    }
  }

  function scheduleMidnightCountdownUpdate() {
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 2);
    const msUntilMidnight = tomorrow.getTime() - now.getTime();
    setTimeout(() => {
      displayCurrentDate();
      renderClatCountdown(false);
      scheduleMidnightCountdownUpdate();
    }, msUntilMidnight);
  }

  function setupClatEventHandlers() {
    const card = document.getElementById('clatCountdownCard');
    const editBtn = document.getElementById('clatEditDateBtn');
    const settingsModal = document.getElementById('settingsModal');
    const inputEl = document.getElementById('clatExamDateInput');
    const saveBtn = document.getElementById('saveClatDateBtn');
    const clearBtn = document.getElementById('clearClatDateBtn');
    const statusEl = document.getElementById('clatDateSaveStatus');
    const previewPill = document.getElementById('clatDDayPreviewPill');

    function openSettingsForClat() {
      if (!settingsModal) return;
      settingsModal.classList.add('active');
      if (inputEl) {
        inputEl.focus();
        inputEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }

    if (editBtn) {
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openSettingsForClat();
      });
    }

    if (card) {
      card.addEventListener('click', (e) => {
        if (e.target.closest('button')) return;
        openSettingsForClat();
      });
    }

    if (inputEl) {
      inputEl.addEventListener('input', () => {
        const val = inputEl.value;
        if (val) {
          const calc = calculateDDayDiff(val);
          if (calc && previewPill) {
            if (calc.diffDays > 0) previewPill.textContent = `D — ${calc.diffDays}`;
            else if (calc.diffDays === 0) previewPill.textContent = 'D — DAY';
            else previewPill.textContent = `D + ${Math.abs(calc.diffDays)}`;
          }
        } else if (previewPill) {
          previewPill.textContent = 'D — ---';
        }
      });
    }

    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        const val = inputEl ? inputEl.value : '';
        if (!val) {
          if (statusEl) {
            statusEl.textContent = 'Please select a date first.';
            statusEl.style.color = 'var(--accent-rose)';
          }
          return;
        }
        Storage.setClatExamDate(val);
        renderClatCountdown(true);
        if (statusEl) {
          statusEl.textContent = 'Target exam date saved successfully!';
          statusEl.style.color = 'var(--accent-emerald)';
          setTimeout(() => { statusEl.textContent = ''; }, 3000);
        }
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        Storage.setClatExamDate(null);
        if (inputEl) inputEl.value = '';
        renderClatCountdown(true);
        if (statusEl) {
          statusEl.textContent = 'Exam date cleared.';
          statusEl.style.color = 'var(--text-muted)';
          setTimeout(() => { statusEl.textContent = ''; }, 3000);
        }
      });
    }
  }

  function updateMetrics() {
    if (window.StudyManager && typeof window.StudyManager.render === 'function') {
      window.StudyManager.render();
    }
    if (window.StreakManager && typeof window.StreakManager.render === 'function') {
      window.StreakManager.render();
    }
  }

  return {
    init,
    switchTab,
    refreshAll,
    updateMetrics,
    renderClatCountdown,
    animateNumber,
    dismissWelcomeScreen,
    showWelcomeScreen
  };
})();

// Bootstrap app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.App = App;
  App.init();
});
