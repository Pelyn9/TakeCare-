import { useState } from 'react';
import { Bell, User, Plus, Home, Clock, Settings } from 'lucide-react';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import FloatingActionButton from './components/FloatingActionButton';
import HomePage from './pages/HomePage';
import HistoryPage from './pages/HistoryPage';
import SettingsPage from './pages/SettingsPage';
import AddMedicineModal from './components/AddMedicineModal';
import useMedicines from './hooks/useMedicines';
import './App.css';

function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { todayDoses, addMedicine, markDoseTaken, medicines } = useMedicines();

  const takenCount = todayDoses.filter(d => d.taken).length;
  const totalCount = todayDoses.length;

  const handleSaveMedicine = (medicineData) => {
    addMedicine(medicineData);
    setIsModalOpen(false);
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage todayDoses={todayDoses} onMarkTaken={markDoseTaken} />;
      case 'history':
        return <HistoryPage />;
      case 'settings':
        return <SettingsPage medicines={medicines} />;
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
