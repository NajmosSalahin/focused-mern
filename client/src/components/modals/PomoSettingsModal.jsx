import { useState, useEffect, useCallback, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { fmtHuman, fmtMS } from '../../utils/helpers';
import { updatePomoSettings, fetchPomoSettings } from '../../api/pomo';

export default function PomoSettingsModal() {
  const { pomoSettings, setPomoSettings, addToast, setPomoMode } = useApp();
  const [open, setOpen] = useState(false);
  const [work, setWork] = useState({ m: 25, s: 0 });
  const [short, setShort] = useState({ m: 5, s: 0 });
  const [long, setLong] = useState({ m: 15, s: 0 });
  const [cycle, setCycle] = useState(4);
  const [autoAdv, setAutoAdv] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [breakSlots, setBreakSlots] = useState([{ enabled: true, type: 'short' }, { enabled: true, type: 'short' }, { enabled: true, type: 'short' }, { enabled: true, type: 'short' }]);
  const [customPlan, setCustomPlan] = useState(null);
  const holdRef = useRef(null);
  const pomoSettingsRef = useRef(pomoSettings);
  pomoSettingsRef.current = pomoSettings;

  // Effect 1: Listen for open event (stable, no deps, reads via ref)
  useEffect(() => {
    const handler = () => {
      const ps = pomoSettingsRef.current;
      setWork({ m: Math.floor(ps.work / 60), s: ps.work % 60 });
      setShort({ m: Math.floor(ps.short / 60), s: ps.short % 60 });
      setLong({ m: Math.floor(ps.long / 60), s: ps.long % 60 });
      setCycle(ps.cycle || 4);
      setAutoAdv(ps.autoAdv);
      setSoundEnabled(ps.soundEnabled !== false);
      const slots = [];
      for (let i = 0; i < (ps.cycle || 4); i++) {
        const slot = i + 1;
        const skipped = (ps.skipBreaks || []).includes(slot);
        slots.push({ enabled: !skipped, type: 'short' });
      }
      if (ps.customPlan) {
        setCustomPlan([...ps.customPlan]);
      } else {
        setCustomPlan(null);
      }
      setBreakSlots(slots.length >= 1 ? slots : [{ enabled: true, type: 'short' }]);
      setOpen(true);
    };
    window.addEventListener('openPomoSettings', handler);
    return () => window.removeEventListener('openPomoSettings', handler);
  }, []);

  // Effect 2: Sync form values when pomoSettings changes externally (does NOT reopen)
  useEffect(() => {
    setWork({ m: Math.floor(pomoSettings.work / 60), s: pomoSettings.work % 60 });
    setShort({ m: Math.floor(pomoSettings.short / 60), s: pomoSettings.short % 60 });
    setLong({ m: Math.floor(pomoSettings.long / 60), s: pomoSettings.long % 60 });
    setCycle(pomoSettings.cycle || 4);
    setAutoAdv(pomoSettings.autoAdv);
    setSoundEnabled(pomoSettings.soundEnabled !== false);
    const slots = [];
    for (let i = 0; i < (pomoSettings.cycle || 4); i++) {
      const slot = i + 1;
      const skipped = (pomoSettings.skipBreaks || []).includes(slot);
      slots.push({ enabled: !skipped, type: 'short' });
    }
    if (pomoSettings.customPlan) {
      setCustomPlan([...pomoSettings.customPlan]);
    } else {
      setCustomPlan(null);
    }
    setBreakSlots(slots.length >= 1 ? slots : [{ enabled: true, type: 'short' }]);
  }, [pomoSettings]);

  useEffect(() => {
    setBreakSlots(prev => {
      const arr = [...prev];
      while (arr.length < cycle) arr.push({ enabled: true, type: 'short' });
      while (arr.length > cycle) arr.pop();
      return arr;
    });
  }, [cycle]);

  const close = () => setOpen(false);

  const stepVal = (field, delta) => {
    const updater = (prev) => {
      const totalSecs = prev.m * 60 + prev.s + delta * 60;
      const clamped = Math.max(60, Math.min(3600, totalSecs));
      return { m: Math.floor(clamped / 60), s: clamped % 60 };
    };
    if (field === 'work') setWork(updater);
    else if (field === 'short') setShort(updater);
    else if (field === 'long') setLong(updater);
  };

  const toggleSlot = (idx) => {
    setBreakSlots(prev => prev.map((s, i) => i === idx ? { ...s, enabled: !s.enabled } : s));
  };

  const toggleSlotType = (idx) => {
    setBreakSlots(prev => prev.map((s, i) => i === idx ? { ...s, type: s.type === 'short' ? 'long' : 'short' } : s));
  };

  // Hold-to-repeat for stepper buttons
  const startHold = useCallback((callback) => {
    if (holdRef.current) clearInterval(holdRef.current);
    callback();
    holdRef.current = setInterval(callback, 150);
  }, []);

  const stopHold = useCallback(() => {
    if (holdRef.current) { clearInterval(holdRef.current); holdRef.current = null; }
  }, []);

  useEffect(() => () => { if (holdRef.current) clearInterval(holdRef.current); }, []);

  const previewTypes = customPlan && customPlan.length > 0
    ? customPlan
    : (() => {
        const types = [];
        for (let i = 0; i < cycle; i++) {
          types.push('work');
          if (i < breakSlots.length && breakSlots[i].enabled) types.push(breakSlots[i].type);
        }
        return types;
      })();
  const secFor = (t) => t === 'work' ? work.m * 60 + work.s : t === 'short' ? short.m * 60 + short.s : long.m * 60 + long.s;
  const previewTotal = previewTypes.reduce((s, t) => s + secFor(t), 0);
  const previewWorkTotal = previewTypes.filter(t => t === 'work').reduce((s, t) => s + secFor(t), 0);
  const previewSessions = previewTypes.filter(t => t === 'work').length;

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

  const handleApply = async () => {
    const newWork = Math.max(60, work.m * 60 + work.s);
    const newShort = Math.max(30, short.m * 60 + short.s);
    const newLong = Math.max(60, long.m * 60 + long.s);
    const newSkip = [];
    const newPlan = [];
    for (let i = 0; i < cycle; i++) {
      newPlan.push('work');
      if (i < breakSlots.length && breakSlots[i].enabled) {
        newPlan.push(breakSlots[i].type);
      } else {
        newSkip.push(i + 1);
      }
    }
    const planChanged = cycle !== (pomoSettings.cycle || 4);
    const preservedPlan = !planChanged && pomoSettings.customPlan && pomoSettings.customPlan.length > 0
      ? pomoSettings.customPlan : null;
    const settings = {
      work: newWork,
      short: newShort,
      long: newLong,
      cycle,
      autoAdv,
      soundEnabled,
      skipBreaks: newSkip,
      customPlan: preservedPlan || newPlan,
    };
    const errs = validatePlan(settings.customPlan);
    if (errs.length > 0) { addToast(errs[0], 'err'); return; }
    try {
      await updatePomoSettings(settings);
      setPomoSettings(settings);
      addToast('Timer settings applied!');
      setPomoMode(previewTypes[0] || 'work');
      close();
    } catch {
      addToast('Failed to save settings', 'err');
      close();
    }
  };

  const renderDurationField = (label, field, val, onChange) => (
    <div className="dur-field">
      <div className="dur-label">{label}</div>
      <div className="dur-stepper">
        <button className="dur-btn"
          onMouseDown={() => startHold(() => stepVal(field, -1))}
          onMouseUp={stopHold} onMouseLeave={stopHold}>−</button>
        <input className="dur-num" type="number" min="0" max="240"
          value={val.m} onChange={e => onChange({ ...val, m: parseInt(e.target.value) || 0 })} />
        <span className="dur-unit">m</span>
        <span className="dur-sep">·</span>
        <input className="dur-num dur-sec-input" type="number" min="0" max="59"
          value={val.s} onChange={e => onChange({ ...val, s: parseInt(e.target.value) || 0 })} />
        <span className="dur-unit">s</span>
        <button className="dur-btn"
          onMouseDown={() => startHold(() => stepVal(field, 1))}
          onMouseUp={stopHold} onMouseLeave={stopHold}>+</button>
      </div>
    </div>
  );

  return (
    <div className={`overlay${open ? ' open' : ''}`} id="pomoSettingsModal">
      <div className="modal" role="dialog" aria-modal="true">
        <div className="mhead">
          <div className="mtitle">TIMER SETTINGS</div>
          <button className="mcls" onClick={close}><i className="fas fa-times"></i></button>
        </div>
        <div className="modal-body">
          <div className="dur-row">
            {renderDurationField('Work', 'work', work, setWork)}
            {renderDurationField('Short Break', 'short', short, setShort)}
            {renderDurationField('Long Break', 'long', long, setLong)}
          </div>

          <div className="ps-cycle-wrap">
            <div className="dur-label ps-cycle-label">Sessions per cycle</div>
            <div className="cycle-controls">
              <div className="cycle-stepper">
                <button className="dur-btn"
                  onMouseDown={() => startHold(() => setCycle(prev => Math.max(1, prev - 1)))}
                  onMouseUp={stopHold} onMouseLeave={stopHold}>−</button>
                <input className="cycle-num" type="number" min="1" max="15"
                  value={cycle} onChange={e => setCycle(Math.max(1, Math.min(15, parseInt(e.target.value) || 4)))} />
                <button className="dur-btn"
                  onMouseDown={() => startHold(() => setCycle(prev => Math.min(15, prev + 1)))}
                  onMouseUp={stopHold} onMouseLeave={stopHold}>+</button>
              </div>
              <div className="cycle-presets">
                {[2, 3, 4, 5, 6].map(v => (
                  <button key={v} className={`cycle-preset${cycle === v ? ' on' : ''}`} onClick={() => setCycle(v)}>{v}</button>
                ))}
              </div>
            </div>
          </div>

          <hr className="mdivider" />

          <div className="toggle-row">
            <div className="toggle-label"><span>Auto-advance</span> — automatically start next phase</div>
            <label className="toggle">
              <input type="checkbox" checked={autoAdv} onChange={e => setAutoAdv(e.target.checked)} />
              <div className="toggle-track"></div>
              <div className="toggle-thumb"></div>
            </label>
          </div>

          <hr className="mdivider" />

          <div className="toggle-row">
            <div className="toggle-label"><span>Completion sound</span> — play bell when timer ends</div>
            <label className="toggle">
              <input type="checkbox" checked={soundEnabled} onChange={e => setSoundEnabled(e.target.checked)} />
              <div className="toggle-track"></div>
              <div className="toggle-thumb"></div>
            </label>
          </div>

          <hr className="mdivider" />

          {cycle > 0 && (
            <>
              <div className="ps-section-title">SKIP SPECIFIC BREAKS</div>
              <div className="ps-section-help">Uncheck to skip a break · click SHORT / LONG to change type</div>
              <div className="break-slots">
                {Array.from({ length: cycle }, (_, i) => (
                  <div key={i} className={`break-slot${!breakSlots[i]?.enabled ? ' skipped' : ''}`}>
                    <div className="break-slot-label">Break after <b>Session {i + 1}</b></div>
                    <div className="break-slot-controls">
                      <button className={`bs-type-btn ${breakSlots[i]?.type || 'short'}`}
                        disabled={!breakSlots[i]?.enabled}
                        onClick={() => toggleSlotType(i)}>
                        {(breakSlots[i]?.type || 'short').toUpperCase()} · {fmtHuman(breakSlots[i]?.type === 'long' ? long.m * 60 + long.s : short.m * 60 + short.s)}
                      </button>
                      <input type="checkbox" checked={breakSlots[i]?.enabled !== false}
                        onChange={() => toggleSlot(i)} />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <hr className="mdivider" />

          <div className="session-preview">
            <div className="sp-title">Session Preview</div>
            {(() => {
              const rows = [];
              for (let r = 0; r * 10 < previewTypes.length; r++) {
                const chunk = previewTypes.slice(r * 10, r * 10 + 10);
                rows.push(
                  <div key={r} className="sp-row">
                    {chunk.map((t, i) => (
                      <div key={r * 10 + i} className={`plan-block ${t}`}>{fmtHuman(secFor(t))}</div>
                    ))}
                  </div>
                );
              }
              return rows;
            })()}
            <div className="sp-stat">
              <b>{previewSessions} sessions</b> · total <b>{fmtHuman(previewTotal)}</b> (work: <b>{fmtHuman(previewWorkTotal)}</b>)
            </div>
          </div>
        </div>
        <div className="mfoot">
          <button className="btn btn-s" onClick={close}>CANCEL</button>
          <button className="btn btn-p" onClick={handleApply}><i className="fas fa-check"></i> APPLY</button>
        </div>
      </div>
    </div>
  );
}
