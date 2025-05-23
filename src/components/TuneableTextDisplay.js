// src/components/TuneableTextDisplay.js
import React, { useRef, useEffect, useState } from "react";
import useUIStore from "../stores/uiStore";
import useDeviceDetection from "../hooks/useDeviceDetection";

// Additional CSS for tiny screens
const tinyScreenStyles = `
  .tiny-screen .grid-text-display {
    margin: 0 -5px; /* Reduce margins */
  }

  .tiny-screen .text-line-block {
    margin-bottom: 2px; /* Reduce space between blocks */
  }

  .tiny-screen .char-line {
    line-height: 1; /* Tighter line height */
  }

  @media (max-width: 380px) and (max-height: 670px) {
    .text-container {
      padding: 6px !important; /* Reduce padding */
    }

    .text-container .char-cell {
      letter-spacing: -0.02em; /* Slightly tighter letter spacing */
    }
  }

  /* Extremely tiny screens */
  @media (max-width: 330px) and (max-height: 600px) {
    .text-container {
      padding: 3px !important; /* Minimal padding */
    }

    .text-container .char-cell {
      letter-spacing: -0.05em; /* Tighter letter spacing */
    }

    .text-line-block {
      margin-bottom: 1px !important; /* Minimal space between blocks */
    }
  }
`;

// Tuning parameters - TWEAK THESE VALUES
const TUNING = {
  // Portrait mode
  portrait: {
    desktop: {
      widthRatio: 0.6, // Width to height ratio (0.6 means width is 60% of height)
      fontRatio: 0.65, // Font size as percentage of cell height
      minCellWidth: 7, // Minimum cell width in pixels
      maxCellWidth: 12, // Maximum cell width in pixels
      minCellHeight: 12, // Minimum cell height in pixels
      maxCellHeight: 18, // Maximum cell height in pixels
      minCharsPerLine: 25, // Minimum characters per line
      maxLines: 999, // No practical limit on lines
    },
    mobile: {
      widthRatio: 0.6, // Width to height ratio
      fontRatio: 1, // Font size as percentage of cell height
      minCellWidth: 14, // Minimum cell width in pixels (reduced for very small screens)
      maxCellWidth: 15, // Maximum cell width in pixels
      minCellHeight: 20, // Minimum cell height in pixels (slightly reduced)
      maxCellHeight: 22, // Maximum cell height in pixels
      minCharsPerLine: 20, // Reduced min chars for very small screens
      maxLines: 999, // No practical limit on lines
    },
  },
  // Landscape mode
  landscape: {
    desktop: {
      widthRatio: 0.6, // Width to height ratio
      fontRatio: 1.15, // Font size as percentage of cell height
      minCellWidth: 17, // Minimum cell width in pixels
      maxCellWidth: 17, // Maximum cell width in pixels
      minCellHeight: 20, // Minimum cell height in pixels
      maxCellHeight: 20, // Maximum cell height in pixels
      minCharsPerLine: 55, // Minimum characters per line
      maxLines: 3, // Maximum of 3 lines in landscape
    },
    mobile: {
      widthRatio: 0.6, // Width to height ratio
      fontRatio: 1.05, // Font size as percentage of cell height
      minCellWidth: 13, // Reduced for very small screens
      maxCellWidth: 15, // Maximum cell width in pixels
      minCellHeight: 16, // Reduced for very small screens
      maxCellHeight: 18, // Maximum cell height in pixels
      minCharsPerLine: 40, // Reduced for very small screens
      maxLines: 2, // Maximum of 2 lines in landscape
    },
  },
};

