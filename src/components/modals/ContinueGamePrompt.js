// src/components/modals/ContinueGamePrompt.js
import React from "react";
import "../../Styles/About.css";
import "../../Styles/Modal.css";
import { useSettings } from "../../context/SettingsContext";
import { useGameState } from "../../context/GameStateContext";

/**
 * Modal that prompts user to continue an existing game or start a new one
 */
function ContinueGamePrompt({
  isOpen,
  onClose,
  gameStats,
  onContinue,
  onNewGame,
}) {
  // Get theme from settings
  const { settings } = useSettings();

  // Don't render if not open
  if (!isOpen) {
    return null;
  }

  // Format completion percentage
  const formatPercentage = (value) => {
    if (typeof value !== "number") return "0%";
    return `${Math.round(value)}%`;
  };

  // Format time spent
  const formatTime = (seconds) => {
    if (typeof seconds !== "number") return "0m 0s";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  // Use provided gameStats or default to empty object
  const stats = gameStats || {};

  return (
    <div className="about-overlay">
      <div
        className={`about-container ${settings.theme === "dark" ? "dark-theme" : ""} text-${settings.textColor}`}
      >
        <button className="about-close" onClick={onClose}>
          &times;
        </button>
        <h2>Active Game Found</h2>
        <p>
          You have an active game in progress. Would you like to continue or
          start a new game?
        </p>

        <div
          className="game-stats-container"
          style={{
            margin: "20px 0",
            padding: "15px",
            backgroundColor: settings.theme === "dark" ? "#333" : "#f8f9fa",
            borderRadius: "8px",
          }}
        >
          <h3 style={{ margin: "0 0 15px 0" }}>Game Progress</h3>
          <div
            className="game-stats-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "10px",
            }}
          >
            <div className="stat-item">
              <span className="stat-label">Difficulty:</span>
              <span
                className="stat-value"
                style={{ textTransform: "capitalize" }}
              >
                {stats.difficulty || "Unknown"}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Completion:</span>
              <span className="stat-value">
                {formatPercentage(stats.completion_percentage)}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Mistakes:</span>
              <span className="stat-value">
                {stats.mistakes || 0}/{stats.max_mistakes || 0}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Time Spent:</span>
              <span className="stat-value">{formatTime(stats.time_spent)}</span>
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: "25px",
          }}
        >
          <button
            onClick={onNewGame}
            style={{
              backgroundColor: "#6c757d",
              color: "white",
              padding: "8px 16px",
              borderRadius: "4px",
              border: "none",
              cursor: "pointer",
            }}
          >
            Start New Game
          </button>
          <button
            onClick={onContinue}
            style={{
              backgroundColor:
                settings.theme === "dark" ? "#4cc9f0" : "#007bff",
              color: settings.theme === "dark" ? "black" : "white",
              padding: "8px 16px",
              borderRadius: "4px",
              border: "none",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            Continue Game
          </button>
        </div>
      </div>
    </div>
  );
}

export default ContinueGamePrompt;
