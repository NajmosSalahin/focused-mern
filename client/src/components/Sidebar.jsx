export default function Sidebar() {
  const openModal = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.classList.add('open');
      window.dispatchEvent(new CustomEvent('syncTermBehind'));
    }
  };

  return (
    <div className="sidebar">
      <div className="card">
        <div className="act-btns">
          <button className="act-btn stat-btn" onClick={() => openModal('statsModal')}>
            <i className="fas fa-chart-line"></i> STATISTICS
          </button>
          <button className="act-btn imp" onClick={() => openModal('importModal')}>
            <i className="fas fa-upload"></i> IMPORT DATA
          </button>
          <button className="act-btn exp" onClick={() => openModal('exportModal')}>
            <i className="fas fa-download"></i> EXPORT DATA
          </button>
        </div>
      </div>
    </div>
  );
}
