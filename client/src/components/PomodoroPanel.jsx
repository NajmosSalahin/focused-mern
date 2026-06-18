import { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { fmtMS, fmtHuman } from '../utils/helpers';
import { updatePomoSettings } from '../api/pomo';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove, rectSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const CIRC = 2 * Math.PI * 85;
const POMO_STROKE = { work: '#fb4934', short: '#b8bb26', long: '#83a598' };

const validatePlan = (types) => {
  const errors = [];
  const workCount = types.filter(t => t === 'work').length;
  const breakCount = types.filter(t => t !== 'work').length;
  if (types.length > 30) errors.push('Max 30 blocks per plan');
  if (workCount > 25) errors.push('Max 25 work blocks per plan');
  if (breakCount > 25) errors.push('Max 25 break blocks per plan');
  if (workCount === 0) errors.push('At least 1 work block required');
  if (breakCount === 0) errors.push('At least 1 break block required');
  return errors;
};

function SortableBlock({ id, type, sec, state, isCur, onClick, children }) {
  const isDone = state === 'done';
  const noDrag = isDone || window.innerWidth <= 768;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled: noDrag });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style}
      className={`plan-block ${type}${state ? ` plan-${state}` : ''}${isCur && !isDone ? ' plan-cur' : ''}${isDragging ? ' dragging' : ''}`}
      {...attributes}
      {...(isDone ? {} : listeners)}
      onClick={isDone ? undefined : onClick}
      title={`${type === 'work' ? 'Work' : type === 'short' ? 'Short break' : 'Long break'} · click to cycle · drag to reorder`}>
      {children}
    </div>
  );
}

