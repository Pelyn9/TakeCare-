import { Bell, CalendarDays, Home } from 'lucide-react';
import './Header.css';

const Header = ({ onNotificationClick, activeView, onViewChange }) => {
  const formattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <header className="app-header">
      <div className="header-topbar">
        <div className="header-brand">
          <div className="brand-mark">
            <img src="/TakeCare+.png" alt="TakeCare+" className="brand-logo" />
          </div>

          <div className="brand-copy">
            <span className="brand-name">Medication Tracker</span>
            <span className="brand-date">{formattedDate}</span>
          </div>
        </div>

        <div className="header-actions">
          <button
            type="button"
            className="header-icon-btn"
            onClick={onNotificationClick}
            aria-label="Open notifications"
          >
            <Bell size={18} />
          </button>
        </div>
      </div>

      <div className="home-tab-bar" role="tablist" aria-label="Medicine views">
        <button
          type="button"
          className={`home-tab ${activeView === 'progress' ? 'is-active' : ''}`}
          onClick={() => onViewChange('progress')}
        >
          <Home size={16} />
          <span>Today</span>
        </button>

        <button
          type="button"
          className={`home-tab ${activeView === 'schedule' ? 'is-active' : ''}`}
          onClick={() => onViewChange('schedule')}
        >
          <CalendarDays size={16} />
          <span>Schedule</span>
        </button>
      </div>
    </header>
  );
};

export default Header;
