import { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { importData } from '../../api/data';

export default function ImportModal() {
  const { addToast } = useApp();
  const [open, setOpen] = useState(false);
  const [parsed, setParsed] = useState(null);
  const [mode, setMode] = useState('merge');
  const [err, setErr] = useState('');
  const [importing, setImporting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    const handler = () => {
      setParsed(null); setMode('merge'); setErr(''); setImporting(false);
      setOpen(true);
    };
    document.addEventListener('click', (e) => {
      if (e.target.closest('.imp')) handler();
    });
    return () => {};
  }, []);

  const close = () => setOpen(false);

  const readFile = (file) => {
    setErr('');
    setParsed(null);
    if (!file || file.type !== 'application/json') {
      setErr('Please select a .json file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const obj = JSON.parse(e.target.result);
        if (!obj || typeof obj !== 'object') throw new Error('Invalid format');
        setParsed(obj);
      } catch {
        setErr('Failed to parse JSON. Check the file format.');
      }
    };
    reader.readAsText(file);
  };

  const handleFile = (e) => {
    const file = e.target.files[0];
    readFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    readFile(file);
  };

  const handleImport = async () => {
    if (!parsed) return;
    setImporting(true);
    setErr('');
    try {
      await importData({ data: parsed, mode });
      addToast('Data imported successfully! Reloading…');
      close();
      setTimeout(() => window.location.reload(), 600);
    } catch {
      setErr('Import failed. Check the file format.');
      setImporting(false);
    }
  };

  const entriesCount = parsed?.entries?.length || 0;
  const projCount = parsed?.projects?.length || 0;
  const goalCount = parsed?.goals?.length || 0;
  const pomoCount = parsed?.pomoSessions?.length || 0;

  return (
    <div className={`overlay${open ? ' open' : ''}`} id="importModal">
      <div className="modal" role="dialog" aria-modal="true">
        <div className="mhead">
          <div className="mtitle">IMPORT DATA</div>
          <button className="mcls" onClick={close}><i className="fas fa-times"></i></button>
        </div>
        <div className="modal-body">
          {err && <div className="errmsg show mb">{err}</div>}

          <div className={`import-dropzone${dragOver ? ' drag-over' : ''}`}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}>
            <i className="fas fa-cloud-upload-alt import-icon"></i>
            <div className="import-text">Drag & drop your JSON file here, or click to browse</div>
            <input ref={fileRef} type="file" accept=".json" onChange={handleFile} style={{ display: 'none' }} />
          </div>

          {parsed && (
            <>
              <hr className="mdivider" />
              <div className="import-preview">
                <div className="import-preview-title">Preview</div>
                <div className="export-summary">
                  <div className="export-stat"><span className="export-label">Entries</span><span className="export-val">{entriesCount}</span></div>
                  <div className="export-stat"><span className="export-label">Projects</span><span className="export-val">{projCount}</span></div>
                  <div className="export-stat"><span className="export-label">Goals</span><span className="export-val">{goalCount}</span></div>
                  <div className="export-stat"><span className="export-label">Pomodoros</span><span className="export-val">{pomoCount}</span></div>
                </div>
              </div>

              <hr className="mdivider" />

              <div className="field">
                <label>Import Mode</label>
                <div className="import-mode-options">
                  <label className="radio-row">
                    <input type="radio" name="importMode" value="merge" checked={mode === 'merge'} onChange={() => setMode('merge')} />
                    <span><b>Merge</b> — add imported data to existing data</span>
                  </label>
                  <label className="radio-row">
                    <input type="radio" name="importMode" value="replace" checked={mode === 'replace'} onChange={() => setMode('replace')} />
                    <span><b>Replace</b> — overwrite all existing data</span>
                  </label>
                </div>
              </div>
            </>
          )}
        </div>
        <div className="mfoot">
          <button className="btn btn-s" onClick={close}>CANCEL</button>
          <button className="btn btn-p" onClick={handleImport} disabled={!parsed || importing}>
            {importing ? <><i className="fas fa-spinner fa-pulse"></i> IMPORTING…</> : <><i className="fas fa-upload"></i> IMPORT</>}
          </button>
        </div>
      </div>
    </div>
  );
}
