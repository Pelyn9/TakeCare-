import { useMemo } from 'react';
import { AlertTriangle, ArrowLeft, Bell, CheckCircle, Clock, Pill } from 'lucide-react';
import storageService from '../services/storage';
import { getMedicineSupply, isMedicineLowStock, isMedicineOutOfStock } from '../utils/medicineSchedule';
import './NotificationsPage.css';

const NotificationsPage = ({ onBack }) => {
  // Get notifications as derived state
  const notifications = useMemo(() => {
    const history = storageService.getHistory();
    const meds = storageService.getMedicines();

    // Convert history to notifications
    return history.map(entry => {
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
  }, []);

  const lowSupplyAlerts = useMemo(() => {
    return storageService
      .getMedicines()
      .filter((medicine) => isMedicineLowStock(medicine) || isMedicineOutOfStock(medicine))
      .map((medicine) => {
        const supply = getMedicineSupply(medicine) ?? 0;

        return {
          id: `low-stock-${medicine.id}`,
          medicineName: medicine.name,
          supply,
          critical: isMedicineOutOfStock(medicine),
        };
      })
      .sort((left, right) => left.supply - right.supply);
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
  const groupedNotifications = useMemo(() => {
    return notifications.reduce((groups, notification) => {
      const date = formatDate(notification.takenAt);
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(notification);
      return groups;
    }, {});
  }, [notifications]);

  return (
    <div className="notifications-page">
      <div className="notifications-header">
        <button className="back-btn" onClick={onBack}>
          <ArrowLeft size={20} />
        </button>
        <div className="header-content">
          <h2>Notifications</h2>
          <p className="notifications-subtitle">
            {lowSupplyAlerts.length} low stock alerts, {notifications.length} taken reminders
          </p>
        </div>
      </div>
      
      <div className="notifications-list">
        {notifications.length === 0 && lowSupplyAlerts.length === 0 ? (
          <div className="empty-notifications">
            <Bell size={48} className="empty-icon" />
            <p>No notifications yet</p>
            <span>Your medicine reminders will appear here</span>
          </div>
        ) : (
          <>
            {lowSupplyAlerts.length > 0 && (
              <div className="notification-group">
                <div className="notification-date">Low Supply</div>
                {lowSupplyAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`notification-item notification-item-alert ${alert.critical ? 'is-critical' : ''}`.trim()}
                  >
                    <div className="notification-icon notification-icon-alert">
                      <AlertTriangle size={20} />
                    </div>
                    <div className="notification-content">
                      <span className="notification-title">{alert.medicineName}</span>
                      <span className="notification-time">
                        {alert.critical ? 'Out of stock. Refill before the next dose.' : `Only ${alert.supply} medicines left.`}
                      </span>
                    </div>
                    <div className={`notification-status ${alert.critical ? 'pending' : ''}`.trim()}>
                      <AlertTriangle size={16} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {Object.entries(groupedNotifications).map(([date, items]) => (
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
            ))}
          </>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
