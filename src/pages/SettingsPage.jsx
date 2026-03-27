import { Bell, Database, Trash2, Info } from 'lucide-react';
import storageService from '../services/storage';
import useNotifications from '../hooks/useNotifications';
import './SettingsPage.css';

const SettingsPage = ({ medicines = [], onRefresh }) => {
  const { permission, requestPermission, supported } = useNotifications();

  const handleNotificationToggle = async () => {
    if (permission !== 'granted') {
      await requestPermission();
    }
  };

  const handleClearData = () => {
    if (confirm('Are you sure you want to delete all your data? This cannot be undone.')) {
      storageService.clearAll();
      if (onRefresh) onRefresh();
      alert('All data cleared');
    }
  };

  const getPermissionStatus = () => {
    if (!supported) return 'Not supported';
    switch (permission) {
      case 'granted': return 'Enabled';
      case 'denied': return 'Denied';
      default: return 'Not set';
    }
  };

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h2>Settings</h2>
      </div>
      
      <div className="settings-content">
        <div className="settings-section">
          <h3><Bell size={16} /> Notifications</h3>
          <div className="setting-item">
            <div className="setting-info">
              <span className="setting-label">Push Notifications</span>
              <span className="setting-value">{getPermissionStatus()}</span>
            </div>
            <button 
              className={`toggle-btn ${permission === 'granted' ? 'active' : ''}`}
              onClick={handleNotificationToggle}
            >
              {permission === 'granted' ? 'On' : 'Off'}
            </button>
          </div>
        </div>

        <div className="settings-section">
          <h3><Database size={16} /> Data</h3>
          <div className="setting-item">
            <div className="setting-info">
              <span className="setting-label">Total Medicines</span>
              <span className="setting-value">{medicines.length}</span>
            </div>
          </div>
          <div className="setting-item danger">
            <div className="setting-info">
              <span className="setting-label">Clear All Data</span>
              <span className="setting-value">Delete all medicines & history</span>
            </div>
            <button className="delete-btn" onClick={handleClearData}>
              <Trash2 size={14} /> Clear
            </button>
          </div>
        </div>

        <div className="settings-section">
          <h3><Info size={16} /> About</h3>
          <div className="setting-item">
            <div className="setting-info">
              <span className="setting-label">App Version</span>
              <span className="setting-value">1.0.0</span>
            </div>
          </div>
          <div className="setting-item">
            <div className="setting-info">
              <span className="setting-label">Tagline</span>
              <span className="setting-value">Never Miss a Dose</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
