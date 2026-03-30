import { Download, Smartphone, Shield, Heart } from 'lucide-react';
import './DownloadPage.css';

const DownloadPage = () => {
  const handleDownload = () => {
    // Create a link element and trigger download
    const link = document.createElement('a');
    link.href = '/TakeCare-plus.apk';
    link.download = 'TakeCare-plus.apk';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="download-page">
      <div className="download-container">
        <div className="download-header">
          <div className="app-icon">
            <img src="/TakeCare+.png" alt="TakeCare+" className="app-logo" />
          </div>
          <h1>TakeCare+</h1>
          <p className="tagline">Never Miss a Dose</p>
        </div>

        <div className="download-content">
          <div className="developer-info">
            <Heart size={20} className="heart-icon" />
            <p>Developed with love by</p>
            <h2>Peejay Marco A. Apale</h2>
          </div>

          <div className="features">
            <div className="feature">
              <Smartphone size={24} />
              <div>
                <h3>Mobile App</h3>
                <p>Native Android application for the best experience</p>
              </div>
            </div>
            <div className="feature">
              <Shield size={24} />
              <div>
                <h3>Safe & Secure</h3>
                <p>Your health data stays on your device</p>
              </div>
            </div>
          </div>

          <div className="download-section">
            <button className="download-button" onClick={handleDownload}>
              <Download size={24} />
              <span>Download APK</span>
            </button>
            <p className="file-info">Version 1.0.0 • 6.9 MB</p>
          </div>

          <div className="instructions">
            <h3>How to Install:</h3>
            <ol>
              <li>Download the APK file</li>
              <li>Enable "Unknown Sources" in Settings > Security</li>
              <li>Open the downloaded APK file</li>
              <li>Follow the installation prompts</li>
              <li>Open TakeCare+ and start tracking your medicines!</li>
            </ol>
          </div>
        </div>

        <div className="download-footer">
          <p>© 2026 Peejay Marco A. Apale. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default DownloadPage;