import { useState, useEffect } from 'react';
import { Bell, Database, Trash2, Info, AlertCircle } from 'lucide-react';
import Header from '../components/Header';
import storageService from '../services/storage';
import useNotifications from '../hooks/useNotifications';
import './SettingsPage.css';

const SettingsPage = () => {
  const { permission, requestPermission, supported } = useNotifications();
  const [medicines, setMedicines] = useState([]);

  useEffect(() => {
    const meds = storageService.getMedicines();
    setMedicines(meds);
  }, []);

  const handleNotificationToggle = async () => {
    if (permission !== 'granted') {
      await requestPermission();
    }
  };

  const handleClearData = () => {
    if (confirm('Are you sure you want to delete all your data? This cannot be undone.')) {
      storageService.clearAll();
      setMedicines([]);
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
      <Header />
      
      <div className="settings-content">
        <h2>Settings</h2>
        
        <div className="settings-section">
          <h3><Bell size={14} /> Notifications</h3>
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
          <h3><Database size={14} /> Data</h3>
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
          <h3><Info size={14} /> About</h3>
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