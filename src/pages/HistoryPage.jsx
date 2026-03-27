import { useMemo } from 'react';
import { Clock, Pill, CheckCircle } from 'lucide-react';
import storageService from '../services/storage';
import './HistoryPage.css';

const HistoryPage = () => {
  // Get history data as derived state
  const historyData = useMemo(() => {
    const history = storageService.getHistory();
    const medicines = storageService.getMedicines();
    
    // Sort by date, most recent first
    const sorted = [...history].sort((a, b) => 
      new Date(b.takenAt) - new Date(a.takenAt)
    );
    
    // Add medicine name to each entry
    return sorted.map(entry => {
      const medicine = medicines.find(m => m.id === entry.medicineId);
      return {
        ...entry,
        medicineName: medicine ? medicine.name : 'Unknown Medicine',
        medicineIcon: medicine ? medicine.icon : 'pill'
      };
    });
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

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  // Group history by date
  const groupedHistory = useMemo(() => {
    return historyData.reduce((groups, entry) => {
      const date = formatDate(entry.takenAt);
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(entry);
      return groups;
    }, {});
  }, [historyData]);

  return (
    <div className="history-page">
      <div className="history-header">
        <h2>History</h2>
        <p className="history-subtitle">{historyData.length} doses taken</p>
      </div>
      
      <div className="history-list">
        {historyData.length === 0 ? (
          <div className="empty-history">
            <Clock size={48} className="empty-icon" />
            <p>No history yet</p>
            <span>Your taken medicines will appear here</span>
          </div>
        ) : (
          Object.entries(groupedHistory).map(([date, items]) => (
            <div key={date} className="history-group">
              <div className="history-date">{date}</div>
              {items.map((entry, index) => (
                <div key={`${entry.medicineId}-${entry.time}-${entry.takenAt}-${index}`} className="history-item">
                  <div className="history-icon">
                    <Pill size={18} />
                  </div>
                  <div className="history-content">
                    <span className="history-title">{entry.medicineName}</span>
                    <span className="history-time">
                      <Clock size={12} />
                      Scheduled: {formatTime(entry.time)} • Taken at {formatDateTime(entry.takenAt)}
                    </span>
                  </div>
                  <div className="history-status">
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

export default HistoryPage;
