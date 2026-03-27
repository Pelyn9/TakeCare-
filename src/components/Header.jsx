import { Bell } from 'lucide-react';
import './Header.css';

const Header = ({ takenCount, totalCount }) => {
  const getCurrentDate = () => {
    const date = new Date();
    const options = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  return (
    <header className="app-header">
      <div className="header-top">
        <div className="logo-container">
          <img src="/TakeCare+.png" alt="TakeCare+" className="logo-img" />
          <span className="app-name">Medication Tracker</span>
        </div>
        <button className="icon-btn">
          <Bell size={20} />
        </button>
      </div>
      
      <div className="greeting">
        <span className="date-text">{getCurrentDate()}</span>
      </div>

      <div className="today-card">
        <div className="today-icon">
          <img src="/TakeCare+.png" alt="pill" />
        </div>
        <div className="today-info">
          <span className="today-title">Today's Progress</span>
          <span className="today-count">{takenCount} of {totalCount} taken</span>
        </div>
        <div className="today-progress">
          <div 
            className="progress-bar" 
            style={{ width: totalCount > 0 ? `${(takenCount / totalCount) * 100}%` : '0%' }}
          />
        </div>
      </div>
    </header>
  );
};

export default Header;
