import React, { useState, useEffect } from "react";
import useSettingsStore from "../../stores/settingsStore";
import useDeviceDetection from "../../hooks/useDeviceDetection";

/**
 * Enhanced mobile layout that properly handles orientation
 * Detects and responds to landscape/portrait orientations
 */
const MobileLayout = ({ children }) => {
  // Get theme settings from store
  const settings = useSettingsStore((state) => state.settings);
  const { theme, textColor } = settings;

  // Get device information from our detection hook
  const { isMobile, isLandscape } = useDeviceDetection();

  // State for first-time portrait mode notification
  const [showPortraitNotice, setShowPortraitNotice] = useState(false);

  // Check if we should show the portrait warning
  // useEffect(() => {
  //   // Show much less frequently - once per week instead of every 30 minutes
  //   const SHOW_INTERVAL = 1000 * 60 * 60 * 24 * 7; // Show once per week
  //   const MIN_INTERVAL = 1000 * 60 * 60 * 24; // But not more often than once per day

  //   const isTablet = () => {
  //     return (
  //       // Check for iPad specifically
  //       /iPad/.test(navigator.userAgent) ||
  //       // Check for tablet-sized screen
  //       (window.innerWidth >= 768 && window.innerHeight >= 768)
  //     );
  //   };

  //   const shouldShowWarning = () => {
  //     if (isLandscape || isTablet()) return false;

  //     const lastShown = parseInt(
  //       localStorage.getItem("portrait-notice-last-shown") || "0",
  //     );
  //     const timeSinceLastShown = Date.now() - lastShown;

  //     // Only show if never shown or enough time has passed
  //     return !lastShown || timeSinceLastShown >= SHOW_INTERVAL;
  //   };

  //   if (shouldShowWarning()) {
  //     setShowPortraitNotice(true);
  //     localStorage.setItem("portrait-notice-last-shown", Date.now().toString());

  //     const timer = setTimeout(() => {
  //       setShowPortraitNotice(false);
  //     }, 5000);

  //     return () => clearTimeout(timer);
  //   }
  // }, [isLandscape]);

  // Assemble classes based on orientation and theme
  const mobileClasses = `
    mobile-mode 
    ${theme === "dark" ? "dark-theme" : ""} 
    text-${textColor || "default"}
    ${isLandscape ? "landscape-mode" : "portrait-mode"}
  `;

  // Render the mobile layout with appropriate classes
  return (
    <div
      className={mobileClasses}
      data-theme={theme}
      data-orientation={isLandscape ? "landscape" : "portrait"}
    >
      {/* Orientation notice for portrait mode */}
      {showPortraitNotice && (
        <div className="orientation-notice">
          <div className="notice-content">
            <p>otate your device to landscape mode</p>
            <button onClick={() => setShowPortraitNotice(false)}>Got it</button>
          </div>
        </div>
      )}

      {/* Mobile container with orientation-aware class */}
      <div className="mobile-game-container">{children}</div>
    </div>
  );
};

export default MobileLayout;