const TuneableTextDisplay = ({
  encrypted = "",
  display = "",
  hardcoreMode = false,
}) => {
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const useMobileMode = useUIStore((state) => state.useMobileMode);
  const { isLandscape } = useDeviceDetection();

  // Character display settings
  const [cellWidth, setCellWidth] = useState(10);
  const [cellHeight, setCellHeight] = useState(16);
  const [charsPerLine, setCharsPerLine] = useState(40);

  // For debugging - will show parameters on screen
  const [debugInfo, setDebugInfo] = useState({});

  // Update container dimensions
  useEffect(() => {
    const updateContainerSize = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
        setContainerHeight(containerRef.current.clientHeight);
      }
    };

    updateContainerSize();
    window.addEventListener("resize", updateContainerSize);
    window.addEventListener("orientationchange", () => {
      setTimeout(updateContainerSize, 200);
    });

    return () => {
      window.removeEventListener("resize", updateContainerSize);
      window.removeEventListener("orientationchange", updateContainerSize);
    };
  }, []);

  // Calculate optimal display parameters
  useEffect(() => {
    if (!encrypted || containerWidth === 0) return;

    // Get tuning parameters based on orientation and device
    const orientation = isLandscape ? "landscape" : "portrait";
    const device = useMobileMode ? "mobile" : "desktop";
    const params = TUNING[orientation][device];

    // Available width minus some padding
    const availableWidth = containerWidth - 20;

    // Find longest line for reference
    const lines = encrypted.split("\n");
    const maxLineLength = Math.max(...lines.map((line) => line.length));

    // Calculate how many chars fit per line based on width
    let newCharsPerLine = Math.floor(availableWidth / params.minCellWidth);

    // Ensure minimum number of chars per line
    newCharsPerLine = Math.max(newCharsPerLine, params.minCharsPerLine);

    // If original text fits, use it
    if (maxLineLength <= newCharsPerLine) {
      newCharsPerLine = maxLineLength;
    }

    // Calculate optimal cell width based on the chars per line
    let newCellWidth = Math.floor(availableWidth / newCharsPerLine);

    // Ensure cell width stays within bounds
    newCellWidth = Math.min(
      Math.max(newCellWidth, params.minCellWidth),
      params.maxCellWidth,
    );

    // Calculate cell height based on width and aspect ratio
    let newCellHeight = Math.round(newCellWidth / params.widthRatio);

    // Ensure height is within bounds
    newCellHeight = Math.min(
      Math.max(newCellHeight, params.minCellHeight),
      params.maxCellHeight,
    );

    // Special handling for very small screens (≤380x670)
    // Apply proportional scaling to maintain readability
    const isTinyScreen = window.innerWidth <= 380 && window.innerHeight <= 670;
    const isExtremelyTinyScreen =
      window.innerWidth <= 330 && window.innerHeight <= 600;

    if (isTinyScreen) {
      // Calculate scaling factor based on screen size
      // We'll use a gentle scaling that's proportional to screen dimensions
      let scaleFactor;

      if (isExtremelyTinyScreen) {
        // More aggressive scaling for extremely tiny screens
        scaleFactor = Math.max(
          0.75,
          Math.min(0.9, (window.innerWidth / 330) * 0.85),
        );
        // Further reduce chars per line for readability
        newCharsPerLine = Math.max(
          newCharsPerLine - 4,
          params.minCharsPerLine - 4,
        );
      } else {
        // Normal tiny screen scaling
        scaleFactor = Math.max(
          0.85,
          Math.min(1.0, (window.innerWidth / 380) * 0.95),
        );
        // Slightly reduce chars per line if needed
        newCharsPerLine = Math.max(
          newCharsPerLine - 2,
          params.minCharsPerLine - 2,
        );
      }

      // Scale all dimensions proportionally
      newCellWidth = Math.floor(newCellWidth * scaleFactor);
      newCellHeight = Math.floor(newCellHeight * scaleFactor);
    }

    // Apply results
    setCharsPerLine(newCharsPerLine);
    setCellWidth(newCellWidth);
    setCellHeight(newCellHeight);

    // Update debug info
    setDebugInfo({
      orientation,
      device,
      containerWidth,
      cellWidth: newCellWidth,
      cellHeight: newCellHeight,
      charsPerLine: newCharsPerLine,
      fontSize: Math.max(newCellHeight * params.fontRatio, 10),
      ratio: params.widthRatio,
      isTinyScreen: isTinyScreen || false,
    });
  }, [encrypted, containerWidth, useMobileMode, isLandscape]);

  // Process text with word-aware line breaks and respect maxLines limit
  const processTextWithLineBreaks = (text) => {
    if (!text) return [];

    // Get orientation and device parameters
    const orientation = isLandscape ? "landscape" : "portrait";
    const device = useMobileMode ? "mobile" : "desktop";
    const params = TUNING[orientation][device];

    // Split original text into lines (respecting manual line breaks)
    const originalLines = text.split("\n");
    const processedLines = [];

    // Process lines with respect to max lines limit
    let linesAdded = 0;
    let lineBuffer = [];

    originalLines.forEach((line) => {
      // Skip if we've reached max lines
      if (linesAdded >= params.maxLines && params.maxLines > 0) return;

      // If line is shorter than the limit, keep it as is
      if (line.length <= charsPerLine) {
        if (linesAdded < params.maxLines || params.maxLines <= 0) {
          processedLines.push(line);
          linesAdded++;
        }
        return;
      }

      // For longer lines, we need to break them
      const words = line.split(/(\s+)/); // Split by whitespace, keeping separators
      let currentLine = "";

      words.forEach((word) => {
        // Check if we've reached max lines
        if (linesAdded >= params.maxLines && params.maxLines > 0) return;

        // If adding this word would exceed the limit
        if (currentLine.length + word.length > charsPerLine) {
          // If current line is not empty, push it
          if (currentLine.length > 0) {
            processedLines.push(currentLine);
            linesAdded++;
            currentLine = "";
          }

          // If we've reached max lines, stop
          if (linesAdded >= params.maxLines && params.maxLines > 0) return;

          // If the word itself is longer than the limit, we need to chunk it
          if (word.length > charsPerLine) {
            // Break long word into chunks
            for (
              let i = 0;
              i < word.length &&
              (linesAdded < params.maxLines || params.maxLines <= 0);
              i += charsPerLine
            ) {
              const chunk = word.substring(i, i + charsPerLine);
              processedLines.push(chunk);
              linesAdded++;
            }
          } else {
            currentLine = word;
          }
        } else {
          // Word fits, add it to current line
          currentLine += word;
        }
      });

      // Don't forget the last line if we haven't reached max lines
      if (
        currentLine.length > 0 &&
        (linesAdded < params.maxLines || params.maxLines <= 0)
      ) {
        processedLines.push(currentLine);
        linesAdded++;
      }
    });

    return processedLines;
  };

  // Process encrypted and display text
  const processedEncrypted = processTextWithLineBreaks(encrypted);
  const processedDisplay = processTextWithLineBreaks(display);

  // Create grids from processed text
  const createCharacterGrid = (lines) => {
    return lines.map((line) => Array.from(line));
  };

  const encryptedGrid = createCharacterGrid(processedEncrypted);
  const displayGrid = createCharacterGrid(processedDisplay);

  // Get orientation and device parameters for rendering
  const orientation = isLandscape ? "landscape" : "portrait";
  const device = useMobileMode ? "mobile" : "desktop";
  const params = TUNING[orientation][device];

  // Detect tiny screens and adjust font ratio if needed
  const isTinyScreen = window.innerWidth <= 380 && window.innerHeight <= 670;
  const isExtremelyTinyScreen =
    window.innerWidth <= 330 && window.innerHeight <= 600;

  // Adjust font ratio for tiny screens to maintain readability
  let effectiveFontRatio;

  if (isExtremelyTinyScreen) {
    // More aggressive font scaling for extremely tiny screens
    effectiveFontRatio =
      params.fontRatio *
      Math.max(0.8, Math.min(0.9, (window.innerWidth / 330) * 0.85));
  } else if (isTinyScreen) {
    // Normal tiny screen font scaling
    effectiveFontRatio =
      params.fontRatio * Math.max(0.9, Math.min(1.0, window.innerWidth / 380));
  } else {
    // Default font ratio for normal screens
    effectiveFontRatio = params.fontRatio;
  }

  return (
    <div
      ref={containerRef}
      className={`text-container ${hardcoreMode ? "hardcore-mode" : ""} 
        ${isTinyScreen ? "tiny-screen" : ""} 
        ${isExtremelyTinyScreen ? "extremely-tiny-screen" : ""}`}
    >
      {/* Inject tiny screen styles */}
      <style>{tinyScreenStyles}</style>

      {/* {hardcoreMode && (
        <div className="badge-indicator hardcore-badge">HARDCORE</div>
      )} */}

      {/* Debug info - comment out when not needed */}
      {/* <div
        style={{
          position: "absolute",
          bottom: 0,
          right: 0,
          background: "rgba(0,0,0,0.7)",
          color: "white",
          padding: "5px",
          fontSize: "10px",
          zIndex: 100,
        }}
      >
        {JSON.stringify(debugInfo, null, 2)}
      </div> */}

      <div className="grid-text-display">
        {encryptedGrid.map((line, lineIndex) => (
          <div key={`block-${lineIndex}`} className="text-line-block">
            {/* Encrypted line */}
            <div className="char-line encrypted-line">
              {line.map((char, charIndex) => (
                <div
                  key={`enc-${lineIndex}-${charIndex}`}
                  className="char-cell"
                  style={{
                    width: `${cellWidth}px`,
                    height: `${cellHeight}px`,
                    fontSize: `${Math.max(cellHeight * effectiveFontRatio, 9)}px`,
                    padding: 0,
                    margin: 0,
                    display: "inline-block",
                    lineHeight: isTinyScreen ? "1" : "inherit", // Tighter line height for tiny screens
                  }}
                >
                  {char}
                </div>
              ))}
            </div>

            {/* Display line */}
            {displayGrid[lineIndex] && (
              <div className="char-line display-line">
                {displayGrid[lineIndex].map((char, charIndex) => (
                  <div
                    key={`disp-${lineIndex}-${charIndex}`}
                    className="char-cell"
                    style={{
                      width: `${cellWidth}px`,
                      height: `${cellHeight}px`,
                      fontSize: `${Math.max(cellHeight * effectiveFontRatio, 9)}px`,
                      padding: 0,
                      margin: 0,
                      display: "inline-block",
                      lineHeight: isTinyScreen ? "1" : "inherit", // Tighter line height for tiny screens
                    }}
                  >
                    {char}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TuneableTextDisplay;
