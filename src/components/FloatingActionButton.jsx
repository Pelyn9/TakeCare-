import { Plus } from 'lucide-react';
import './FloatingActionButton.css';

const FloatingActionButton = ({ onClick }) => {
  return (
    <button className="fab" onClick={onClick} aria-label="Add medicine">
      <Plus size={28} />
    </button>
  );
};

export default FloatingActionButton;