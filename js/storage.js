/**
 * storage.js - Central Data Store for My Prep Dashboard
 * Handles LocalStorage persistence, schema verification, sample data seeding, and JSON backup/restore.
 */

const Storage = (() => {
  const KEYS = {
    MOCKS: 'myprep_mocks',
    ERRORS: 'myprep_errors',
    TASKS: 'myprep_tasks',
    SESSIONS: 'myprep_sessions',
    ACTIVE_TIMER: 'myprep_active_timer',
    DAILY_TARGET: 'myprep_daily_target_hours',
    POMODORO_SETTINGS: 'myprep_pomodoro_settings',
    POMODORO_STATE: 'myprep_pomodoro_state',
    STREAK_THRESHOLD: 'myprep_streak_threshold_minutes',
    CLAT_EXAM_DATE: 'myprep_clat_exam_date',
    SECTIONALS: 'myprep_sectionals',
    MOCK_SCHEDULE: 'myprep_mock_schedule',
    CHECKLIST: 'myprep_study_checklist',
    INITIALIZED: 'myprep_initialized_v1'
  };

  const DEFAULT_TASKS = [
    { 
      id: 'task-english', 
      name: 'English', 
      subtasks: ['Vocabulary', 'Reading Comprehension', 'Grammar', 'Para Jumbles'], 
      isDefault: true 
    },
    { 
      id: 'task-gk', 
      name: 'GK', 
      subtasks: ['Current Affairs', 'Polity', 'Economy', 'International Affairs'], 
      isDefault: true 
    },
    { 
      id: 'task-legal', 
      name: 'Legal', 
      subtasks: ['Contract Law', 'Torts', 'Constitution', 'Legal Current Affairs'], 
      isDefault: true 
    },
    { 
      id: 'task-logical', 
      name: 'Logical', 
      subtasks: ['Assumptions', 'Strengthen/Weaken', 'Inference', 'Critical Reasoning'], 
      isDefault: true 
    },
    { 
      id: 'task-quant', 
      name: 'Quant', 
      subtasks: ['Percentages', 'Ratios', 'Profit & Loss', 'Time & Work'], 
      isDefault: true 
    },
    { 
      id: 'task-mock-test', 
      name: 'Mock Test', 
      subtasks: ['Full Mock', 'Sectional Test'], 
      isDefault: true 
    },
    { 
      id: 'task-mock-analysis', 
      name: 'Mock Analysis', 
      subtasks: ['Error Review', 'Strategy Review'], 
      isDefault: true 
    }
  ];

  // Helper to format date as YYYY-MM-DD in local time
  function getLocalDateString(dateObj = new Date()) {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Generate realistic seed data if user starts with an empty store
  function getSeedData() {
    const today = new Date();
    const dMinus = (days) => {
      const d = new Date(today);
      d.setDate(d.getDate() - days);
      return getLocalDateString(d);
    };

    // Realistic mocks with independent sectional maximums, questions attempted, and correct counts
    const mocks = [
      {
        id: 'mock-1',
        name: 'Mock 1',
        date: dMinus(18),
        score: 61,
        maxScore: 120,
        sections: {
          english: { score: 14, maxScore: 24, totalQuestions: 24, attempted: 17, correct: 13 },
          gk: { score: 8, maxScore: 28, totalQuestions: 28, attempted: 14, correct: 8 },
          legal: { score: 18, maxScore: 30, totalQuestions: 30, attempted: 21, correct: 17 },
          logical: { score: 15, maxScore: 24, totalQuestions: 24, attempted: 16, correct: 14 },
          quant: { score: 6, maxScore: 14, totalQuestions: 14, attempted: 7, correct: 5 }
        },
        createdAt: Date.now() - 18 * 86400000
      },
      {
        id: 'mock-2',
        name: 'Mock 2',
        date: dMinus(14),
        score: 68,
        maxScore: 120,
        sections: {
          english: { score: 16, maxScore: 24, totalQuestions: 24, attempted: 18, correct: 15 },
          gk: { score: 10, maxScore: 28, totalQuestions: 28, attempted: 16, correct: 10 },
          legal: { score: 20, maxScore: 30, totalQuestions: 30, attempted: 22, correct: 19 },
          logical: { score: 16, maxScore: 24, totalQuestions: 24, attempted: 17, correct: 15 },
          quant: { score: 6, maxScore: 14, totalQuestions: 14, attempted: 8, correct: 5 }
        },
        createdAt: Date.now() - 14 * 86400000
      },
      {
        id: 'mock-3',
        name: 'Mock 3',
        date: dMinus(10),
        score: 64,
        maxScore: 120,
        sections: {
          english: { score: 15, maxScore: 24, totalQuestions: 24, attempted: 18, correct: 14 },
          gk: { score: 9, maxScore: 28, totalQuestions: 28, attempted: 15, correct: 9 },
          legal: { score: 19, maxScore: 30, totalQuestions: 30, attempted: 23, correct: 18 },
          logical: { score: 14, maxScore: 24, totalQuestions: 24, attempted: 16, correct: 13 },
          quant: { score: 7, maxScore: 14, totalQuestions: 14, attempted: 8, correct: 6 }
        },
        createdAt: Date.now() - 10 * 86400000
      },
      {
        id: 'mock-4',
        name: 'Mock 4',
        date: dMinus(6),
        score: 73,
        maxScore: 120,
        sections: {
          english: { score: 18, maxScore: 24, totalQuestions: 24, attempted: 19, correct: 16 },
          gk: { score: 12, maxScore: 28, totalQuestions: 28, attempted: 17, correct: 12 },
          legal: { score: 22, maxScore: 30, totalQuestions: 30, attempted: 24, correct: 20 },
          logical: { score: 15, maxScore: 24, totalQuestions: 24, attempted: 17, correct: 14 },
          quant: { score: 6, maxScore: 14, totalQuestions: 14, attempted: 7, correct: 5 }
        },
        createdAt: Date.now() - 6 * 86400000
      },
      {
        id: 'mock-5',
        name: 'Mock 5',
        date: dMinus(3),
        score: 79,
        maxScore: 120,
        sections: {
          english: { score: 20, maxScore: 24, totalQuestions: 24, attempted: 21, correct: 18 },
          gk: { score: 13, maxScore: 28, totalQuestions: 28, attempted: 17, correct: 13 },
          legal: { score: 23, maxScore: 30, totalQuestions: 30, attempted: 24, correct: 21 },
          logical: { score: 16, maxScore: 24, totalQuestions: 24, attempted: 18, correct: 15 },
          quant: { score: 7, maxScore: 14, totalQuestions: 14, attempted: 8, correct: 6 }
        },
        createdAt: Date.now() - 3 * 86400000
      },
      {
        id: 'mock-6',
        name: 'Mock 12',
        date: dMinus(0),
        score: 87,
        maxScore: 120,
        sections: {
          english: { score: 18, maxScore: 24, totalQuestions: 24, attempted: 20, correct: 16 },
          gk: { score: 12, maxScore: 28, totalQuestions: 28, attempted: 18, correct: 12 },
          legal: { score: 22, maxScore: 30, totalQuestions: 30, attempted: 24, correct: 22 },
          logical: { score: 17, maxScore: 24, totalQuestions: 24, attempted: 19, correct: 16 },
          quant: { score: 8, maxScore: 14, totalQuestions: 14, attempted: 9, correct: 6 }
        },
        createdAt: Date.now()
      }
    ];

    // Seed errors as detailed in the prompt
    const errors = [
      {
        id: 'err-1',
        subject: 'Legal',
        topic: 'Void vs Voidable Contract',
        mistake: 'I selected voidable because I confused the legal effect.',
        reason: "I didn't properly distinguish whether the contract is invalid from the beginning or can be rescinded.",
        correctApproach: 'Review the distinction between void and voidable agreements. Void ab initio produces zero legal rights.',
        mockRef: 'Mock 12',
        createdAt: Date.now() - 86400000
      },
      {
        id: 'err-2',
        subject: 'Logical',
        topic: 'Critical Reasoning - Assumption Question',
        mistake: 'Picked an option that restated a stated premise rather than an unstated assumption.',
        reason: 'Rushed through the question without applying the Negation Technique.',
        correctApproach: 'Always apply the negation test on the top 2 candidates. If negated statement destroys the argument, it is an assumption.',
        mockRef: 'Mock 5',
        createdAt: Date.now() - 3 * 86400000
      },
      {
        id: 'err-3',
        subject: 'Quant',
        topic: 'Time and Work - Inverse Proportions',
        mistake: 'Directly added efficiency without taking reciprocal of days.',
        reason: 'Calculation speed pressure led to formula mixup.',
        correctApproach: 'Work = Rate x Time. Convert all workers to fraction of work per day before summing.',
        mockRef: 'Mock 4',
        createdAt: Date.now() - 6 * 86400000
      },
      {
        id: 'err-4',
        subject: 'English',
        topic: 'Tone of Passage - Sarcastic vs Cynical',
        mistake: 'Identified author tone as purely critical instead of satirical.',
        reason: 'Missed ironical word choice in paragraph 3.',
        correctApproach: 'Look for exaggeration and rhetorical questions which flag satire and sarcasm rather than pure objective critique.',
        mockRef: 'Mock 3',
        createdAt: Date.now() - 10 * 86400000
      },
      {
        id: 'err-5',
        subject: 'GK',
        topic: 'Constitutional Amendments - 106th Amendment Act',
        mistake: 'Confused the effective implementation year with the bill introduction year.',
        reason: 'Did not notice the clause on delimitation following the next census.',
        correctApproach: 'Remember Nari Shakti Vandan Adhiniyam takes effect after delimitation following the first census post-enactment.',
        mockRef: 'Mock 12',
        source: 'mock',
        status: 'Unrevised',
        createdAt: Date.now() - 20000000
      },
      // Seed sectional errors demonstrating topic repetition and status workflow
      {
        id: 'sec-err-1',
        source: 'sectional',
        date: dMinus(1),
        subject: 'Legal',
        topic: 'Law of Torts - Strict Liability',
        questionType: 'Principle-Fact Application',
        mistakeType: 'Conceptual Error',
        mistake: 'Applied absolute liability exception where strict liability defenses were applicable.',
        reason: 'Rushed through the exception criteria under Rylands v. Fletcher without checking non-natural use.',
        correctApproach: 'Always identify whether the activity is inherently dangerous or standard industrial storage before denying defenses.',
        status: 'Unrevised',
        createdAt: Date.now() - 86400000
      },
      {
        id: 'sec-err-2',
        source: 'sectional',
        date: dMinus(2),
        subject: 'Logical',
        topic: 'Critical Reasoning - Weaken the Argument',
        questionType: 'Passage Inference',
        mistakeType: 'Elimination Trap',
        mistake: 'Chose an option that attacked a background fact rather than the core causal conclusion.',
        reason: 'Did not isolate the conclusion sentence before evaluating the answer choices.',
        correctApproach: 'Pinpoint the exact conclusion and find the choice that shows the cause occurred without the effect.',
        status: 'Revised',
        createdAt: Date.now() - 2 * 86400000
      },
      {
        id: 'sec-err-3',
        source: 'sectional',
        date: dMinus(3),
        subject: 'Quant',
        topic: 'Percentages - Successive Discounts',
        questionType: 'Data Calculation',
        mistakeType: 'Silly Mistake',
        mistake: 'Subtracted 20% and 10% as 30% flat discount instead of multiplying factors.',
        reason: 'Tried to calculate mentally too fast during the final 3 minutes of the sectional.',
        correctApproach: 'Net multiplier is 0.8 * 0.9 = 0.72, which equals a 28% total discount, not 30%.',
        status: 'Unrevised',
        createdAt: Date.now() - 3 * 86400000
      },
      {
        id: 'sec-err-4',
        source: 'sectional',
        date: dMinus(0),
        subject: 'Legal',
        topic: 'Law of Torts - Strict Liability',
        questionType: 'Principle-Fact Application',
        mistakeType: 'Time Pressure',
        mistake: 'Repeated mistake on Act of God defense applicability.',
        reason: 'Panicked on time and chose the first plausible sounding answer.',
        correctApproach: 'Act of God requires extraordinary, unforeseeable natural intervention that human foresight could not guard against.',
        status: 'Unrevised',
        createdAt: Date.now() - 3600000
      }
    ];

    // Seed study sessions for the last 7 days to showcase the 7-day streak & charts
    const sessions = [];
    const makeSession = (daysAgo, taskName, minutes) => {
      const dateStr = dMinus(daysAgo);
      const start = new Date(today);
      start.setDate(start.getDate() - daysAgo);
      start.setHours(10, 0, 0, 0);
      const end = new Date(start.getTime() + minutes * 60000);
      return {
        id: 'sess-' + Math.random().toString(36).substr(2, 9),
        date: dateStr,
        taskId: 'task-' + taskName.toLowerCase().replace(/\s+/g, '-'),
        taskName: taskName,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        duration: minutes * 60
      };
    };

    // Today (Day 0): ~5h 12m total
    sessions.push(makeSession(0, 'Legal', 80));          // 1h 20m
    sessions.push(makeSession(0, 'GK', 70));             // 1h 10m
    sessions.push(makeSession(0, 'Mock Analysis', 65));  // 1h 05m
    sessions.push(makeSession(0, 'Logical', 55));        // 55m
    sessions.push(makeSession(0, 'English', 42));        // 42m

    // Day 1 (yesterday)
    sessions.push(makeSession(1, 'Legal', 140));
    sessions.push(makeSession(1, 'Logical', 90));
    sessions.push(makeSession(1, 'GK', 80));
    sessions.push(makeSession(1, 'Quant', 60));

    // Day 2
    sessions.push(makeSession(2, 'Mock Test', 120));
    sessions.push(makeSession(2, 'Mock Analysis', 90));
    sessions.push(makeSession(2, 'Legal', 110));

    // Day 3
    sessions.push(makeSession(3, 'English', 75));
    sessions.push(makeSession(3, 'Logical', 90));
    sessions.push(makeSession(3, 'GK', 60));
    sessions.push(makeSession(3, 'Legal', 105));

    // Day 4
    sessions.push(makeSession(4, 'Legal', 150));
    sessions.push(makeSession(4, 'Quant', 90));
    sessions.push(makeSession(4, 'GK', 70));

    // Day 5
    sessions.push(makeSession(5, 'Mock Test', 120));
    sessions.push(makeSession(5, 'Mock Analysis', 80));
    sessions.push(makeSession(5, 'Logical', 110));
    sessions.push(makeSession(5, 'Legal', 90));

    // Day 6 (7 days ago)
    sessions.push(makeSession(6, 'Legal', 120));
    sessions.push(makeSession(6, 'English', 60));
    sessions.push(makeSession(6, 'GK', 80));

    // Realistic multi-day daily sectional marks
    const sectionals = [
      {
        date: dMinus(5),
        sections: {
          english: { score: 15, maxScore: 24, totalQuestions: 24, attempted: 19, correct: 15, wrong: 4, unattempted: 5 },
          gk: { score: 10, maxScore: 28, totalQuestions: 28, attempted: 16, correct: 10, wrong: 6, unattempted: 12 },
          legal: { score: 19, maxScore: 30, totalQuestions: 30, attempted: 23, correct: 19, wrong: 4, unattempted: 7 },
          logical: { score: 16, maxScore: 24, totalQuestions: 24, attempted: 18, correct: 16, wrong: 2, unattempted: 6 },
          quant: { score: 6, maxScore: 14, totalQuestions: 14, attempted: 8, correct: 6, wrong: 2, unattempted: 6 }
        },
        totalScore: 66,
        totalMaxScore: 120,
        totalQuestions: 120,
        totalAttempted: 84,
        totalCorrect: 66,
        totalWrong: 18,
        totalUnattempted: 36,
        updatedAt: Date.now() - 5 * 86400000
      },
      {
        date: dMinus(3),
        sections: {
          english: { score: 16, maxScore: 24, totalQuestions: 24, attempted: 19, correct: 16, wrong: 3, unattempted: 5 },
          gk: { score: 13, maxScore: 28, totalQuestions: 28, attempted: 18, correct: 13, wrong: 5, unattempted: 10 },
          legal: { score: 20, maxScore: 30, totalQuestions: 30, attempted: 24, correct: 20, wrong: 4, unattempted: 6 },
          logical: { score: 17, maxScore: 24, totalQuestions: 24, attempted: 19, correct: 17, wrong: 2, unattempted: 5 },
          quant: { score: 8, maxScore: 14, totalQuestions: 14, attempted: 9, correct: 8, wrong: 1, unattempted: 5 }
        },
        totalScore: 74,
        totalMaxScore: 120,
        totalQuestions: 120,
        totalAttempted: 89,
        totalCorrect: 74,
        totalWrong: 15,
        totalUnattempted: 31,
        updatedAt: Date.now() - 3 * 86400000
      },
      {
        date: dMinus(2),
        sections: {
          english: { score: 17, maxScore: 24, totalQuestions: 24, attempted: 20, correct: 17, wrong: 3, unattempted: 4 },
          gk: { score: 12, maxScore: 28, totalQuestions: 28, attempted: 17, correct: 12, wrong: 5, unattempted: 11 },
          legal: { score: 21, maxScore: 30, totalQuestions: 30, attempted: 25, correct: 21, wrong: 4, unattempted: 5 },
          logical: { score: 18, maxScore: 24, totalQuestions: 24, attempted: 20, correct: 18, wrong: 2, unattempted: 4 },
          quant: { score: 7, maxScore: 14, totalQuestions: 14, attempted: 9, correct: 7, wrong: 2, unattempted: 5 }
        },
        totalScore: 75,
        totalMaxScore: 120,
        totalQuestions: 120,
        totalAttempted: 91,
        totalCorrect: 75,
        totalWrong: 16,
        totalUnattempted: 29,
        updatedAt: Date.now() - 2 * 86400000
      },
      {
        date: dMinus(1),
        sections: {
          english: { score: 18, maxScore: 24, totalQuestions: 24, attempted: 21, correct: 18, wrong: 3, unattempted: 3 },
          gk: { score: 14, maxScore: 28, totalQuestions: 28, attempted: 20, correct: 14, wrong: 6, unattempted: 8 },
          legal: { score: 22, maxScore: 30, totalQuestions: 30, attempted: 26, correct: 22, wrong: 4, unattempted: 4 },
          logical: { score: 19, maxScore: 24, totalQuestions: 24, attempted: 21, correct: 19, wrong: 2, unattempted: 3 },
          quant: { score: 8, maxScore: 14, totalQuestions: 14, attempted: 10, correct: 8, wrong: 2, unattempted: 4 }
        },
        totalScore: 81,
        totalMaxScore: 120,
        totalQuestions: 120,
        totalAttempted: 98,
        totalCorrect: 81,
        totalWrong: 17,
        totalUnattempted: 22,
        updatedAt: Date.now() - 1 * 86400000
      },
      {
        date: dMinus(0),
        sections: {
          english: { score: 21, maxScore: 24, totalQuestions: 24, attempted: 22, correct: 21, wrong: 1, unattempted: 2 },
          gk: { score: 11, maxScore: 28, totalQuestions: 28, attempted: 17, correct: 11, wrong: 6, unattempted: 11 },
          legal: { score: 25, maxScore: 30, totalQuestions: 30, attempted: 27, correct: 25, wrong: 2, unattempted: 3 },
          logical: { score: 19, maxScore: 24, totalQuestions: 24, attempted: 21, correct: 19, wrong: 2, unattempted: 3 },
          quant: { score: 10, maxScore: 14, totalQuestions: 14, attempted: 11, correct: 10, wrong: 1, unattempted: 3 }
        },
        totalScore: 86,
        totalMaxScore: 120,
        totalQuestions: 120,
        totalAttempted: 98,
        totalCorrect: 86,
        totalWrong: 12,
        totalUnattempted: 22,
        updatedAt: Date.now()
      }
    ];

    return { mocks, errors, tasks: DEFAULT_TASKS, sessions, sectionals };
  }

  function init() {
    if (!localStorage.getItem(KEYS.INITIALIZED)) {
      const seed = getSeedData();
      localStorage.setItem(KEYS.MOCKS, JSON.stringify(seed.mocks));
      localStorage.setItem(KEYS.ERRORS, JSON.stringify(seed.errors));
      localStorage.setItem(KEYS.TASKS, JSON.stringify(seed.tasks));
      localStorage.setItem(KEYS.SESSIONS, JSON.stringify(seed.sessions));
      localStorage.setItem(KEYS.SECTIONALS, JSON.stringify(seed.sectionals));
      localStorage.setItem(KEYS.INITIALIZED, 'true');
      localStorage.setItem('myprep_version_v2', 'true');
    } else if (!localStorage.getItem('myprep_version_v2')) {
      // Automatic v2 migration: enrich seed mocks with independent sectional maximums and question metrics
      const currentMocks = getMocks();
      const seed = getSeedData();
      const upgraded = currentMocks.map(cm => {
        const matchingSeed = seed.mocks.find(sm => sm.id === cm.id);
        if (matchingSeed && matchingSeed.sections) {
          return {
            ...cm,
            sections: matchingSeed.sections
          };
        }
        return cm;
      });
      localStorage.setItem(KEYS.MOCKS, JSON.stringify(upgraded));
      localStorage.setItem('myprep_version_v2', 'true');
    }

    // Ensure sectionals store exists even for existing installations
    if (!localStorage.getItem(KEYS.SECTIONALS)) {
      const seed = getSeedData();
      localStorage.setItem(KEYS.SECTIONALS, JSON.stringify(seed.sectionals));
    } else if (!localStorage.getItem('myprep_sec_attempts_v1')) {
      // Automatic sectionals attempts migration: ensure seed sectionals have question tracking fields
      try {
        const currentSecs = JSON.parse(localStorage.getItem(KEYS.SECTIONALS)) || [];
        const seedSecs = getSeedData().sectionals;
        let secUpdated = false;
        currentSecs.forEach(cs => {
          const matchingSeed = seedSecs.find(ss => ss.date === cs.date);
          if (matchingSeed && cs.sections) {
            ['english', 'gk', 'legal', 'logical', 'quant'].forEach(k => {
              if (cs.sections[k] && cs.sections[k].attempted === undefined && matchingSeed.sections[k]) {
                cs.sections[k] = { ...matchingSeed.sections[k], ...cs.sections[k] };
                secUpdated = true;
              }
            });
            if (cs.totalAttempted === undefined && matchingSeed.totalAttempted !== undefined) {
              cs.totalQuestions = matchingSeed.totalQuestions;
              cs.totalAttempted = matchingSeed.totalAttempted;
              cs.totalCorrect = matchingSeed.totalCorrect;
              cs.totalWrong = matchingSeed.totalWrong;
              cs.totalUnattempted = matchingSeed.totalUnattempted;
              secUpdated = true;
            }
          }
        });
        if (secUpdated) {
          localStorage.setItem(KEYS.SECTIONALS, JSON.stringify(currentSecs));
        }
        localStorage.setItem('myprep_sec_attempts_v1', 'true');
      } catch (e) {
        // ignore
      }
    }

    // Automatic v3 migration: guarantee subtasks array on all tasks and subtaskName on all sessions
    const currentTasks = getTasks();
    let tasksUpdated = false;
    currentTasks.forEach(t => {
      if (!Array.isArray(t.subtasks)) {
        const def = DEFAULT_TASKS.find(dt => dt.name.toLowerCase() === t.name.toLowerCase());
        t.subtasks = def ? [...def.subtasks] : ['General'];
        tasksUpdated = true;
      }
    });
    if (tasksUpdated) {
      localStorage.setItem(KEYS.TASKS, JSON.stringify(currentTasks));
    }

    const currentSessions = getSessions();
    let sessionsUpdated = false;
    currentSessions.forEach(s => {
      if (!s.subtaskName) {
        s.subtaskName = 'General';
        sessionsUpdated = true;
      }
    });
    if (sessionsUpdated) {
      localStorage.setItem(KEYS.SESSIONS, JSON.stringify(currentSessions));
    }

    // Automatic sectional errors migration: ensure existing errors have source/status and seed sectional errors exist
    if (!localStorage.getItem('myprep_sec_errors_v1')) {
      try {
        const currentErrors = getErrors();
        let hasSectional = currentErrors.some(e => e.source === 'sectional');
        if (!hasSectional) {
          const seedSecErrors = getSeedData().errors.filter(e => e.source === 'sectional');
          seedSecErrors.forEach(se => currentErrors.push(se));
        }
        currentErrors.forEach(e => {
          if (!e.source) e.source = e.mockRef ? 'mock' : 'sectional';
          if (!e.status) e.status = 'Unrevised';
          if (!e.date && e.createdAt) e.date = getLocalDateString(new Date(e.createdAt));
        });
        localStorage.setItem(KEYS.ERRORS, JSON.stringify(currentErrors));
        localStorage.setItem('myprep_sec_errors_v1', 'true');
      } catch (e) {
        // ignore
      }
    }

    // Clean up any deprecated Current Affairs storage keys safely
    localStorage.removeItem('myprep_ca_topics');
    localStorage.removeItem('myprep_ca_quiz_history');
    localStorage.removeItem('myprep_ca_weaknesses');
  }

  // --- Mocks CRUD ---
  function getMocks() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEYS.MOCKS)) || [];
      return raw.map(m => {
        if (!m.sections || typeof m.sections !== 'object') {
          m.sections = {};
        } else {
          // Normalize legacy format where section values were scalar numbers
          const subjectKeys = ['english', 'gk', 'legal', 'logical', 'quant'];
          subjectKeys.forEach(sec => {
            if (typeof m.sections[sec] === 'number') {
              m.sections[sec] = {
                score: m.sections[sec],
                maxScore: undefined,
                totalQuestions: undefined,
                attempted: undefined,
                correct: undefined
              };
            }
          });
        }
        return m;
      });
    } catch {
      return [];
    }
  }

  function saveMock(mockData) {
    const mocks = getMocks();
    if (mockData.id) {
      const index = mocks.findIndex(m => m.id === mockData.id);
      if (index !== -1) {
        mocks[index] = { ...mocks[index], ...mockData };
      } else {
        mocks.push(mockData);
      }
    } else {
      mockData.id = 'mock-' + Date.now();
      mockData.createdAt = Date.now();
      mocks.push(mockData);
    }
    localStorage.setItem(KEYS.MOCKS, JSON.stringify(mocks));
    return mockData;
  }

  function deleteMock(id) {
    const mocks = getMocks().filter(m => m.id !== id);
    localStorage.setItem(KEYS.MOCKS, JSON.stringify(mocks));
  }

  // --- Errors CRUD ---
  function getErrors() {
    try {
      return JSON.parse(localStorage.getItem(KEYS.ERRORS)) || [];
    } catch {
      return [];
    }
  }

  function saveError(errorData) {
    const errors = getErrors();
    const payload = {
      ...errorData,
      status: errorData.status || 'Unrevised',
      source: errorData.source || (errorData.mockRef ? 'mock' : 'sectional'),
      date: errorData.date || getLocalDateString()
    };
    if (payload.id) {
      const index = errors.findIndex(e => e.id === payload.id);
      if (index !== -1) {
        errors[index] = { ...errors[index], ...payload };
      } else {
        errors.push(payload);
      }
    } else {
      payload.id = (payload.source === 'sectional' ? 'sec-err-' : 'err-') + Date.now();
      payload.createdAt = Date.now();
      errors.unshift(payload);
    }
    localStorage.setItem(KEYS.ERRORS, JSON.stringify(errors));
    return payload;
  }

  function getSectionalErrors() {
    return getErrors().filter(e => e.source === 'sectional');
  }

  function getMockErrors() {
    return getErrors().filter(e => e.source !== 'sectional');
  }

  function deleteError(id) {
    const errors = getErrors().filter(e => e.id !== id);
    localStorage.setItem(KEYS.ERRORS, JSON.stringify(errors));
  }

  // --- Tasks CRUD ---
  function getTasks() {
    try {
      const stored = localStorage.getItem(KEYS.TASKS);
      return stored ? JSON.parse(stored) : DEFAULT_TASKS;
    } catch {
      return DEFAULT_TASKS;
    }
  }

  function addTask(name, subtasks = []) {
    const tasks = getTasks();
    const trimmed = name.trim();
    if (!trimmed) return null;
    const exists = tasks.find(t => t.name.toLowerCase() === trimmed.toLowerCase());
    if (exists) return exists;
    const newTask = {
      id: 'task-' + Date.now(),
      name: trimmed,
      subtasks: Array.isArray(subtasks) && subtasks.length > 0 ? subtasks : ['General'],
      isDefault: false
    };
    tasks.push(newTask);
    localStorage.setItem(KEYS.TASKS, JSON.stringify(tasks));
    return newTask;
  }

  function renameTask(id, newName) {
    const tasks = getTasks();
    const trimmed = newName.trim();
    if (!trimmed) return null;
    const target = tasks.find(t => t.id === id);
    if (target) {
      target.name = trimmed;
      localStorage.setItem(KEYS.TASKS, JSON.stringify(tasks));
      return target;
    }
    return null;
  }

  function deleteTask(id) {
    const tasks = getTasks().filter(t => t.id !== id);
    localStorage.setItem(KEYS.TASKS, JSON.stringify(tasks));
  }

  function addSubtask(taskId, subtaskName) {
    const tasks = getTasks();
    const trimmed = subtaskName.trim();
    if (!trimmed) return null;
    const task = tasks.find(t => t.id === taskId);
    if (!task) return null;
    if (!Array.isArray(task.subtasks)) task.subtasks = [];
    const exists = task.subtasks.some(st => st.toLowerCase() === trimmed.toLowerCase());
    if (!exists) {
      task.subtasks.push(trimmed);
      localStorage.setItem(KEYS.TASKS, JSON.stringify(tasks));
    }
    return task;
  }

  function renameSubtask(taskId, oldName, newName) {
    const tasks = getTasks();
    const trimmedNew = newName.trim();
    if (!trimmedNew) return null;
    const task = tasks.find(t => t.id === taskId);
    if (!task || !Array.isArray(task.subtasks)) return null;
    const idx = task.subtasks.findIndex(st => st.toLowerCase() === oldName.toLowerCase());
    if (idx !== -1) {
      task.subtasks[idx] = trimmedNew;
      localStorage.setItem(KEYS.TASKS, JSON.stringify(tasks));
      return task;
    }
    return null;
  }

  function deleteSubtask(taskId, subtaskName) {
    const tasks = getTasks();
    const task = tasks.find(t => t.id === taskId);
    if (!task || !Array.isArray(task.subtasks)) return null;
    task.subtasks = task.subtasks.filter(st => st.toLowerCase() !== subtaskName.toLowerCase());
    localStorage.setItem(KEYS.TASKS, JSON.stringify(tasks));
    return task;
  }

  // --- Sectionals CRUD ---
  function getSectionals() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEYS.SECTIONALS)) || [];
      return raw.sort((a, b) => a.date.localeCompare(b.date));
    } catch {
      return [];
    }
  }

  function getSectionalByDate(dateStr) {
    const list = getSectionals();
    return list.find(s => s.date === dateStr) || null;
  }

  function saveSectional(entry) {
    if (!entry || !entry.date) return null;
    const list = getSectionals();
    const index = list.findIndex(s => s.date === entry.date);

    let totalScore = 0;
    let totalMaxScore = 0;
    let hasAnyScore = false;
    let totalQuestions = 0;
    let totalAttempted = 0;
    let totalCorrect = 0;
    let totalWrong = 0;
    let totalUnattempted = 0;
    let hasAnyAttempts = false;

    const sections = entry.sections || {};
    ['english', 'gk', 'legal', 'logical', 'quant'].forEach(k => {
      const sec = sections[k];
      if (sec && typeof sec.score === 'number' && !isNaN(sec.score)) {
        totalScore += sec.score;
        hasAnyScore = true;
        if (typeof sec.maxScore === 'number' && !isNaN(sec.maxScore)) {
          totalMaxScore += sec.maxScore;
        }
      }
      if (sec && typeof sec.attempted === 'number' && !isNaN(sec.attempted)) {
        hasAnyAttempts = true;
        totalAttempted += sec.attempted;
        if (typeof sec.correct === 'number' && !isNaN(sec.correct)) {
          totalCorrect += sec.correct;
        }
        if (typeof sec.wrong === 'number' && !isNaN(sec.wrong)) {
          totalWrong += sec.wrong;
        }
        if (typeof sec.totalQuestions === 'number' && !isNaN(sec.totalQuestions)) {
          totalQuestions += sec.totalQuestions;
        }
        if (typeof sec.unattempted === 'number' && !isNaN(sec.unattempted)) {
          totalUnattempted += sec.unattempted;
        }
      }
    });

    const record = {
      date: entry.date,
      sections: entry.sections || {},
      totalScore: hasAnyScore ? Math.round(totalScore * 100) / 100 : null,
      totalMaxScore: hasAnyScore ? Math.round(totalMaxScore * 100) / 100 : null,
      totalQuestions: totalQuestions > 0 ? totalQuestions : (hasAnyScore ? totalMaxScore : null),
      totalAttempted: hasAnyAttempts ? totalAttempted : null,
      totalCorrect: hasAnyAttempts ? totalCorrect : null,
      totalWrong: hasAnyAttempts ? totalWrong : null,
      totalUnattempted: hasAnyAttempts ? totalUnattempted : null,
      updatedAt: Date.now()
    };

    if (index !== -1) {
      list[index] = { ...list[index], ...record };
    } else {
      list.push(record);
    }
    list.sort((a, b) => a.date.localeCompare(b.date));
    localStorage.setItem(KEYS.SECTIONALS, JSON.stringify(list));
    return record;
  }

  function deleteSectional(dateStr) {
    const list = getSectionals().filter(s => s.date !== dateStr);
    localStorage.setItem(KEYS.SECTIONALS, JSON.stringify(list));
  }

  // --- Study Sessions Aggregation Engine (DATE + SUBJECT + SUBTOPIC) ---
  function normalizeSessionField(val, defaultVal = '') {
    if (val === undefined || val === null) return defaultVal;
    return String(val).trim();
  }

  function getSessionKey(date, taskId, taskName, subtaskName) {
    const d = normalizeSessionField(date);
    let tName = normalizeSessionField(taskName);
    if (!tName && taskId) {
      const found = getTasks().find(t => t.id === taskId);
      if (found && found.name) tName = found.name;
    }
    const t = (tName || taskId || 'Study').toLowerCase();
    const st = (normalizeSessionField(subtaskName) || 'General').toLowerCase();
    return `${d}:::${t}:::${st}`;
  }

  function aggregateSessions(sessionsList) {
    if (!Array.isArray(sessionsList)) return [];
    const map = new Map();
    let hadDuplicates = false;

    sessionsList.forEach(s => {
      if (!s || typeof s !== 'object') return;
      const subtask = normalizeSessionField(s.subtaskName) || 'General';
      const key = getSessionKey(s.date, s.taskId, s.taskName, subtask);
      const duration = Math.max(0, parseInt(s.duration, 10) || 0);

      if (!map.has(key)) {
        map.set(key, {
          id: s.id || ('sess-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6)),
          date: s.date || getLocalDateString(),
          taskId: s.taskId || ('task-' + (s.taskName || 'general').toLowerCase().replace(/\s+/g, '-')),
          taskName: s.taskName || 'Study',
          subtaskName: subtask,
          startTime: s.startTime || new Date().toISOString(),
          endTime: s.endTime || new Date().toISOString(),
          duration: duration
        });
      } else {
        hadDuplicates = true;
        const existing = map.get(key);
        existing.duration += duration;
        if (s.startTime && (!existing.startTime || s.startTime < existing.startTime)) {
          existing.startTime = s.startTime;
        }
        if (s.endTime && (!existing.endTime || s.endTime > existing.endTime)) {
          existing.endTime = s.endTime;
        }
      }
    });

    const aggregated = Array.from(map.values());
    if (hadDuplicates) {
      try {
        localStorage.setItem(KEYS.SESSIONS, JSON.stringify(aggregated));
      } catch {}
    }
    return aggregated;
  }

  function getSessions() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEYS.SESSIONS)) || [];
      return aggregateSessions(raw);
    } catch {
      return [];
    }
  }

  function saveSession(sessionData) {
    if (!sessionData) return null;
    const sessions = getSessions();
    const subtask = normalizeSessionField(sessionData.subtaskName) || 'General';
    sessionData.subtaskName = subtask;
    const targetDate = sessionData.date || getLocalDateString();
    sessionData.date = targetDate;
    const duration = Math.max(0, parseInt(sessionData.duration, 10) || 0);
    sessionData.duration = duration;

    const targetKey = getSessionKey(targetDate, sessionData.taskId, sessionData.taskName, subtask);

    if (sessionData.id) {
      // Editing an existing session
      const index = sessions.findIndex(s => s.id === sessionData.id);
      const matchIndex = sessions.findIndex(s => s.id !== sessionData.id && getSessionKey(s.date, s.taskId, s.taskName, s.subtaskName) === targetKey);

      if (matchIndex !== -1) {
        sessions[matchIndex].duration += duration;
        if (sessionData.endTime) sessions[matchIndex].endTime = sessionData.endTime;
        if (index !== -1) {
          sessions.splice(index, 1);
        }
        localStorage.setItem(KEYS.SESSIONS, JSON.stringify(sessions));
        return sessions[matchIndex];
      } else if (index !== -1) {
        sessions[index] = { ...sessions[index], ...sessionData };
        localStorage.setItem(KEYS.SESSIONS, JSON.stringify(sessions));
        return sessions[index];
      } else {
        sessions.push(sessionData);
        localStorage.setItem(KEYS.SESSIONS, JSON.stringify(sessions));
        return sessionData;
      }
    } else {
      // Brand new session logged or completed via stopwatch/countdown
      const matchIndex = sessions.findIndex(s => getSessionKey(s.date, s.taskId, s.taskName, s.subtaskName) === targetKey);

      if (matchIndex !== -1) {
        sessions[matchIndex].duration += duration;
        if (sessionData.endTime) {
          sessions[matchIndex].endTime = sessionData.endTime;
        }
        localStorage.setItem(KEYS.SESSIONS, JSON.stringify(sessions));
        return sessions[matchIndex];
      } else {
        sessionData.id = 'sess-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6);
        sessions.push(sessionData);
        localStorage.setItem(KEYS.SESSIONS, JSON.stringify(sessions));
        return sessionData;
      }
    }
  }

  function deleteSession(id) {
    const sessions = getSessions().filter(s => s.id !== id);
    localStorage.setItem(KEYS.SESSIONS, JSON.stringify(sessions));
  }


  // --- Active Timer State Persistence ---
  function getActiveTimer() {
    try {
      return JSON.parse(localStorage.getItem(KEYS.ACTIVE_TIMER)) || null;
    } catch {
      return null;
    }
  }

  function setActiveTimer(timerState) {
    if (!timerState) {
      localStorage.removeItem(KEYS.ACTIVE_TIMER);
    } else {
      localStorage.setItem(KEYS.ACTIVE_TIMER, JSON.stringify(timerState));
    }
  }

  // --- Daily Study Target ---
  function getDailyTargetHours() {
    const val = localStorage.getItem(KEYS.DAILY_TARGET);
    return val ? parseFloat(val) : 6; // Default: 6 hours
  }

  function setDailyTargetHours(hours) {
    localStorage.setItem(KEYS.DAILY_TARGET, String(hours));
  }

  // --- Pomodoro Settings & State ---
  function getPomodoroSettings() {
    try {
      const stored = localStorage.getItem(KEYS.POMODORO_SETTINGS);
      if (stored) return JSON.parse(stored);
    } catch {}
    return {
      focusMinutes: 25,
      shortBreakMinutes: 5,
      longBreakMinutes: 15,
      sessionsBeforeLongBreak: 4
    };
  }

  function setPomodoroSettings(settings) {
    localStorage.setItem(KEYS.POMODORO_SETTINGS, JSON.stringify(settings));
  }

  function getPomodoroState() {
    try {
      const stored = localStorage.getItem(KEYS.POMODORO_STATE);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  function setPomodoroState(pState) {
    if (!pState) {
      localStorage.removeItem(KEYS.POMODORO_STATE);
    } else {
      localStorage.setItem(KEYS.POMODORO_STATE, JSON.stringify(pState));
    }
  }

  // --- Streak Minimum Threshold ---
  function getStreakThresholdMinutes() {
    const val = localStorage.getItem(KEYS.STREAK_THRESHOLD);
    return val !== null ? parseInt(val, 10) : 30; // Default: 30 minutes
  }

  function setStreakThresholdMinutes(minutes) {
    localStorage.setItem(KEYS.STREAK_THRESHOLD, String(minutes));
  }

  // --- Export & Import Backup ---
  function exportData() {
    const data = {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      mocks: getMocks(),
      errors: getErrors(),
      tasks: getTasks(),
      sessions: getSessions(),
      sectionals: getSectionals(),
      dailyTargetHours: getDailyTargetHours(),
      pomodoroSettings: getPomodoroSettings(),
      streakThresholdMinutes: getStreakThresholdMinutes(),
      clatExamDate: getClatExamDate(),
      mockSchedule: getMockSchedule(),
      checklist: getAllChecklistItems() || []
    };
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStr = getLocalDateString();
    a.href = url;
    a.download = `my-prep-dashboard-backup-${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function importData(jsonContent) {
    try {
      const parsed = JSON.parse(jsonContent);
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Invalid backup file format.');
      }
      if (Array.isArray(parsed.mocks)) {
        localStorage.setItem(KEYS.MOCKS, JSON.stringify(parsed.mocks));
      }
      if (Array.isArray(parsed.errors)) {
        localStorage.setItem(KEYS.ERRORS, JSON.stringify(parsed.errors));
      }
      if (Array.isArray(parsed.tasks)) {
        localStorage.setItem(KEYS.TASKS, JSON.stringify(parsed.tasks));
      }
      if (Array.isArray(parsed.sessions)) {
        localStorage.setItem(KEYS.SESSIONS, JSON.stringify(parsed.sessions));
      }
      if (Array.isArray(parsed.sectionals)) {
        localStorage.setItem(KEYS.SECTIONALS, JSON.stringify(parsed.sectionals));
      }
      if (Array.isArray(parsed.mockSchedule)) {
        localStorage.setItem(KEYS.MOCK_SCHEDULE, JSON.stringify(parsed.mockSchedule));
      }
      if (Array.isArray(parsed.checklist)) {
        localStorage.setItem(KEYS.CHECKLIST, JSON.stringify(parsed.checklist));
      }
      if (typeof parsed.dailyTargetHours === 'number') {
        setDailyTargetHours(parsed.dailyTargetHours);
      }
      if (parsed.pomodoroSettings && typeof parsed.pomodoroSettings === 'object') {
        setPomodoroSettings(parsed.pomodoroSettings);
      }
      if (typeof parsed.streakThresholdMinutes === 'number') {
        setStreakThresholdMinutes(parsed.streakThresholdMinutes);
      }
      if (typeof parsed.clatExamDate === 'string') {
        setClatExamDate(parsed.clatExamDate);
      } else if (parsed.clatExamDate === null) {
        setClatExamDate(null);
      }
      localStorage.setItem(KEYS.INITIALIZED, 'true');
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // --- Study Checklist Engine ---
  const DEFAULT_CHECKLIST = [
    { name: 'Complete Legal revision', category: 'Legal', subtopic: 'Contract Law', completed: false },
    { name: '2 Logical Reasoning sectionals', category: 'Logical', subtopic: 'Critical Reasoning', completed: false },
    { name: 'Revise current affairs', category: 'GK', subtopic: 'Current Affairs', completed: false },
    { name: 'Complete English practice', category: 'English', subtopic: 'Vocabulary', completed: true }
  ];

  function getAllChecklistItems() {
    try {
      const stored = localStorage.getItem(KEYS.CHECKLIST);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  function getChecklist(dateStr) {
    const targetDate = dateStr || getLocalDateString();
    let all = getAllChecklistItems();
    if (all === null) {
      // Seed default items for today
      const today = getLocalDateString();
      all = DEFAULT_CHECKLIST.map((item, idx) => ({
        id: `chk-seed-${idx + 1}`,
        name: item.name,
        category: item.category,
        subtopic: item.subtopic,
        completed: item.completed,
        date: today,
        createdAt: Date.now() - (DEFAULT_CHECKLIST.length - idx) * 60000
      }));
      localStorage.setItem(KEYS.CHECKLIST, JSON.stringify(all));
    }
    return all.filter(item => item.date === targetDate);
  }

  function addChecklistItem(item) {
    let all = getAllChecklistItems() || [];
    const targetDate = item.date || getLocalDateString();
    const newItem = {
      id: 'chk-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6),
      name: item.name ? item.name.trim() : 'Study Task',
      category: item.category ? item.category.trim() : '',
      subtopic: item.subtopic ? item.subtopic.trim() : '',
      completed: !!item.completed,
      date: targetDate,
      createdAt: Date.now()
    };
    all.push(newItem);
    localStorage.setItem(KEYS.CHECKLIST, JSON.stringify(all));
    return newItem;
  }

  function updateChecklistItem(id, updates) {
    let all = getAllChecklistItems() || [];
    let updatedItem = null;
    all = all.map(item => {
      if (item.id === id) {
        updatedItem = {
          ...item,
          name: updates.name !== undefined ? updates.name.trim() : item.name,
          category: updates.category !== undefined ? updates.category.trim() : item.category,
          subtopic: updates.subtopic !== undefined ? updates.subtopic.trim() : item.subtopic,
          completed: updates.completed !== undefined ? !!updates.completed : item.completed
        };
        return updatedItem;
      }
      return item;
    });
    localStorage.setItem(KEYS.CHECKLIST, JSON.stringify(all));
    return updatedItem;
  }

  function toggleChecklistItem(id) {
    let all = getAllChecklistItems() || [];
    let updatedItem = null;
    all = all.map(item => {
      if (item.id === id) {
        updatedItem = { ...item, completed: !item.completed };
        return updatedItem;
      }
      return item;
    });
    localStorage.setItem(KEYS.CHECKLIST, JSON.stringify(all));
    return updatedItem;
  }

  function deleteChecklistItem(id) {
    let all = getAllChecklistItems() || [];
    all = all.filter(item => item.id !== id);
    localStorage.setItem(KEYS.CHECKLIST, JSON.stringify(all));
  }

  function getMockSchedule() {
    try {
      const stored = localStorage.getItem(KEYS.MOCK_SCHEDULE);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  function setMockSchedule(scheduleList) {
    if (Array.isArray(scheduleList)) {
      localStorage.setItem(KEYS.MOCK_SCHEDULE, JSON.stringify(scheduleList));
    }
  }

  function getClatExamDate() {
    return localStorage.getItem(KEYS.CLAT_EXAM_DATE) || null;
  }

  function setClatExamDate(dateStr) {
    if (dateStr && typeof dateStr === 'string' && dateStr.trim()) {
      localStorage.setItem(KEYS.CLAT_EXAM_DATE, dateStr.trim());
    } else {
      localStorage.removeItem(KEYS.CLAT_EXAM_DATE);
    }
  }

  function resetToEmpty() {
    localStorage.setItem(KEYS.MOCKS, JSON.stringify([]));
    localStorage.setItem(KEYS.ERRORS, JSON.stringify([]));
    localStorage.setItem(KEYS.TASKS, JSON.stringify(DEFAULT_TASKS));
    localStorage.setItem(KEYS.SESSIONS, JSON.stringify([]));
    localStorage.setItem(KEYS.SECTIONALS, JSON.stringify([]));
    localStorage.removeItem(KEYS.ACTIVE_TIMER);
    localStorage.removeItem(KEYS.POMODORO_STATE);
    localStorage.removeItem(KEYS.CLAT_EXAM_DATE);
    localStorage.removeItem(KEYS.CHECKLIST);
    localStorage.removeItem('myprep_ca_topics');
    localStorage.removeItem('myprep_ca_quiz_history');
    localStorage.removeItem('myprep_ca_weaknesses');
  }

  function resetToSample() {
    const seed = getSeedData();
    localStorage.setItem(KEYS.MOCKS, JSON.stringify(seed.mocks));
    localStorage.setItem(KEYS.ERRORS, JSON.stringify(seed.errors));
    localStorage.setItem(KEYS.TASKS, JSON.stringify(seed.tasks));
    localStorage.setItem(KEYS.SESSIONS, JSON.stringify(seed.sessions));
    localStorage.setItem(KEYS.SECTIONALS, JSON.stringify(seed.sectionals));
    localStorage.removeItem(KEYS.ACTIVE_TIMER);
    localStorage.removeItem(KEYS.POMODORO_STATE);
    localStorage.removeItem(KEYS.CHECKLIST);
    localStorage.removeItem('myprep_ca_topics');
    localStorage.removeItem('myprep_ca_quiz_history');
    localStorage.removeItem('myprep_ca_weaknesses');
    // Note: Do not overwrite or invent an official exam date in sample data
  }

  return {
    init,
    getLocalDateString,
    getMocks,
    saveMock,
    deleteMock,
    getErrors,
    getSectionalErrors,
    getMockErrors,
    saveError,
    deleteError,
    getTasks,
    addTask,
    renameTask,
    deleteTask,
    addSubtask,
    renameSubtask,
    deleteSubtask,
    getSessions,
    saveSession,
    deleteSession,
    getSectionals,
    getSectionalByDate,
    saveSectional,
    deleteSectional,
    getActiveTimer,
    setActiveTimer,
    getDailyTargetHours,
    setDailyTargetHours,
    getPomodoroSettings,
    setPomodoroSettings,
    getPomodoroState,
    setPomodoroState,
    getStreakThresholdMinutes,
    setStreakThresholdMinutes,
    getClatExamDate,
    setClatExamDate,
    getMockSchedule,
    setMockSchedule,
    getChecklist,
    getAllChecklistItems,
    addChecklistItem,
    updateChecklistItem,
    toggleChecklistItem,
    deleteChecklistItem,
    exportData,
    importData,
    resetToEmpty,
    resetToSample
  };


})();

window.Storage = Storage;