export default function PomodoroPanel() {
  const {
    pomoMode, pomoSec, pomoTotal, pomoRunning, sessionsD, pomoSettings, planIdx, pomoCompleted,
    startPomo, pausePomo, resetPomo, resetAllPomo, setPomoMode, setSessionsD, setPlanIdx,
    setPomoSettings, addToast, pomoSessions, skipToNext,
    projects, isPomoControlled
  } = useApp();

  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState('');
  const [showPlanMenu, setShowPlanMenu] = useState(false);
  const [showResetMenu, setShowResetMenu] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const ringRef = useRef(null);
  const [focusEditing, setFocusEditing] = useState(false);
  const [focusTask, setFocusTask] = useState(pomoSettings.focusedTaskName || '');
  const [focusProject, setFocusProject] = useState(pomoSettings.focusedTaskProjectId || '');
  const focusInputRef = useRef(null);

  const REMOVE_DEAD = 30;
  const REMOVE_THRESH = 120;

  const ratio = pomoTotal > 0 ? pomoSec / pomoTotal : 0;
  const offset = CIRC * (1 - ratio);

  // Get plan types
  const getPlanTypes = () => {
    if (pomoSettings.customPlan && pomoSettings.customPlan.length > 0)
      return [...pomoSettings.customPlan];
    const cycle = pomoSettings.cycle || 4;
    const types = [];
    for (let i = 0; i < cycle; i++) {
      types.push('work');
      if (!(pomoSettings.skipBreaks || []).includes(i + 1)) types.push('short');
    }
    return types;
  };

  const planSecFor = (t) => t === 'work' ? pomoSettings.work : t === 'short' ? pomoSettings.short : pomoSettings.long;
  const types = getPlanTypes();
  const totalSec = types.reduce((s, t) => s + planSecFor(t), 0);

  const handleStartPause = () => {
    if (pomoRunning) pausePomo();
    else startPomo();
  };

  const handleTabClick = (m) => {
    setPomoMode(m);
  };

  const handleEditClick = () => {
    if (pomoRunning) return;
    setEditing(true);
    setEditVal(fmtMS(pomoSec));
  };

  const commitEdit = () => {
    const raw = editVal.trim();
    const match = raw.match(/^(\d{1,2}):?(\d{2})$/) || raw.match(/^(\d+)$/);
    if (match) {
      let mins, secs;
      if (match[2] !== undefined) { mins = parseInt(match[1]); secs = parseInt(match[2]); }
      else { mins = parseInt(match[1]); secs = 0; }
      const total = Math.max(1, mins * 60 + Math.min(secs, 59));
      const key = pomoMode === 'work' ? 'work' : pomoMode === 'short' ? 'short' : 'long';
      const updated = { ...pomoSettings, [key]: total };
      setPomoSettings(updated);
      updatePomoSettings(updated).catch(() => {});
    }
    setEditing(false);
  };

  // Focus task handlers
  const saveFocus = () => {
    if (!focusTask.trim()) { addToast('Enter a task name.', 'err'); return; }
    const pid = focusProject || null;
    const pname = pid ? projects.find(p => p._id === pid)?.name || null : null;
    const updated = {
      ...pomoSettings,
      focusedTaskName: focusTask.trim(),
      focusedTaskProjectId: pid,
      focusedTaskProjectName: pname,
    };
    setPomoSettings(updated);
    updatePomoSettings(updated).catch(() => {});
    setFocusEditing(false);
  };

  const clearFocus = () => {
    if (pomoRunning && pomoMode === 'work') {
      addToast('Stop the timer to unfocus.', 'err');
      return;
    }
    const updated = {
      ...pomoSettings,
      focusedTaskName: null,
      focusedTaskProjectId: null,
      focusedTaskProjectName: null,
    };
    setPomoSettings(updated);
    updatePomoSettings(updated).catch(() => {});
  };

  // Sync focus inputs when settings change externally
  useEffect(() => {
    if (!focusEditing) {
      setFocusTask(pomoSettings.focusedTaskName || '');
      setFocusProject(pomoSettings.focusedTaskProjectId || '');
    }
  }, [pomoSettings.focusedTaskName, pomoSettings.focusedTaskProjectId]);

  // Auto-badge toggle
  const autoAdv = pomoSettings.autoAdv;

  const today = new Date().toISOString().split('T')[0];
  const todayWorks = pomoSessions.filter(s => s.mode === 'work' && new Date(s.completedAt).toISOString().split('T')[0] === today).length;

  // Track completed blocks via pomoCompleted (increments on complete/skip, resets on Reset All, unaffected by drag)
  const doneCount = types.length > 0 ? pomoCompleted % types.length : 0;
  const blockStates = (() => {
    const states = new Array(types.length).fill('');
    for (let i = 0; i < doneCount; i++) states[i] = 'done';
    return states;
  })();

  const planContains = (type) => types.includes(type);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDnDStart = (event) => {
    setActiveId(event.active.id);
    setDragOffset({ x: 0, y: 0 });
  };

  const handleDnDMove = (event) => {
    setDragOffset({ x: event.delta.x, y: event.delta.y });
  };

  const saveTypes = useCallback((newTypes) => {
    const payload = { ...pomoSettings, customPlan: newTypes.length > 0 ? newTypes : null };
    setPomoSettings(payload);
    updatePomoSettings(payload).catch(() => {});
  }, [pomoSettings, setPomoSettings]);

  const handleDnDEnd = (event) => {
    const { active, over } = event;
    const dist = Math.abs(dragOffset.y);
    if (dist >= REMOVE_THRESH) {
      const newTypes = [...types];
      newTypes.splice(active.id, 1);
      const errs = validatePlan(newTypes);
      if (errs.length > 0) { addToast(errs[0], 'err'); setActiveId(null); setDragOffset({ x: 0, y: 0 }); return; }
      saveTypes(newTypes);
      if (active.id < planIdx) setPlanIdx(prev => Math.max(0, prev - 1));
      else if (active.id === planIdx && active.id >= newTypes.length)
        setPlanIdx(prev => Math.max(0, prev - 1));
      addToast('Block removed');
    } else if (over && active.id !== over.id) {
      const oldIdx = active.id;
      const newIdx = over.id;
      const newTypes = arrayMove(types, oldIdx, newIdx);
      saveTypes(newTypes);
      if (oldIdx === planIdx) {
        setPlanIdx(newIdx);
      } else if (oldIdx < planIdx && newIdx >= planIdx) {
        setPlanIdx(prev => prev - 1);
      } else if (oldIdx > planIdx && newIdx <= planIdx) {
        setPlanIdx(prev => prev + 1);
      }
      addToast('Plan reordered');
    }
    setActiveId(null);
    setDragOffset({ x: 0, y: 0 });
  };

  // Click-to-cycle block type
  const handleBlockClick = (idx) => {
    const cycleOrder = { work: 'short', short: 'long', long: 'work' };
    const newTypes = [...types];
    newTypes[idx] = cycleOrder[newTypes[idx]] || 'work';
    const errs = validatePlan(newTypes);
    if (errs.length > 0) { addToast(errs[0], 'err'); return; }
    saveTypes(newTypes);
  };

  // Keyboard: Space, R, S, 1, 2, 3
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.closest('.overlay.open')) return;
      if (e.key === ' ') { e.preventDefault(); handleStartPause(); }
      if (e.key === 'r' || e.key === 'R') resetPomo();
      if (e.key === 's' || e.key === 'S') {
        skipToNext();
      }
      if (e.key === '1') setPomoMode('work');
      if (e.key === '2') setPomoMode('short');
      if (e.key === '3') setPomoMode('long');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [pomoRunning, types, planIdx, skipToNext]);

  // Close reset menu on outside click
  useEffect(() => {
    const handler = (e) => { if (!e.target.closest('.reset-wrap')) setShowResetMenu(false); };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  return (
    <div className="pomo" role="region" aria-label="Pomodoro timer">
      <div className="pomo-header">
        <div className="pomo-tabs" role="tablist">
          {['work', 'short', 'long'].map(m => (
            <button key={m} className={`pomo-tab${pomoMode === m ? ' active' : ''}`}
              data-m={m} role="tab" aria-selected={pomoMode === m}
              onClick={() => handleTabClick(m)}>
              {m === 'work' ? 'WORK' : m === 'short' ? 'SHORT' : 'LONG'}
            </button>
          ))}
        </div>
        <button className={`auto-badge${autoAdv ? '' : ' off'}`} id="autoBadge"
          onClick={() => {
            const updated = { ...pomoSettings, autoAdv: !autoAdv };
            setPomoSettings(updated);
            updatePomoSettings(updated).catch(() => {});
            addToast(!autoAdv ? 'Manual mode ON' : 'Auto-advance ON');
          }}>
          {autoAdv ? 'AUTO ▶' : 'MANUAL'}
        </button>
      </div>

      <div className="pomo-ring-wrap">
        <svg className="pomo-svg" viewBox="0 0 190 190" aria-hidden="true">
          <circle className="ring-bg" cx="95" cy="95" r="85"></circle>
          <circle className="ring-fg" cx="95" cy="95" r="85"
            ref={ringRef}
            style={{
              strokeDasharray: CIRC,
              strokeDashoffset: offset,
              stroke: POMO_STROKE[pomoMode]
            }}></circle>
        </svg>
        <div className="pomo-time-wrap">
          {!editing ? (
            <div className="pomo-time" onClick={handleEditClick} title="Click to edit time">
              {fmtMS(pomoSec)}
            </div>
          ) : (
            <input className="pomo-time-input editing" value={editVal}
              onChange={e => setEditVal(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditing(false); }}
              maxLength={5} placeholder="MM:SS" autoFocus />
          )}
        </div>
      </div>

      <div className="pomo-sub" id="pomoSub">
        {pomoMode === 'work'
          ? `SESSION ${todayWorks + 1}`
          : pomoMode === 'short'
            ? `SHORT BREAK · ${todayWorks} DONE`
            : `LONG BREAK · ${todayWorks} DONE`}
      </div>

      <div className="pomo-ctrls">
        <div className="reset-wrap">
          <button className="pbtn pbtn-sm" onClick={() => setShowResetMenu(!showResetMenu)} title="Reset (R)">
            <i className="fas fa-redo"></i>
          </button>
          {showResetMenu && (
            <div className="reset-menu">
              <button onClick={() => { resetPomo(); setShowResetMenu(false); }}>1 Session</button>
              <button onClick={() => { resetAllPomo(); setShowResetMenu(false); }}>All</button>
            </div>
          )}
        </div>
        <button className={`pbtn pbtn-main${pomoRunning ? ' run' : ''}`} onClick={handleStartPause} title="Start/Pause (Space)">
          <i className={`fas fa-${pomoRunning ? 'pause' : 'play'}`}></i>
        </button>
        <button className="pbtn pbtn-sm" onClick={skipToNext} title="Skip">
          <i className="fas fa-forward-step"></i>
        </button>
        <button className="pbtn pbtn-sm" onClick={() => {
          window.dispatchEvent(new CustomEvent('openPomoSettings'));
        }} title="Timer Settings">
          <i className="fas fa-sliders"></i>
        </button>
      </div>

      <div className="pomo-plan" id="pomoPlan">
        <div className="pomo-plan-scroll">
          {types.length > 0 ? (
            <DndContext sensors={sensors} onDragStart={handleDnDStart} onDragMove={handleDnDMove} onDragEnd={handleDnDEnd}>
              <SortableContext items={types.map((_, i) => i)} strategy={rectSortingStrategy}>
                {types.map((type, idx) => (
                  <SortableBlock key={idx} id={idx} type={type} sec={planSecFor(type)} state={blockStates[idx]} isCur={idx === planIdx} onClick={() => handleBlockClick(idx)}>
                    {fmtHuman(planSecFor(type))}
                  </SortableBlock>
                ))}
              </SortableContext>
              <DragOverlay dropAnimation={null}>
                {activeId !== null && (() => {
                  const dx = dragOffset.x, dy = dragOffset.y;
                  const dist = Math.abs(dy);
                  const raw = Math.max(0, Math.min(1, (dist - REMOVE_DEAD) / (REMOVE_THRESH - REMOVE_DEAD)));
                  const isRemoving = dist >= REMOVE_THRESH;
                  return (
                    <div className={`plan-ghost ${types[activeId]}${isRemoving ? ' removing' : ''}`}
                      style={{ '--drag-progress': raw }}>
                      <span className="plan-ghost-text">{fmtHuman(planSecFor(types[activeId]))}</span>
                      <span className="plan-ghost-trash">🗑</span>
                    </div>
                  );
                })()}
              </DragOverlay>
              </DndContext>
          ) : (
            <span className="plan-empty-hint">No blocks yet — add one below</span>
          )}
          <div className="plan-add-wrap">
            <button className="plan-add-btn" onClick={() => setShowPlanMenu(!showPlanMenu)}>+</button>
            {showPlanMenu && (
              <div className="plan-add-menu">
                {[['WORK', 'work'], ['SHORT', 'short'], ['LONG', 'long']].map(([label, t]) => (
                  <button key={t} className={`plan-add-menu-item ${t}`}
                    onClick={() => {
                      const newPlan = [...types, t];
                      const errs = validatePlan(newPlan);
                      if (errs.length > 0) { addToast(errs[0], 'err'); setShowPlanMenu(false); return; }
                      saveTypes(newPlan);
                      setShowPlanMenu(false);
                      addToast('Block added');
                    }}>{label}</button>
                ))}
              </div>
            )}
          </div>
        </div>
        {types.length > 0 && <span className="plan-total">= {fmtHuman(totalSec)} total</span>}
      </div>

      <div className="pomo-focus-row">
        {!focusEditing ? (
          pomoSettings.focusedTaskName ? (
            <>
              {isPomoControlled && <span className="focus-indicator">▶</span>}
              <span className="focus-label">Focus:</span>
              <span className="focus-task">{pomoSettings.focusedTaskName}</span>
              {pomoSettings.focusedTaskProjectName && (
                <span className="focus-project">[{pomoSettings.focusedTaskProjectName}]</span>
              )}
              <button className="focus-clear" onClick={clearFocus}
                disabled={pomoRunning && pomoMode === 'work'}>✕</button>
            </>
          ) : (
            <button className="focus-add" onClick={() => { setFocusEditing(true); setTimeout(() => focusInputRef.current?.focus(), 50); }}>
              + Focus on a task
            </button>
          )
        ) : (
          <div className="focus-editing-wrap">
            <input ref={focusInputRef} className="focus-input" value={focusTask}
              onChange={e => setFocusTask(e.target.value)}
              placeholder="What are you working on?"
              onKeyDown={e => { if (e.key === 'Enter') saveFocus(); if (e.key === 'Escape') setFocusEditing(false); }} />
            <select className="focus-select" value={focusProject} onChange={e => setFocusProject(e.target.value)}>
              <option value="">— no project —</option>
              {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
            <button className="focus-save" onClick={saveFocus}>✔</button>
            <button className="focus-cancel" onClick={() => setFocusEditing(false)}>✕</button>
          </div>
        )}
      </div>

      <span className="kbd-hint" title="Keyboard shortcuts — press ? for full list">
        Space: start/pause · R: reset · S: skip · 1/2/3: mode · `: terminal · Ctrl+K: command · ?: help
      </span>
    </div>
  );
}
