/**
 * study.js - Daily Study Tracker, Hierarchical Task & Subtask Management,
 * History Inspector, and Daily Targets
 */

const StudyManager = (() => {
  let selectedHistoryDate = Storage.getLocalDateString();
  let editingSessionId = null;
  let taskSearchQuery = '';

  function init() {
    setupTimerIntegration();
    setupEventListeners();
    populateTaskSelects();
    render();
  }

  
  function triggerStopwatchAnimation(type = 'start') {
    const heroCard = document.getElementById('heroTimerCard');
    if (!heroCard) return;
    heroCard.classList.remove('timer-activating', 'timer-resuming');
    void heroCard.offsetWidth; // Force reflow
    if (type === 'start') {
      heroCard.classList.add('timer-activating');
      setTimeout(() => {
        heroCard.classList.remove('timer-activating');
      }, 650);
    } else if (type === 'resume') {
      heroCard.classList.add('timer-resuming');
      setTimeout(() => {
        heroCard.classList.remove('timer-resuming');
      }, 450);
    }
  }

  function setupTimerIntegration() {
    const timerDisplay = document.getElementById('timerDigits');
    const startBtn = document.getElementById('timerStartBtn');
    const pauseBtn = document.getElementById('timerPauseBtn');
    const stopBtn = document.getElementById('timerStopBtn');
    const taskSelect = document.getElementById('timerTaskSelect');
    const timerTaskTag = document.getElementById('timerActiveTaskTag');
    const activeBanner = document.getElementById('activeSessionBanner');
    const bannerText = document.getElementById('activeSessionBannerText');
    const bannerStopBtn = document.getElementById('bannerStopBtn');

    StudyTimer.init({
      onTick: (elapsed, timerState) => {
        if (timerDisplay) {
          timerDisplay.textContent = StudyTimer.formatTime(elapsed);
        }
        updateTimerControls(timerState);

        // Update active banner if timer is running
        if (activeBanner) {
          if (timerState.isRunning || timerState.accumulatedSeconds > 0) {
            activeBanner.classList.add('visible');
            if (bannerText) {
              bannerText.textContent = `Active session: ${timerState.taskName} (${StudyTimer.formatTime(elapsed)})`;
            }
          } else {
            activeBanner.classList.remove('visible');
          }
        }

        if (window.FullscreenTimer && typeof window.FullscreenTimer.update === 'function') {
          window.FullscreenTimer.update();
        }
      },
      onStop: (savedSession) => {
        render();
        if (window.App && typeof window.App.updateMetrics === 'function') {
          window.App.updateMetrics();
        }
        if (window.FullscreenTimer && typeof window.FullscreenTimer.update === 'function') {
          window.FullscreenTimer.update();
        }
      }
    });

    // Check initial timer state on page load
    const currentState = StudyTimer.getState();
    if (timerDisplay) {
      timerDisplay.textContent = StudyTimer.formatTime(currentState.elapsed);
    }
    updateTimerControls(currentState);

    // Timer Start button
    if (startBtn) {
      startBtn.addEventListener('click', () => {
        const taskId = taskSelect.value;
        const taskName = taskSelect.options[taskSelect.selectedIndex]?.text || 'Study';
        const subtaskSelect = document.getElementById('timerSubtaskSelect');
        const subtaskName = subtaskSelect ? (subtaskSelect.value || 'General') : 'General';
        if (!taskId) {
          alert('Please select a study task before starting the timer.');
          return;
        }
        triggerStopwatchAnimation('start');
        StudyTimer.start(taskId, taskName, subtaskName);
        if (window.FullscreenTimer && typeof window.FullscreenTimer.update === 'function') {
          window.FullscreenTimer.update();
        }
      });
    }

    // Timer Pause button
    if (pauseBtn) {
      pauseBtn.addEventListener('click', () => {
        const curr = StudyTimer.getState();
        if (curr.isRunning) {
          const heroCard = document.getElementById('heroTimerCard');
          if (heroCard) heroCard.classList.remove('timer-activating', 'timer-resuming');
          StudyTimer.pause();
        } else {
          triggerStopwatchAnimation('resume');
          StudyTimer.resume();
        }
        if (window.FullscreenTimer && typeof window.FullscreenTimer.update === 'function') {
          window.FullscreenTimer.update();
        }
      });
    }

    // Timer Stop button
    if (stopBtn) {
      stopBtn.addEventListener('click', () => {
        const curr = StudyTimer.getState();
        const elapsed = StudyTimer.getElapsedSeconds();
        if (elapsed < 10) {
          if (!confirm('Session is very short (less than 10 seconds). Do you still want to save it?')) {
            StudyTimer.discard();
            const heroCard = document.getElementById('heroTimerCard');
            if (heroCard) heroCard.classList.remove('is-running', 'is-paused', 'timer-activating', 'timer-resuming');
            if (window.FullscreenTimer && typeof window.FullscreenTimer.update === 'function') {
              window.FullscreenTimer.update();
            }
            return;
          }
        }
        const heroCard = document.getElementById('heroTimerCard');
        if (heroCard) heroCard.classList.remove('is-running', 'is-paused', 'timer-activating', 'timer-resuming');
        StudyTimer.stop();
        if (window.FullscreenTimer && typeof window.FullscreenTimer.update === 'function') {
          window.FullscreenTimer.update();
        }
      });
    }

    // Banner Stop shortcut
    if (bannerStopBtn) {
      bannerStopBtn.addEventListener('click', () => {
        const heroCard = document.getElementById('heroTimerCard');
        if (heroCard) heroCard.classList.remove('is-running', 'is-paused', 'timer-activating', 'timer-resuming');
        StudyTimer.stop();
      });
    }
  }

  function updateTimerControls(timerState) {
    const startBtn = document.getElementById('timerStartBtn');
    const pauseBtn = document.getElementById('timerPauseBtn');
    const stopBtn = document.getElementById('timerStopBtn');
    const taskSelect = document.getElementById('timerTaskSelect');
    const timerTaskTag = document.getElementById('timerActiveTaskTag');
    const heroCard = document.getElementById('heroTimerCard');

    if (heroCard) {
      if (timerState.isRunning) {
        heroCard.classList.add('is-running');
        heroCard.classList.remove('is-paused');
      } else if (timerState.accumulatedSeconds > 0) {
        heroCard.classList.remove('is-running');
        heroCard.classList.add('is-paused');
      } else {
        heroCard.classList.remove('is-running', 'is-paused', 'timer-activating', 'timer-resuming');
      }
    }

    if (!startBtn || !pauseBtn || !stopBtn) return;

    if (timerState.isRunning) {
      startBtn.style.display = 'none';
      pauseBtn.style.display = 'inline-flex';
      pauseBtn.innerHTML = '<span>⏸ Pause</span>';
      pauseBtn.classList.remove('btn-resume');
      stopBtn.style.display = 'inline-flex';
      if (taskSelect) taskSelect.disabled = true;
      if (timerTaskTag) {
        timerTaskTag.textContent = `Tracking: ${timerState.taskName}`;
        timerTaskTag.style.display = 'inline-block';
      }
    } else if (timerState.accumulatedSeconds > 0) {
      // Paused
      startBtn.style.display = 'none';
      pauseBtn.style.display = 'inline-flex';
      pauseBtn.innerHTML = '<span>▶ Resume</span>';
      pauseBtn.classList.add('btn-resume');
      stopBtn.style.display = 'inline-flex';
      if (taskSelect) taskSelect.disabled = true;
      if (timerTaskTag) {
        timerTaskTag.textContent = `Paused: ${timerState.taskName}`;
        timerTaskTag.style.display = 'inline-block';
      }
    } else {
      // Stopped
      startBtn.style.display = 'inline-flex';
      pauseBtn.style.display = 'none';
      stopBtn.style.display = 'none';
      if (taskSelect) taskSelect.disabled = false;
      if (timerTaskTag) timerTaskTag.style.display = 'none';
    }
  }
function setupEventListeners() {
    // Task Manager Modal Trigger & Close
    const openTaskManagerBtn = document.getElementById('openTaskManagerBtn');
    const closeTaskManagerBtn = document.getElementById('closeTaskManagerBtn');
    const doneTaskManagerBtn = document.getElementById('doneTaskManagerBtn');
    const taskManagerModal = document.getElementById('taskManagerModal');

    if (openTaskManagerBtn && taskManagerModal) {
      openTaskManagerBtn.addEventListener('click', () => {
        openTaskManagerModal();
      });
    }

    if (closeTaskManagerBtn && taskManagerModal) {
      closeTaskManagerBtn.addEventListener('click', () => {
        taskManagerModal.classList.remove('active');
      });
    }

    if (doneTaskManagerBtn && taskManagerModal) {
      doneTaskManagerBtn.addEventListener('click', () => {
        taskManagerModal.classList.remove('active');
      });
    }

    // Live Search in Task Manager Modal
    const taskSearchInput = document.getElementById('taskSearchInput');
    if (taskSearchInput) {
      taskSearchInput.addEventListener('input', (e) => {
        taskSearchQuery = e.target.value.trim().toLowerCase();
        renderTaskManagerList();
      });
    }

    // Add Custom Task Modal (+ New Task button & form)
    const openAddTaskModalBtn = document.getElementById('openAddTaskModalBtn');
    const closeTaskModalBtn = document.getElementById('closeTaskModalBtn');
    const cancelTaskModalBtn = document.getElementById('cancelTaskModalBtn');
    const taskModal = document.getElementById('taskModal');
    const taskForm = document.getElementById('taskForm');
    const taskNameInput = document.getElementById('taskNameInput');

    if (openAddTaskModalBtn) {
      openAddTaskModalBtn.addEventListener('click', openTaskModal);
    }
    if (closeTaskModalBtn) {
      closeTaskModalBtn.addEventListener('click', closeTaskModal);
    }
    if (cancelTaskModalBtn) {
      cancelTaskModalBtn.addEventListener('click', closeTaskModal);
    }
    if (taskForm) {
      taskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = taskNameInput ? taskNameInput.value.trim() : '';
        if (!name) return;
        const newTask = Storage.addTask(name);
        closeTaskModal();
        if (taskNameInput) taskNameInput.value = '';
        populateTaskSelects();
        renderTaskManagerList();
        render();

        // Select the newly created task in dropdowns for immediate use
        if (newTask && newTask.id) {
          const cdSelect = document.getElementById('countdownTaskSelect');
          if (cdSelect) {
            cdSelect.value = newTask.id;
            if (window.CountdownTimer && typeof window.CountdownTimer.populateSubtaskSelect === 'function') {
              window.CountdownTimer.populateSubtaskSelect();
            }
          }
        }
      });
    }

    // Manual Time Log Modal
    const openManualLogBtn = document.getElementById('openManualLogBtn');
    const closeManualLogBtn = document.getElementById('closeManualLogBtn');
    const cancelManualLogBtn = document.getElementById('cancelManualLogBtn');
    const manualLogForm = document.getElementById('manualLogForm');
    const manualTaskSelect = document.getElementById('manualTaskSelect');

    if (openManualLogBtn) {
      openManualLogBtn.addEventListener('click', () => openManualLogModal());
    }
    const closeManualModal = () => {
      const modal = document.getElementById('manualLogModal');
      if (modal) modal.classList.remove('active');
      editingSessionId = null;
    };
    if (closeManualLogBtn) closeManualLogBtn.addEventListener('click', closeManualModal);
    if (cancelManualLogBtn) cancelManualLogBtn.addEventListener('click', closeManualModal);

    if (manualTaskSelect) {
      manualTaskSelect.addEventListener('change', () => {
        populateSubtaskSelectForManual();
      });
    }

    const timerTaskSelect = document.getElementById('timerTaskSelect');
    if (timerTaskSelect) {
      timerTaskSelect.addEventListener('change', () => {
        populateSubtaskSelectForTimer();
      });
    }

    if (manualLogForm) {
      manualLogForm.addEventListener('submit', handleManualLogSubmit);
    }

    // Date navigation in Daily History
    const prevDayBtn = document.getElementById('histPrevDayBtn');
    const nextDayBtn = document.getElementById('histNextDayBtn');
    const todayBtn = document.getElementById('histTodayBtn');
    const datePicker = document.getElementById('histDatePicker');

    if (prevDayBtn) {
      prevDayBtn.addEventListener('click', () => shiftHistoryDate(-1));
    }
    if (nextDayBtn) {
      nextDayBtn.addEventListener('click', () => shiftHistoryDate(1));
    }
    if (todayBtn) {
      todayBtn.addEventListener('click', () => {
        selectedHistoryDate = Storage.getLocalDateString();
        updateHistoryDateDisplay();
        renderHistory();
      });
    }
    if (datePicker) {
      datePicker.addEventListener('change', (e) => {
        if (e.target.value) {
          selectedHistoryDate = e.target.value;
          updateHistoryDateDisplay();
          renderHistory();
        }
      });
    }

    // Daily Target Input listener
    const targetInput = document.getElementById('studyDailyTargetInput');
    if (targetInput) {
      targetInput.value = Storage.getDailyTargetHours();
      targetInput.addEventListener('change', () => {
        const val = parseFloat(targetInput.value);
        if (!isNaN(val) && val > 0) {
          Storage.setDailyTargetHours(val);
          updateTodayTotalAndTarget();
        }
      });
    }

    // Study Checklist Event Listeners
    const addChecklistBtn = document.getElementById('checklistAddTaskBtn');
    const closeChecklistBtn = document.getElementById('closeChecklistModalBtn');
    const cancelChecklistBtn = document.getElementById('cancelChecklistModalBtn');
    const checklistForm = document.getElementById('checklistForm');
    const checklistModal = document.getElementById('checklistModal');

    if (addChecklistBtn) {
      addChecklistBtn.addEventListener('click', () => openChecklistModal(null));
    }
    if (closeChecklistBtn) {
      closeChecklistBtn.addEventListener('click', closeChecklistModal);
    }
    if (cancelChecklistBtn) {
      cancelChecklistBtn.addEventListener('click', closeChecklistModal);
    }
    if (checklistForm) {
      checklistForm.addEventListener('submit', handleChecklistFormSubmit);
    }
    if (checklistModal) {
      checklistModal.addEventListener('click', (e) => {
        if (e.target === checklistModal) closeChecklistModal();
      });
    }
  }


  function populateTaskSelects() {
    const tasks = Storage.getTasks();
    const timerSelect = document.getElementById('timerTaskSelect');
    const manualSelect = document.getElementById('manualTaskSelect');

    const generateOptions = () => {
      return tasks.map(t => `<option value="${t.id}">${escapeHtml(t.name)}</option>`).join('');
    };

    if (timerSelect) {
      const prevVal = timerSelect.value;
      timerSelect.innerHTML = generateOptions();
      if (prevVal && tasks.some(t => t.id === prevVal)) {
        timerSelect.value = prevVal;
      }
      populateSubtaskSelectForTimer();
    }

    if (manualSelect) {
      const prevVal = manualSelect.value;
      manualSelect.innerHTML = generateOptions();
      if (prevVal && tasks.some(t => t.id === prevVal)) {
        manualSelect.value = prevVal;
      }
      populateSubtaskSelectForManual();
    }

    if (window.CountdownTimer && typeof window.CountdownTimer.populateTaskSelect === 'function') {
      window.CountdownTimer.populateTaskSelect();
    }
  }

  function populateSubtaskSelectForTimer() {
    const taskSelect = document.getElementById('timerTaskSelect');
    const subtaskSelect = document.getElementById('timerSubtaskSelect');
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

    if (prevSub && subtasks.includes(prevSub)) {
      subtaskSelect.value = prevSub;
    }
  }

  function populateSubtaskSelectForManual() {
    const taskSelect = document.getElementById('manualTaskSelect');
    const subtaskSelect = document.getElementById('manualSubtaskSelect');
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

  function openTaskModal() {
    const modal = document.getElementById('taskModal');
    const input = document.getElementById('taskNameInput');
    if (!modal) return;
    if (input) input.value = '';
    modal.classList.add('active');
    if (input) {
      setTimeout(() => input.focus(), 50);
    }
  }

  function closeTaskModal() {
    const modal = document.getElementById('taskModal');
    if (modal) modal.classList.remove('active');
  }

  function openTaskManagerModal() {
    const modal = document.getElementById('taskManagerModal');
    if (!modal) return;
    const searchInput = document.getElementById('taskSearchInput');
    if (searchInput) {
      taskSearchQuery = searchInput.value.trim().toLowerCase();
    }
    renderTaskManagerList();
    modal.classList.add('active');
    if (searchInput) {
      setTimeout(() => searchInput.focus(), 50);
    }
  }

  function renderTaskManagerList() {
    const container = document.getElementById('taskManagerListContainer');
    if (!container) return;

    const searchInput = document.getElementById('taskSearchInput');
    if (searchInput) {
      taskSearchQuery = searchInput.value.trim().toLowerCase();
    }

    const tasks = Storage.getTasks();
    let filteredTasks = tasks;

    if (taskSearchQuery) {
      filteredTasks = tasks.filter(t => {
        const nameMatches = t.name && t.name.toLowerCase().includes(taskSearchQuery);
        const subtasks = Array.isArray(t.subtasks) ? t.subtasks : [];
        const subtaskMatches = subtasks.some(st => st.toLowerCase().includes(taskSearchQuery));
        return nameMatches || subtaskMatches;
      });
    }

    if (filteredTasks.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="padding: 36px 20px; text-align: center;">
          <p class="empty-subtitle" style="color: var(--text-muted); font-size: 13px;">${taskSearchQuery ? `No tasks or subtopics match "${escapeHtml(taskSearchQuery)}".` : 'No study tasks configured.'}</p>
        </div>
      `;
      return;
    }

    let html = '';

    filteredTasks.forEach(t => {
      const subtasks = Array.isArray(t.subtasks) ? t.subtasks : [];
      html += `
        <div class="task-manager-card" data-task-id="${t.id}">
          <div class="task-manager-card-header">
            <div class="task-manager-title-wrap">
              <span class="task-manager-name">${escapeHtml(t.name)}</span>
              ${t.isDefault ? '<span class="default-chip">Default</span>' : ''}
            </div>
            <div class="task-manager-actions">
              <button type="button" class="btn-action btn-rename-task" data-id="${t.id}" data-name="${escapeHtml(t.name)}" title="Rename task">Rename</button>
              <button type="button" class="btn-action btn-delete-task" data-id="${t.id}" title="Delete task">Delete</button>
            </div>
          </div>

          <div class="subtasks-manager-area">
            <span class="subtasks-label">Subtopics:</span>
            <div class="subtasks-pill-list">
              ${subtasks.map(st => {
                const isMatch = taskSearchQuery && st.toLowerCase().includes(taskSearchQuery);
                return `
                  <span class="subtask-mgr-pill${isMatch ? ' match-highlight' : ''}">
                    ${escapeHtml(st)}
                    <button type="button" class="btn-del-subtask" data-task-id="${t.id}" data-subtask="${escapeHtml(st)}" title="Remove subtopic">&times;</button>
                  </span>
                `;
              }).join('')}
            </div>
            <div class="add-subtask-row">
              <input type="text" class="text-input text-input-sm new-subtask-input" placeholder="Add subtopic (e.g. Torts)...">
              <button type="button" class="btn btn-secondary btn-sm btn-add-subtask" data-task-id="${t.id}">+ Add Subtopic</button>
            </div>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;

    // Rename Task
    container.querySelectorAll('.btn-rename-task').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const currentName = btn.getAttribute('data-name');
        const newName = prompt('Enter new name for task:', currentName);
        if (newName && newName.trim() && newName.trim() !== currentName) {
          Storage.renameTask(id, newName.trim());
          renderTaskManagerList();
          populateTaskSelects();
          render();
        }
      });
    });

    // Delete Task
    container.querySelectorAll('.btn-delete-task').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        if (confirm('Are you sure you want to remove this task? (Historical study records will remain intact with their existing names).')) {
          Storage.deleteTask(id);
          renderTaskManagerList();
          populateTaskSelects();
          render();
        }
      });
    });

    // Delete Subtask
    container.querySelectorAll('.btn-del-subtask').forEach(btn => {
      btn.addEventListener('click', () => {
        const taskId = btn.getAttribute('data-task-id');
        const subtask = btn.getAttribute('data-subtask');
        Storage.deleteSubtask(taskId, subtask);
        renderTaskManagerList();
        populateTaskSelects();
      });
    });

    // Add Subtask
    container.querySelectorAll('.btn-add-subtask').forEach(btn => {
      btn.addEventListener('click', () => {
        const taskId = btn.getAttribute('data-task-id');
        const card = btn.closest('.task-manager-card');
        const input = card ? card.querySelector('.new-subtask-input') : null;
        const subName = input ? input.value.trim() : '';
        if (subName) {
          Storage.addSubtask(taskId, subName);
          renderTaskManagerList();
          populateTaskSelects();
        }
      });
    });

    // Allow Enter key to trigger add-subtopic
    container.querySelectorAll('.new-subtask-input').forEach(input => {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const card = input.closest('.task-manager-card');
          const btn = card ? card.querySelector('.btn-add-subtask') : null;
          if (btn) btn.click();
        }
      });
    });
  }

  function shiftHistoryDate(days) {
    const current = new Date(selectedHistoryDate + 'T00:00:00');
    current.setDate(current.getDate() + days);
    selectedHistoryDate = Storage.getLocalDateString(current);
    updateHistoryDateDisplay();
    renderHistory();
  }

  function updateHistoryDateDisplay() {
    const datePicker = document.getElementById('histDatePicker');
    const label = document.getElementById('histSelectedDateLabel');
    if (datePicker) datePicker.value = selectedHistoryDate;

    if (label) {
      const todayStr = Storage.getLocalDateString();
      const d = new Date(selectedHistoryDate + 'T00:00:00');
      const options = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' };
      const formatted = d.toLocaleDateString(undefined, options);

      if (selectedHistoryDate === todayStr) {
        label.innerHTML = `<strong>Today</strong> (${formatted})`;
      } else {
        label.textContent = formatted;
      }
    }
  }

  function openManualLogModal(session = null) {
    const modal = document.getElementById('manualLogModal');
    const title = document.getElementById('manualLogModalTitle');
    const form = document.getElementById('manualLogForm');
    if (!modal || !form) return;

    form.reset();
    populateTaskSelects();
    editingSessionId = session ? session.id : null;

    if (session) {
      title.textContent = 'Edit Study Session';
      document.getElementById('manualDateInput').value = session.date;
      document.getElementById('manualTaskSelect').value = session.taskId;
      populateSubtaskSelectForManual();
      const subSelect = document.getElementById('manualSubtaskSelect');
      if (subSelect && session.subtaskName) {
        subSelect.value = session.subtaskName;
      }
      const hours = Math.floor(session.duration / 3600);
      const minutes = Math.floor((session.duration % 3600) / 60);
      document.getElementById('manualHoursInput').value = hours;
      document.getElementById('manualMinutesInput').value = minutes;
    } else {
      title.textContent = 'Log Completed Study Time';
      document.getElementById('manualDateInput').value = selectedHistoryDate || Storage.getLocalDateString();
      populateSubtaskSelectForManual();
      document.getElementById('manualHoursInput').value = 1;
      document.getElementById('manualMinutesInput').value = 0;
    }

    modal.classList.add('active');
  }

  function handleManualLogSubmit(e) {
    e.preventDefault();

    const date = document.getElementById('manualDateInput').value;
    const taskSelect = document.getElementById('manualTaskSelect');
    const subtaskSelect = document.getElementById('manualSubtaskSelect');
    const taskId = taskSelect.value;
    const taskName = taskSelect.options[taskSelect.selectedIndex]?.text || 'Study';
    const subtaskName = subtaskSelect ? subtaskSelect.value : 'General';
    const hours = parseInt(document.getElementById('manualHoursInput').value, 10) || 0;
    const minutes = parseInt(document.getElementById('manualMinutesInput').value, 10) || 0;

    const totalSeconds = (hours * 3600) + (minutes * 60);
    if (totalSeconds <= 0) {
      alert('Duration must be greater than 0 minutes.');
      return;
    }

    const payload = {
      date,
      taskId,
      taskName,
      subtaskName: subtaskName || 'General',
      duration: totalSeconds,
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString()
    };

    if (editingSessionId) {
      payload.id = editingSessionId;
    }

    Storage.saveSession(payload);

    const modal = document.getElementById('manualLogModal');
    if (modal) modal.classList.remove('active');
    editingSessionId = null;

    render();
    if (window.App && typeof window.App.updateMetrics === 'function') {
      window.App.updateMetrics();
    }
  }

  function handleEditSession(id) {
    const sessions = Storage.getSessions();
    const sess = sessions.find(s => s.id === id);
    if (sess) {
      openManualLogModal(sess);
    }
  }

  function handleDeleteSession(id) {
    if (confirm('Are you sure you want to delete this study session? All charts and totals will recalculate.')) {
      Storage.deleteSession(id);
      render();
      if (window.App && typeof window.App.updateMetrics === 'function') {
        window.App.updateMetrics();
      }
    }
  }

  function calculateStreak() {
    if (window.StreakManager && typeof window.StreakManager.calculateAnalytics === 'function') {
      return window.StreakManager.calculateAnalytics().currentStreak;
    }
    return 0;
  }

  function updateTodayTotalAndTarget() {
    const todayStr = Storage.getLocalDateString();
    const sessions = Storage.getSessions();

    const todayCompletedSeconds = sessions
      .filter(s => s.date === todayStr)
      .reduce((acc, s) => acc + (s.duration || 0), 0);

    const cdTimer = window.CountdownTimer ? window.CountdownTimer.getState() : null;
    const cdLive = (cdTimer && cdTimer.isRunning) ? (cdTimer.totalSeconds - cdTimer.remainingSeconds) : 0;
    
    const swTimer = window.StudyTimer ? window.StudyTimer.getState() : null;
    const swLive = (swTimer && swTimer.isRunning) ? swTimer.elapsed : 0;
    
    const totalTodaySeconds = todayCompletedSeconds + cdLive + swLive;

    // Update Top Today's Total Hero Display
    const todayTotalHero = document.getElementById('studyTodayTotalHero');
    if (todayTotalHero) {
      todayTotalHero.textContent = StudyTimer.formatDurationHuman(totalTodaySeconds, false);
    }

    // Update Daily Target Card
    const targetHours = Storage.getDailyTargetHours();
    const targetSeconds = targetHours * 3600;
    const progressPct = targetSeconds > 0 ? ((totalTodaySeconds / targetSeconds) * 100).toFixed(1) : 0;

    const targetValEl = document.getElementById('studyTargetHoursDisplay');
    const currentValEl = document.getElementById('studyTargetCurrentDisplay');
    const pctValEl = document.getElementById('studyTargetPctDisplay');
    const progressBar = document.getElementById('studyTargetProgressBar');
    const statusBadge = document.getElementById('studyTargetStatusBadge');

    if (targetValEl) targetValEl.textContent = `${targetHours}h`;
    if (currentValEl) currentValEl.textContent = StudyTimer.formatDurationHuman(totalTodaySeconds, false);
    if (pctValEl) pctValEl.textContent = `${progressPct}%`;
    if (progressBar) progressBar.style.width = `${Math.min(100, Math.max(0, progressPct))}%`;

    const targetCard = document.getElementById('studyTargetCard');
    if (targetCard) {
      if (parseFloat(progressPct) >= 100) {
        targetCard.classList.add('target-achieved');
      } else {
        targetCard.classList.remove('target-achieved');
      }
    }

    if (statusBadge) {
      if (parseFloat(progressPct) >= 100) {
        statusBadge.innerHTML = `<span class="target-badge-complete animate-pulse-glow">🎯 TARGET ACHIEVED! 🔥</span>`;
      } else {
        const remainingSec = Math.max(0, targetSeconds - totalTodaySeconds);
        statusBadge.innerHTML = `<span class="target-badge-remaining font-mono">${StudyTimer.formatDurationHuman(remainingSec, false)} remaining</span>`;
      }
    }
  }

  function render() {
    const todayStr = Storage.getLocalDateString();
    const sessions = Storage.getSessions();

    // Render Today's Total and Daily Target
    updateTodayTotalAndTarget();

    // Render Today's Breakdown with Subtasks Accordion
    Charts.renderTodayBreakdown('todayBreakdownContainer', sessions, todayStr);

    // Render 7-day Weekly Study Chart
    Charts.renderWeeklyStudyChart('weeklyStudyChartContainer', sessions);

    // Render Today's Study Checklist
    renderChecklist();

    // Render History View for selected date
    updateHistoryDateDisplay();
    renderHistory();
  }

  function renderHistory() {
    const sessions = Storage.getSessions();
    const daySessions = sessions.filter(s => s.date === selectedHistoryDate);
    const container = document.getElementById('historySessionsList');
    const totalDisplay = document.getElementById('histDateTotal');
    const breakdownContainer = document.getElementById('histDateBreakdown');

    const totalSeconds = daySessions.reduce((acc, s) => acc + (s.duration || 0), 0);

    if (totalDisplay) {
      totalDisplay.textContent = StudyTimer.formatDurationHuman(totalSeconds, true);
    }

    // Breakdown for selected date
    if (breakdownContainer) {
      if (daySessions.length === 0) {
        breakdownContainer.innerHTML = '';
      } else {
        const taskMap = {};
        daySessions.forEach(s => {
          taskMap[s.taskName] = (taskMap[s.taskName] || 0) + s.duration;
        });
        const parts = Object.entries(taskMap).map(([tName, dur]) => {
          return `<span class="hist-task-pill">${escapeHtml(tName)}: <strong>${StudyTimer.formatDurationHuman(dur)}</strong></span>`;
        });
        breakdownContainer.innerHTML = parts.join(' ');
      }
    }

    if (!container) return;

    if (daySessions.length === 0) {
      container.innerHTML = `
        <div class="empty-hist-state">
          <p class="text-muted">No sessions recorded on this date.</p>
        </div>
      `;
      return;
    }

    let html = '<div class="session-items-list">';
    daySessions.forEach(s => {
      const subLabel = s.subtaskName && s.subtaskName !== 'General'
        ? `<span class="session-subtask-tag">${escapeHtml(s.subtaskName)}</span>`
        : '';

      html += `
        <div class="session-item-row">
          <div class="session-info">
            <span class="session-task-badge">${escapeHtml(s.taskName)}</span>
            ${subLabel}
            <span class="session-duration font-mono">${StudyTimer.formatDurationHuman(s.duration, true)}</span>
          </div>
          <div class="session-actions">
            <button type="button" class="btn-action btn-edit-sess" data-id="${s.id}" title="Edit session">Edit</button>
            <button type="button" class="btn-action btn-del-sess" data-id="${s.id}" title="Delete session">Delete</button>
          </div>
        </div>
      `;
    });
    html += '</div>';

    container.innerHTML = html;

    container.querySelectorAll('.btn-edit-sess').forEach(b => {
      b.addEventListener('click', () => handleEditSession(b.getAttribute('data-id')));
    });
    container.querySelectorAll('.btn-del-sess').forEach(b => {
      b.addEventListener('click', () => handleDeleteSession(b.getAttribute('data-id')));
    });
  }

  // =========================================================================
  // Today's Study Checklist Engine
  // =========================================================================
  let editingChecklistId = null;

  function openChecklistModal(item = null) {
    const modal = document.getElementById('checklistModal');
    const title = document.getElementById('checklistModalTitle');
    const nameInput = document.getElementById('checklistTaskNameInput');
    const catSelect = document.getElementById('checklistCategorySelect');
    const subInput = document.getElementById('checklistSubtopicInput');
    const statusMsg = document.getElementById('checklistFormStatus');
    if (!modal) return;

    if (statusMsg) { statusMsg.textContent = ''; }
    editingChecklistId = item ? item.id : null;

    if (title) {
      title.textContent = item ? 'Edit Study Task' : 'Add Study Task';
    }

    // Populate Category select from Storage tasks
    if (catSelect) {
      const tasks = Storage.getTasks();
      let opts = '<option value="">(Select Category / Subject)</option>';
      tasks.forEach(t => {
        opts += `<option value="${escapeHtml(t.name)}">${escapeHtml(t.name)}</option>`;
      });
      opts += '<option value="Mock Test">Mock Test</option>';
      opts += '<option value="Mock Analysis">Mock Analysis</option>';
      opts += '<option value="Revision">Revision</option>';
      opts += '<option value="Sectional Practice">Sectional Practice</option>';
      opts += '<option value="General">General</option>';
      catSelect.innerHTML = opts;

      if (item && item.category) {
        catSelect.value = item.category;
      } else {
        catSelect.value = '';
      }
    }

    if (nameInput) {
      nameInput.value = item ? item.name : '';
    }
    if (subInput) {
      subInput.value = item ? (item.subtopic || '') : '';
    }

    modal.classList.add('active');
    if (nameInput) {
      setTimeout(() => nameInput.focus(), 60);
    }
  }

  function closeChecklistModal() {
    const modal = document.getElementById('checklistModal');
    if (modal) modal.classList.remove('active');
    editingChecklistId = null;
  }

  function handleChecklistFormSubmit(e) {
    e.preventDefault();
    const nameInput = document.getElementById('checklistTaskNameInput');
    const catSelect = document.getElementById('checklistCategorySelect');
    const subInput = document.getElementById('checklistSubtopicInput');
    const statusMsg = document.getElementById('checklistFormStatus');

    const name = nameInput ? nameInput.value.trim() : '';
    const category = catSelect ? catSelect.value.trim() : '';
    const subtopic = subInput ? subInput.value.trim() : '';

    if (!name) {
      if (statusMsg) {
        statusMsg.textContent = 'Please enter a task name.';
        statusMsg.style.color = 'var(--accent-rose)';
      }
      if (nameInput) nameInput.focus();
      return;
    }

    if (editingChecklistId) {
      Storage.updateChecklistItem(editingChecklistId, { name, category, subtopic });
    } else {
      Storage.addChecklistItem({ name, category, subtopic, completed: false });
    }

    closeChecklistModal();
    renderChecklist();
  }

  function renderChecklist() {
    const container = document.getElementById('studyChecklistContainer');
    const countText = document.getElementById('checklistProgressText');
    const pctText = document.getElementById('checklistPctText');
    const progressBar = document.getElementById('checklistProgressBar');
    if (!container) return;

    const todayStr = Storage.getLocalDateString();
    const items = Storage.getChecklist(todayStr);

    const total = items.length;
    const completed = items.filter(i => i.completed).length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

    if (countText) {
      countText.textContent = `${completed} / ${total} completed`;
    }
    if (pctText) {
      pctText.textContent = `${pct}%`;
    }
    if (progressBar) {
      progressBar.style.width = `${pct}%`;
    }

    if (items.length === 0) {
      container.innerHTML = `
        <div class="checklist-empty-state">
          <p class="text-muted" style="font-size: 13px; text-align: center; padding: 24px 0;">
            No study tasks added for today yet. Click <strong>+ Add Task</strong> to build today's checklist.
          </p>
        </div>
      `;
      return;
    }

    let html = '<div class="checklist-items-grid">';
    items.forEach(item => {
      const isDone = !!item.completed;
      html += `
        <div class="chk-item ${isDone ? 'is-completed' : ''}" data-id="${item.id}">
          <button type="button" class="chk-checkbox-btn" data-id="${item.id}" aria-label="${isDone ? 'Mark incomplete' : 'Mark completed'}" title="${isDone ? 'Mark incomplete' : 'Mark completed'}">
            <span class="chk-box-inner">
              ${isDone ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>` : ''}
            </span>
          </button>
          <div class="chk-info-wrap">
            <span class="chk-title">${escapeHtml(item.name)}</span>
            ${(item.category || item.subtopic) ? `
              <div class="chk-tag-row">
                ${item.category ? `<span class="chk-category-tag font-mono">${escapeHtml(item.category)}</span>` : ''}
                ${item.subtopic ? `<span class="chk-subtopic-tag font-mono">${escapeHtml(item.subtopic)}</span>` : ''}
              </div>
            ` : ''}
          </div>
          <div class="chk-item-actions">
            <button type="button" class="btn-action chk-btn-edit" data-id="${item.id}" title="Edit task">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button type="button" class="btn-action chk-btn-delete" data-id="${item.id}" title="Delete task">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
            </button>
          </div>
        </div>
      `;
    });
    html += '</div>';

    container.innerHTML = html;

    // Attach checkbox toggle listeners
    container.querySelectorAll('.chk-checkbox-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        Storage.toggleChecklistItem(id);
        renderChecklist();
      });
    });

    // Attach edit listeners
    container.querySelectorAll('.chk-btn-edit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        const todayItems = Storage.getChecklist(Storage.getLocalDateString());
        const item = todayItems.find(i => i.id === id);
        if (item) openChecklistModal(item);
      });
    });

    // Attach delete listeners
    container.querySelectorAll('.chk-btn-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        const todayItems = Storage.getChecklist(Storage.getLocalDateString());
        const item = todayItems.find(i => i.id === id);
        if (item && confirm(`Delete "${item.name}" from today's checklist?`)) {
          Storage.deleteChecklistItem(id);
          renderChecklist();
        }
      });
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
    renderChecklist,
    openChecklistModal,
    closeChecklistModal,
    calculateStreak,
    openManualLogModal,
    openTaskManagerModal,
    openTaskModal,
    closeTaskModal,
    populateTaskSelects,
    updateTodayTotalAndTarget
  };
})();

window.StudyManager = StudyManager;


