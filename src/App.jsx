import { useState, useEffect, useCallback } from 'react';
import { Bell, User, Plus, Home, Clock, Settings } from 'lucide-react';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import FloatingActionButton from './components/FloatingActionButton';
import HomePage from './pages/HomePage';
import HistoryPage from './pages/HistoryPage';
import SettingsPage from './pages/SettingsPage';
import AddMedicineModal from './components/AddMedicineModal';
import useMedicines from './hooks/useMedicines';
import alarmService from './services/alarmService';
import './App.css';

function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState('default');
  const { todayDoses, addMedicine, markDoseTaken, medicines, refresh } = useMedicines();

  const takenCount = todayDoses.filter(d => d.taken).length;
  const totalCount = todayDoses.length;

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, []);

  // Schedule alarms for all doses
  useEffect(() => {
    todayDoses.forEach(dose => {
      if (!dose.taken) {
        alarmService.scheduleAlarm(dose.medicineName, dose.time, () => {
          // Trigger alarm callback
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(`Time for ${dose.medicineName}!`, {
              body: `It's time to take your medicine at ${dose.time}`,
              requireInteraction: true,
              tag: `dose-${dose.id}`
            });
          }
          // Play alarm sound and vibrate
          alarmService.triggerAlarm();
        });
      }
    });
    
    return () => {
      alarmService.cancelAllAlarms();
    };
  }, [todayDoses]);

  // Check for due doses every minute
  useEffect(() => {
    const interval = setInterval(() => {
      alarmService.checkAndNotify(todayDoses, (dose) => {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(`Time for ${dose.medicineName}!`, {
            body: `It's time to take your medicine`,
            requireInteraction: true,
            tag: `dose-${dose.id}`
          });
        }
        alarmService.triggerAlarm();
      });
    }, 60000);

    return () => clearInterval(interval);
  }, [todayDoses]);

  const handleSaveMedicine = (medicineData) => {
    addMedicine(medicineData);
    setIsModalOpen(false);
    // Refresh to update alarms
    setTimeout(refresh, 100);
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage todayDoses={todayDoses} onMarkTaken={markDoseTaken} />;
      case 'history':
        return <HistoryPage />;
      case 'settings':
        return <SettingsPage medicines={medicines} onRefresh={refresh} />;
      default:
        return <HomePage todayDoses={todayDoses} onMarkTaken={markDoseTaken} />;
    }
  };

  return (
    <div className="app-container">
      <div className="app-content">
        {currentPage === 'home' && (
          <Header takenCount={takenCount} totalCount={totalCount} />
        )}
        
        <div className={`page-content ${currentPage === 'home' ? 'has-header' : ''}`}>
          {renderPage()}
        </div>

        <BottomNav currentPage={currentPage} onNavigate={setCurrentPage} />

        {currentPage === 'home' && (
          <FloatingActionButton onClick={() => setIsModalOpen(true)} />
        )}

        <AddMedicineModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveMedicine}
        />
      </div>
    </div>
  );
}

export default App;
