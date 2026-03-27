import { Home, History, Settings } from 'lucide-react';
import './BottomNav.css';

const BottomNav = ({ currentPage, onNavigate }) => {
  const navItems = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'history', icon: History, label: 'History' },
    { id: 'settings', icon: Settings, label: 'Settings' }
  ];

  return (
    <nav className="bottom-nav">
      {navItems.map(item => {
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            className={`nav-item ${currentPage === item.id ? 'active' : ''}`}
            onClick={() => onNavigate(item.id)}
          >
            <Icon size={22} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

export default BottomNav;
