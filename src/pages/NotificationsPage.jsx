import { useState, useEffect } from 'react';
import { Bell, Clock, CheckCircle, Pill, ArrowLeft } from 'lucide-react';
import storageService from '../services/storage';
import './NotificationsPage.css';

const NotificationsPage = ({ onBack }) => {
  const [notifications, setNotifications] = useState([]);
  const [medicines, setMedicines] = useState([]);

  useEffect(() => {
    // Get all history entries as notifications
    const history = storageService.getHistory();
    const meds = storageService.getMedicines();
    setMedicines(meds);

    // Convert history to notifications
    const notifs = history.map(entry => {
      const medicine = meds.find(m => m.id === entry.medicineId);
      return {
        id: entry.id || `${entry.medicineId}-${entry.time}-${entry.takenAt}`,
        medicineId: entry.medicineId,
        medicineName: medicine ? medicine.name : 'Unknown Medicine',
        time: entry.time,
        takenAt: entry.takenAt,
        status: 'taken'
      };
    }).sort((a, b) => new Date(b.takenAt) - new Date(a.takenAt));

    setNotifications(notifs);
  }, []);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatTime = (time) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  // Group notifications by date
  const groupedNotifications = notifications.reduce((groups, notification) => {
    const date = formatDate(notification.takenAt);
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(notification);
    return groups;
  }, {});

  return (
    <div className="notifications-page">
      <div className="notifications-header">
        <button className="back-btn" onClick={onBack}>
          <ArrowLeft size={20} />
        </button>
        <div className="header-content">
          <h2>Notifications</h2>
          <p className="notifications-subtitle">{notifications.length} reminders</p>
        </div>
      </div>
      
      <div className="notifications-list">
        {notifications.length === 0 ? (
          <div className="empty-notifications">
            <Bell size={48} className="empty-icon" />
            <p>No notifications yet</p>
            <span>Your medicine reminders will appear here</span>
          </div>
        ) : (
          Object.entries(groupedNotifications).map(([date, items]) => (
            <div key={date} className="notification-group">
              <div className="notification-date">{date}</div>
              {items.map((notification) => (
                <div key={notification.id} className="notification-item">
                  <div className="notification-icon">
                    <Pill size={20} />
                  </div>
                  <div className="notification-content">
                    <span className="notification-title">{notification.medicineName}</span>
                    <span className="notification-time">
                      <Clock size={12} />
                      {formatTime(notification.time)}
                    </span>
                  </div>
                  <div className="notification-status">
                    <CheckCircle size={16} />
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
