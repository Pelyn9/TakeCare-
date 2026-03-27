import './MobileContainer.css';

const MobileContainer = ({ children, className = '' }) => {
  return (
    <div className={`mobile-container ${className}`}>
      <div className="mobile-screen">
        <div className="safe-area-top" />
        <div className="mobile-content">
          {children}
        </div>
        <div className="safe-area-bottom" />
      </div>
    </div>
  );
};

export default MobileContainer;