import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import * as entriesApi from '../api/entries';
import * as projectsApi from '../api/projects';
import * as goalsApi from '../api/goals';
import * as pomoApi from '../api/pomo';
import { fetchLocation } from '../api/weather';
import { uid, dateKey } from '../utils/helpers';

const AppContext = createContext(null);

const CIRC = 2 * Math.PI * 85;

export const DEFAULT_POMO = {
  work: 1500, short: 300, long: 900, cycle: 4,
  autoAdv: true, skipBreaks: [], customPlan: null,
  soundEnabled: true,
  focusedTaskName: null,
  focusedTaskProjectId: null,
  focusedTaskProjectName: null,
};

export function AppProvider({ children }) {
  // Data state
  const [entries, setEntries] = useState([]);
  const [projects, setProjects] = useState([]);
  const [goals, setGoals] = useState([]);
  const [pomoSessions, setPomoSessions] = useState([]);
  const [pomoSettings, setPomoSettings] = useState(DEFAULT_POMO);
  const [pomoGoalTarget, setPomoGoalTarget] = useState(8);

  // View state
  const [viewDate, setViewDate] = useState(new Date());
  const [clock24h, setClock24h] = useState(() => {
    try { return JSON.parse(localStorage.getItem('focused_clock24h')) ?? true; } catch { return true; }
  });
  const [weatherLoc, setWeatherLoc] = useState({ lat: null, lon: null, city: '' });
  const [weatherData, setWeatherData] = useState(null);
  const [weatherVisible, setWeatherVisible] = useState(() => {
    try { return JSON.parse(localStorage.getItem('focused_weatherVisible')) ?? true; } catch { return true; }
  });
  const [toasts, setToasts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Task tracker state
  const [taskRunning, setTaskRunning] = useState(false);
  const [taskPaused, setTaskPaused] = useState(false);
  const [activeEntry, setActiveEntry] = useState(null);
  const [taskStart, setTaskStart] = useState(null);
  const [currentSegStart, setCurrentSegStart] = useState(null);
  const taskIntervalRef = useRef(null);
  const [liveElapsed, setLiveElapsed] = useState(0);

  // Pomo state
  const [pomoMode, setPomoMode] = useState('work');
  const [pomoSec, setPomoSec] = useState(1500);
  const [pomoTotal, setPomoTotal] = useState(1500);
  const [pomoRunning, setPomoRunning] = useState(false);
  const [sessionsD, setSessionsD] = useState(0);
  const [planIdx, setPlanIdx] = useState(0);
  const [pomoCompleted, setPomoCompleted] = useState(0);
  const pomoIntervalRef = useRef(null);
  const pomoSettingsRef = useRef(pomoSettings);
  pomoSettingsRef.current = pomoSettings;
  const pomoJustCompletedRef = useRef(false);
  const pomoModeRef = useRef(pomoMode);
  pomoModeRef.current = pomoMode;
  const pomoRunningRef = useRef(pomoRunning);
  pomoRunningRef.current = pomoRunning;
  const taskRunningRef = useRef(taskRunning);
  taskRunningRef.current = taskRunning;
  const taskPausedRef = useRef(taskPaused);
  taskPausedRef.current = taskPaused;
  const activeEntryRef = useRef(activeEntry);
  activeEntryRef.current = activeEntry;
  const currentSegStartRef = useRef(currentSegStart);
  currentSegStartRef.current = currentSegStart;
  const pomoWorkStartRef = useRef(null);

  // Data loading
  const loadAll = useCallback(async () => {
    try {
      const [e, p, g, ps, pset] = await Promise.all([
        entriesApi.fetchEntries(),
        projectsApi.fetchProjects(),
        goalsApi.fetchGoals(),
        pomoApi.fetchPomoSessions(),
        pomoApi.fetchPomoSettings(),
      ]);
      setEntries(e);
      setProjects(p);
      setGoals(g);
      setPomoSessions(ps);
      const merged = { ...DEFAULT_POMO, ...pset };
      setPomoSettings(merged);
      // Sync sessionsD and planIdx with server data, and sync pomoMode to plan
      const todayKey = new Date().toISOString().split('T')[0];
      const totalDone = ps.filter(s => new Date(s.completedAt).toISOString().split('T')[0] === todayKey).length;
      setSessionsD(ps.filter(s => s.mode === 'work' && new Date(s.completedAt).toISOString().split('T')[0] === todayKey).length);
      const plan = getPlanTypes(merged);
      let initialIdx = 0;
      if (plan.length > 0) {
        initialIdx = totalDone % plan.length;
        const mode = plan[initialIdx];
        setPlanIdx(initialIdx);
        setPomoCompleted(totalDone);
        setPomoMode(mode);
        const secs = mode === 'work' ? merged.work : mode === 'short' ? merged.short : merged.long;
        setPomoSec(secs);
        setPomoTotal(secs);
      } else if (pset && pset.work) {
        setPomoSec(pset.work);
        setPomoTotal(pset.work);
      }
      // Load location
      fetchLocation().then(loc => {
        if (loc && loc.lat != null) setWeatherLoc(loc);
      }).catch(() => {});
      // Load weather
      const wxData = localStorage.getItem('wxData');
      if (wxData) setWeatherData(JSON.parse(wxData));
    } catch (err) {
      console.error('Load failed:', err);
      addToast('Failed to load data', 'err');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Persist view preferences
  useEffect(() => { localStorage.setItem('focused_clock24h', JSON.stringify(clock24h)); }, [clock24h]);
  useEffect(() => { localStorage.setItem('focused_weatherVisible', JSON.stringify(weatherVisible)); }, [weatherVisible]);

  // Toast
  const addToast = useCallback((msg, type = 'ok') => {
    const id = uid();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 2800);
  }, []);

  // Task tracker: start/stop/pause/resume
  const startTracking = useCallback((task, projectId, projectName) => {
    const now = new Date();
    const newEntry = {
      task, projectId: projectId || null, projectName: projectName || null,
      startTime: now.toISOString(), segments: [], durationMs: 0,
      _id: uid()
    };

    setActiveEntry(newEntry);
    setTaskStart(now);
    setCurrentSegStart(now);
    setTaskRunning(true);
    setTaskPaused(false);
    setLiveElapsed(0);
    if (taskIntervalRef.current) clearInterval(taskIntervalRef.current);
    taskIntervalRef.current = setInterval(() => {
      setLiveElapsed(prev => prev + 1000);
    }, 1000);
    setEntries(prev => [newEntry, ...prev]);
  }, []);

  const stopTracking = useCallback(async () => {
    if (!activeEntry) return;
    clearInterval(taskIntervalRef.current);
    taskIntervalRef.current = null;
    const end = new Date();
    const segs = [...(activeEntry.segments || [])];
    if (!taskPaused && currentSegStart) {
      segs.push({ start: currentSegStart.getTime(), end: end.getTime() });
    }
    const durationMs = segs.reduce((s, seg) => s + (seg.end - seg.start), 0);
    const tempId = activeEntry._id;

    // Stop UI immediately
    setActiveEntry(null);
    setTaskStart(null);
    setCurrentSegStart(null);
    setTaskRunning(false);
    setTaskPaused(false);
    setLiveElapsed(0);

    // Single save on stop with complete data
    try {
      const created = await entriesApi.createEntry({
        task: activeEntry.task,
        projectId: activeEntry.projectId,
        projectName: activeEntry.projectName,
        startTime: activeEntry.startTime,
        endTime: end.toISOString(),
        segments: segs,
        durationMs,
        _id: tempId,
      });
      const realEntry = created._id ? created : { ...activeEntry, _id: created._id || created.id, endTime: end.toISOString(), segments: segs, durationMs };
      setEntries(prev => prev.map(e => e._id === tempId ? realEntry : e));
    } catch { /* server save failed, entry stays in local list */ }
    addToast('Timer stopped!');
  }, [activeEntry, taskPaused, currentSegStart, addToast]);

  const pauseTracking = useCallback(() => {
    if (!taskRunning || taskPaused || !activeEntry || !currentSegStart) return;
    clearInterval(taskIntervalRef.current);
    taskIntervalRef.current = null;
    const now = new Date();
    const seg = { start: currentSegStart.getTime(), end: now.getTime() };
    const newSegs = [...(activeEntry.segments || []), seg];
    setActiveEntry(prev => ({ ...prev, segments: newSegs, durationMs: newSegs.reduce((s, sg) => s + (sg.end - sg.start), 0) }));
    setCurrentSegStart(null);
    setTaskPaused(true);
    addToast('Timer paused.');
  }, [taskRunning, taskPaused, activeEntry, currentSegStart, addToast]);

  const resumeTracking = useCallback(() => {
    if (!taskRunning || !taskPaused) return;
    const now = new Date();
    setCurrentSegStart(now);
    setTaskPaused(false);
    taskIntervalRef.current = setInterval(() => {
      setLiveElapsed(prev => prev + 1000);
    }, 1000);
    addToast('Timer resumed!');
  }, [taskRunning, taskPaused, addToast]);

  // Focus helpers — use refs for latest state (stable callbacks)
  const focusStopTracking = useCallback(() => {
    const entry = activeEntryRef.current;
    if (!entry) return;
    clearInterval(taskIntervalRef.current);
    taskIntervalRef.current = null;
    const end = new Date();
    const segs = [...(entry.segments || [])];
    if (!taskPausedRef.current && currentSegStartRef.current) {
      segs.push({ start: currentSegStartRef.current.getTime(), end: end.getTime() });
    }
    const durationMs = segs.reduce((s, seg) => s + (seg.end - seg.start), 0);
    const tempId = entry._id;

    setActiveEntry(null);
    setTaskStart(null);
    setCurrentSegStart(null);
    setTaskRunning(false);
    setTaskPaused(false);
    setLiveElapsed(0);

    entriesApi.createEntry({
      task: entry.task,
      projectId: entry.projectId,
      projectName: entry.projectName,
      startTime: entry.startTime,
      endTime: end.toISOString(),
      segments: segs,
      durationMs,
      _id: tempId,
    }).then(created => {
      const realEntry = created._id ? created : { ...entry, _id: created._id || created.id, endTime: end.toISOString(), segments: segs, durationMs };
      setEntries(prev => prev.map(e => e._id === tempId ? realEntry : e));
    }).catch(() => {});
  }, []);

  const focusStartTracking = useCallback((task, projectId, projectName) => {
    focusStopTracking();
    const now = new Date();
    const newEntry = {
      task, projectId: projectId || null, projectName: projectName || null,
      startTime: now.toISOString(), segments: [], durationMs: 0,
      _id: uid()
    };
    setActiveEntry(newEntry);
    setTaskStart(now);
    setCurrentSegStart(now);
    setTaskRunning(true);
    setTaskPaused(false);
    setLiveElapsed(0);
    if (taskIntervalRef.current) clearInterval(taskIntervalRef.current);
    taskIntervalRef.current = setInterval(() => {
      setLiveElapsed(prev => prev + 1000);
    }, 1000);
    setEntries(prev => [newEntry, ...prev]);
  }, []);

  const focusPauseTracking = useCallback(() => {
    if (!taskRunningRef.current || taskPausedRef.current || !activeEntryRef.current || !currentSegStartRef.current) return;
    clearInterval(taskIntervalRef.current);
    taskIntervalRef.current = null;
    const now = new Date();
    const seg = { start: currentSegStartRef.current.getTime(), end: now.getTime() };
    setActiveEntry(prev => prev ? {
      ...prev,
      segments: [...(prev.segments || []), seg],
      durationMs: [...(prev.segments || []), seg].reduce((s, sg) => s + (sg.end - sg.start), 0)
    } : prev);
    setCurrentSegStart(null);
    setTaskPaused(true);
    addToast('Focus: paused');
  }, [addToast]);

  const focusResumeTracking = useCallback(() => {
    if (!taskRunningRef.current || !taskPausedRef.current) return;
    const now = new Date();
    setCurrentSegStart(now);
    setTaskPaused(false);
    taskIntervalRef.current = setInterval(() => {
      setLiveElapsed(prev => prev + 1000);
    }, 1000);
    addToast('Focus: resumed');
  }, [addToast]);

  const isPomoControlled = taskRunning && pomoRunning
    && !!pomoSettings.focusedTaskName && pomoMode === 'work';

  // Pomo timer
  const startPomo = useCallback(() => {
    // Auto-start/resume TaskBar if focus is active and entering a work session
    if (pomoModeRef.current === 'work' && pomoSettingsRef.current.focusedTaskName) {
      if (taskRunningRef.current && taskPausedRef.current) {
        focusResumeTracking();
      } else {
        focusStartTracking(
          pomoSettingsRef.current.focusedTaskName,
          pomoSettingsRef.current.focusedTaskProjectId,
          pomoSettingsRef.current.focusedTaskProjectName
        );
        pomoWorkStartRef.current = new Date();
      }
    }
    setPomoRunning(true);
    if (pomoIntervalRef.current) clearInterval(pomoIntervalRef.current);
    pomoIntervalRef.current = setInterval(() => {
      setPomoSec(prev => {
        if (prev <= 1) {
          clearInterval(pomoIntervalRef.current);
          pomoIntervalRef.current = null;
          setPomoRunning(false);
          // Log session
          const mode = pomoMode;
          const dur = pomoTotal;
          pomoApi.createPomoSession({ mode, duration: dur }).catch(() => {});
          setPomoSessions(prev => [...prev, { mode, duration: dur, completedAt: new Date().toISOString() }]);
          if (mode === 'work') setSessionsD(s => s + 1);
          // Play bell (if enabled)
          if (pomoSettingsRef.current.soundEnabled) {
            try {
              const ctx = new (window.AudioContext || window.webkitAudioContext)();
              const osc = ctx.createOscillator(), gain = ctx.createGain();
              osc.connect(gain); gain.connect(ctx.destination);
              osc.type = 'sine'; osc.frequency.setValueAtTime(880, ctx.currentTime);
              osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.4);
              gain.gain.setValueAtTime(0.3, ctx.currentTime);
              gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
              osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.8);
              setTimeout(() => ctx.close(), 1000);
            } catch (e) {}
          }
          // Web Notification
          if ('Notification' in window && Notification.permission === 'granted') {
            try {
              new Notification('FOCUSED', { body: mode === 'work' ? 'Work session complete!' : 'Break over!' });
            } catch (e) {}
          }
          // Stop focus tracking if work completed
          if (mode === 'work' && pomoSettingsRef.current.focusedTaskName) {
            focusStopTracking();
          }
          pomoWorkStartRef.current = null;
          // Advance plan
          pomoJustCompletedRef.current = true;
          advancePlanRef.current();
          return prev;
        }
        return prev - 1;
      });
    }, 1000);
  }, [pomoMode, pomoTotal]);

  const pausePomo = useCallback(() => {
    clearInterval(pomoIntervalRef.current);
    pomoIntervalRef.current = null;
    setPomoRunning(false);
    if (pomoModeRef.current === 'work' && pomoSettingsRef.current.focusedTaskName
      && taskRunningRef.current && !taskPausedRef.current) {
      focusPauseTracking();
    }
  }, []);

  const resetPomo = useCallback(() => {
    clearInterval(pomoIntervalRef.current);
    pomoIntervalRef.current = null;
    setPomoRunning(false);
    if (pomoModeRef.current === 'work' && pomoSettingsRef.current.focusedTaskName && activeEntryRef.current) {
      focusStopTracking();
    }
    pomoWorkStartRef.current = null;
    const secs = pomoMode === 'work' ? pomoSettings.work : pomoMode === 'short' ? pomoSettings.short : pomoSettings.long;
    setPomoSec(secs);
    setPomoTotal(secs);
  }, [pomoMode, pomoSettings]);

  const advancePlan = useCallback(() => {
    const types = getPlanTypes(pomoSettings);
    if (!types.length) return;
    setPlanIdx(prev => {
      const next = (prev + 1) % types.length;
      setPomoMode(types[next]);
      return next;
    });
    setPomoCompleted(prev => prev + 1);
  }, [pomoSettings]);
  const advancePlanRef = useRef(advancePlan);
  advancePlanRef.current = advancePlan;

  const skipToNext = useCallback(() => {
    const types = getPlanTypes(pomoSettings);
    clearInterval(pomoIntervalRef.current);
    pomoIntervalRef.current = null;
    setPomoRunning(false);
    const mode = pomoModeRef.current;
    if (mode === 'work' && pomoSettingsRef.current.focusedTaskName && activeEntryRef.current) {
      focusStopTracking();
    }
    pomoWorkStartRef.current = null;
    // Record as skipped session
    pomoApi.createPomoSession({ mode, duration: 0, skipped: true }).catch(() => {});
    setPomoSessions(prev => [...prev, { mode, duration: 0, skipped: true, completedAt: new Date().toISOString() }]);
    if (mode === 'work') setSessionsD(s => s + 1);
    if (types.length > 0) {
      setPlanIdx(prev => {
        const next = (prev + 1) % types.length;
        const newMode = types[next];
        setPomoMode(newMode);
        const secs = newMode === 'work' ? pomoSettings.work : newMode === 'short' ? pomoSettings.short : pomoSettings.long;
        setPomoSec(secs);
        setPomoTotal(secs);
        return next;
      });
      setPomoCompleted(prev => prev + 1);
    }
  }, [pomoSettings]);

  const setPomoModeFn = useCallback((m) => {
    clearInterval(pomoIntervalRef.current);
    pomoIntervalRef.current = null;
    setPomoRunning(false);
    if (pomoModeRef.current === 'work' && pomoSettingsRef.current.focusedTaskName && activeEntryRef.current) {
      focusStopTracking();
    }
    pomoWorkStartRef.current = null;
    setPomoMode(m);
    const secs = m === 'work' ? pomoSettings.work : m === 'short' ? pomoSettings.short : pomoSettings.long;
    setPomoSec(secs);
    setPomoTotal(secs);
  }, [pomoSettings]);

  // Sync timer duration when mode changes and timer is stopped
  useEffect(() => {
    if (!pomoRunning) {
      const secs = pomoMode === 'work' ? pomoSettings.work : pomoMode === 'short' ? pomoSettings.short : pomoSettings.long;
      setPomoSec(secs);
      setPomoTotal(secs);
    }
  }, [pomoMode, pomoSettings.work, pomoSettings.short, pomoSettings.long]);

  // Sync pomoMode when plan structure changes (add/remove/reorder blocks)
  useEffect(() => {
    if (!pomoRunning) {
      const plan = getPlanTypes(pomoSettings);
      if (plan.length > 0) {
        const idx = Math.min(planIdx, plan.length - 1);
        const expected = plan[idx];
        if (pomoMode !== expected) {
          setPomoMode(expected);
          const secs = expected === 'work' ? pomoSettings.work : expected === 'short' ? pomoSettings.short : pomoSettings.long;
          setPomoSec(secs);
          setPomoTotal(secs);
        }
      }
    }
  }, [pomoSettings.customPlan, pomoRunning]);

  // Auto-start next session when timer completes in auto mode
  useEffect(() => {
    if (!pomoRunning && pomoSec > 0 && pomoSettings.autoAdv && pomoJustCompletedRef.current) {
      pomoJustCompletedRef.current = false;
      startPomo();
    }
  }, [pomoRunning, pomoSec]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearInterval(pomoIntervalRef.current);
      clearInterval(taskIntervalRef.current);
    };
  }, []);

  // Direct pomo setter for click-to-edit
  const setPomoDirect = useCallback((total) => {
    setPomoSec(total);
    setPomoTotal(total);
  }, []);

  // beforeunload when task running
  useEffect(() => {
    if (taskRunning) {
      const handler = (e) => {
        e.preventDefault();
        e.returnValue = 'A timer is running. Are you sure you want to leave?';
      };
      window.addEventListener('beforeunload', handler);
      return () => window.removeEventListener('beforeunload', handler);
    }
  }, [taskRunning]);

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  // Reload data functions
  const reloadEntries = useCallback(async () => {
    const e = await entriesApi.fetchEntries().catch(() => []);
    if (e) setEntries(e);
  }, []);
  const reloadProjects = useCallback(async () => {
    const p = await projectsApi.fetchProjects().catch(() => []);
    if (p) setProjects(p);
  }, []);
  const reloadGoals = useCallback(async () => {
    const g = await goalsApi.fetchGoals().catch(() => []);
    if (g) setGoals(g);
  }, []);
  const reloadPomo = useCallback(async () => {
    const p = await pomoApi.fetchPomoSessions().catch(() => []);
    if (p) setPomoSessions(p);
  }, []);

  const resetAllPomo = useCallback(() => {
    clearInterval(pomoIntervalRef.current);
    pomoIntervalRef.current = null;
    setPomoRunning(false);
    setSessionsD(0);
    setPomoCompleted(0);
    pomoWorkStartRef.current = null;
    const types = getPlanTypes(pomoSettings);
    if (types.length > 0) {
      setPlanIdx(0);
      setPomoMode(types[0]);
      const secs = types[0] === 'work' ? pomoSettings.work : types[0] === 'short' ? pomoSettings.short : pomoSettings.long;
      setPomoSec(secs);
      setPomoTotal(secs);
    }
  }, [pomoSettings]);

  const clearTodayPomo = useCallback(async () => {
    const todayKey = new Date().toISOString().split('T')[0];
    setPomoSessions(prev => prev.filter(s => new Date(s.completedAt).toISOString().split('T')[0] !== todayKey));
    setPomoCompleted(0);
    setPlanIdx(0);
    setSessionsD(0);
    const types = getPlanTypes(pomoSettings);
    if (types.length > 0) {
      setPomoMode(types[0]);
      const secs = types[0] === 'work' ? pomoSettings.work : types[0] === 'short' ? pomoSettings.short : pomoSettings.long;
      setPomoSec(secs);
      setPomoTotal(secs);
    }
    addToast('Today\'s sessions cleared');
    try { await pomoApi.clearTodayPomo(); } catch { /* ignore */ }
  }, [pomoSettings, addToast]);

  const value = {
    // Data
    entries, projects, goals, pomoSessions, pomoSettings, pomoGoalTarget, loading,
    // View
    viewDate, setViewDate, clock24h, setClock24h,
    weatherLoc, setWeatherLoc, weatherData, setWeatherData, weatherVisible, setWeatherVisible,
    // Toast
    toasts, addToast,
    // Task tracker
    taskRunning, taskPaused, activeEntry, taskStart, currentSegStart, liveElapsed,
    startTracking, stopTracking, pauseTracking, resumeTracking,
    isPomoControlled,
    setActiveEntry, setTaskRunning, setTaskPaused, setTaskStart, setCurrentSegStart,
    // Pomo
    pomoMode, pomoSec, pomoTotal, pomoRunning, sessionsD, planIdx, pomoCompleted,
    startPomo, pausePomo, resetPomo, setPomoMode: setPomoModeFn,
    setPomoSec, setPomoTotal, setSessionsD, setPlanIdx,
    advancePlan, skipToNext, resetAllPomo, clearTodayPomo,
    // Reload
    reloadEntries, reloadProjects, reloadGoals, reloadPomo,
    setPomoDirect,
    // Setters
    setEntries, setProjects, setGoals, setPomoSessions, setPomoSettings, setPomoGoalTarget,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};

function getPlanTypes(settings) {
  if (settings.customPlan && settings.customPlan.length > 0) return [...settings.customPlan];
  const cycle = settings.cycle || 4;
  const types = [];
  for (let i = 0; i < cycle; i++) {
    types.push('work');
    if (!(settings.skipBreaks || []).includes(i + 1)) types.push('short');
  }
  return types;
}
