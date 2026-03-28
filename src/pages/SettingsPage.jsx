import { useState, useEffect } from 'react';
import { Bell, Database, Trash2, Info } from 'lucide-react';
import storageService from '../services/storage';
import alarmService from '../services/alarmService';
import './SettingsPage.css';

const SettingsPage = ({ medicines = [], onRefresh }) => {
  const [notificationStatus, setNotificationStatus] = useState('checking');
  const [exactAlarmStatus, setExactAlarmStatus] = useState('checking');

  useEffect(() => {
    checkNotificationStatus();
  }, []);

  const checkNotificationStatus = async () => {
    const [notificationPermission, exactAlarmPermission] = await Promise.all([
      alarmService.checkPermissionStatus(),
      alarmService.checkExactAlarmStatus(),
    ]);

    setNotificationStatus(notificationPermission);
    setExactAlarmStatus(exactAlarmPermission);
  };

  const handleNotificationToggle = async () => {
    if (notificationStatus === 'granted') {
      // User wants to disable - show info that they need to do it from system settings
      alert('To disable notifications, go to your phone\'s Settings > Apps > TakeCare+ > Notifications and turn them off.');
      return;
    }
    
    // Request permission to enable
    const granted = await alarmService.requestPermission();
    if (granted) {
      setNotificationStatus('granted');
      // Initialize notifications after permission is granted
      await alarmService.initializeNotifications();
      await checkNotificationStatus();
      if (onRefresh) {
        onRefresh();
      }
    } else {
      setNotificationStatus('denied');
    }
  };

  const handleClearData = async () => {
    if (confirm('Are you sure you want to delete all your data? This cannot be undone.')) {
      await alarmService.cancelAllAlarms();
      storageService.clearAll();
      if (onRefresh) onRefresh();
      alert('All data cleared');
    }
  };

  const getPermissionStatus = () => {
    switch (notificationStatus) {
      case 'granted': return 'Enabled';
      case 'denied': return 'Denied';
      case 'checking': return 'Checking...';
      default: return 'Not set';
    }
  };

  const getExactAlarmStatus = () => {
    switch (exactAlarmStatus) {
      case 'granted': return 'Enabled';
      case 'denied': return 'Disabled';
      case 'checking': return 'Checking...';
      case 'unsupported': return 'Not needed';
      default: return 'Unknown';
    }
  };

  const handleExactAlarmSettings = async () => {
    const status = await alarmService.openExactAlarmSettings();
    if (status && status !== 'unsupported') {
      setExactAlarmStatus(status);
      if (onRefresh) {
        onRefresh();
      }
      return;
    }

    await checkNotificationStatus();
  };

  return (
    <div className="settings-page">
      <div className="settings-page-shell">
        <div className="settings-header" style={{ '--settings-index': 0 }}>
          <span className="settings-eyebrow">Settings</span>
          <h2>App preferences</h2>
          <p>Manage reminders, alarms, and your stored medicine data.</p>
        </div>
        
        <div className="settings-content">
        <div className="settings-section" style={{ '--settings-index': 1 }}>
          <h3><Bell size={16} /> Notifications</h3>
          <div className="setting-item">
            <div className="setting-info">
              <span className="setting-label">Push Notifications</span>
              <span className="setting-value">{getPermissionStatus()}</span>
            </div>
            <button 
              className={`toggle-btn ${notificationStatus === 'granted' ? 'active' : ''}`}
              onClick={handleNotificationToggle}
            >
              {notificationStatus === 'granted' ? 'On' : 'Off'}
            </button>
          </div>
          <div className="setting-item">
            <div className="setting-info">
              <span className="setting-label">Exact Alarm Timing</span>
              <span className="setting-value">
                {getExactAlarmStatus()}.
                Alarms ring on the phone schedule even when the app is not open.
              </span>
            </div>
            <button className="action-btn" onClick={handleExactAlarmSettings}>
              Manage
            </button>
          </div>
        </div>

        <div className="settings-section" style={{ '--settings-index': 2 }}>
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

        <div className="settings-section" style={{ '--settings-index': 3 }}>
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
    </div>
  );
};

export default SettingsPage;
