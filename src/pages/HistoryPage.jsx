import { useState, useEffect } from 'react';
import { Clock, Calendar, FileText } from 'lucide-react';
import storageService from '../services/storage';
import './HistoryPage.css';

const HistoryPage = () => {
  const [history, setHistory] = useState([]);
  const [medicines, setMedicines] = useState([]);

  useEffect(() => {
    const historyData = storageService.getHistory();
    const medicinesData = storageService.getMedicines();
    setMedicines(medicinesData);
    
    // Sort by date, most recent first
    const sorted = historyData.sort((a, b) => 
      new Date(b.takenAt) - new Date(a.takenAt)
    );
    setHistory(sorted);
  }, []);

  const getMedicineName = (medicineId) => {
    const medicine = medicines.find(m => m.id === medicineId);
    return medicine ? medicine.name : 'Unknown';
  };

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

  return (
    <div className="history-page">
      <div className="history-header">
        <h2>History</h2>
        <p className="history-subtitle">{history.length} {history.length === 1 ? 'entry' : 'entries'}</p>
      </div>
      
      <div className="history-list">
        {history.length === 0 ? (
          <div className="empty-history">
            <FileText size={48} className="empty-icon" />
            <p>No history yet</p>
            <p className="empty-subtext">Your taken medicines will appear here</p>
          </div>
        ) : (
          history.map((entry, index) => (
            <div key={index} className="history-item">
              <div className="history-info">
                <span className="history-name">{getMedicineName(entry.medicineId)}</span>
                <span className="history-time">
                  <Clock size={12} /> {formatTime(entry.time)}
                </span>
              </div>
              <span className="history-date">
                <Calendar size={12} /> {formatDate(entry.takenAt)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default HistoryPage;
