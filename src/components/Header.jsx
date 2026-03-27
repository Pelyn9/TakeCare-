import { Bell, User } from 'lucide-react';
import './Header.css';

const Header = ({ takenCount, totalCount }) => {
  const getCurrentDate = () => {
    const date = new Date();
    const options = { weekday: 'long', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  return (
    <header className="app-header">
      <div className="header-top">
        <span className="logo">TC+</span>
        <div className="header-actions">
          <button className="icon-btn">
            <Bell size={20} />
          </button>
          <button className="icon-btn profile">
            <User size={20} />
          </button>
        </div>
      </div>
      
      <div className="greeting">
        <span className="greeting-text">Hi, User</span>
        <span className="date-text">{getCurrentDate()}</span>
      </div>

      <div className="today-card">
        <div className="today-icon">💊</div>
        <div className="today-info">
          <span className="today-title">Today's Medicines</span>
          <span className="today-count">{takenCount}/{totalCount}</span>
        </div>
      </div>
    </header>
  );
};

export default Header;