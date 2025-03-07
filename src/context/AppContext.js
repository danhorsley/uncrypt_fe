import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useCallback,
} from "react";
import useDeviceDetection from "../hooks/useDeviceDetection";
import config from "../config";
import apiService from "../services/apiService";

// Create context
const AppContext = createContext();

// Default settings
const defaultSettings = {
  theme: "light",
  difficulty: "easy",
  longText: false,
  speedMode: true, // Always on - cannot be changed
  gridSorting: "default",
  hardcoreMode: false,
  mobileMode: "auto",
  textColor: "default",
};

// Default user state
const defaultUserState = {
  user: null,
  isAuthenticated: false,
  authLoading: true,
  token: localStorage.getItem("auth_token") || null, // Add this line
  authError: null,
};

// Get max mistakes based on difficulty
export const getMaxMistakes = (difficulty) => {
  switch (difficulty) {
    case "easy":
      return 8;
    case "hard":
      return 3;
    case "normal":
    default:
      return 5;
  }
};

// Provider component
export const AppProvider = ({ children }) => {
  // ==== SETTINGS STATE ====
  // Initialize state from localStorage or defaults
  const [settings, setSettings] = useState(() => {
    try {
      const savedSettings = localStorage.getItem("uncrypt-settings");
      return savedSettings ? JSON.parse(savedSettings) : defaultSettings;
    } catch (error) {
      console.error("Error loading settings from localStorage:", error);
      return defaultSettings;
    }
  });

  // ==== AUTH STATE ====
  const [authState, setAuthState] = useState(defaultUserState);

  // ==== UI STATE ====
  const [currentView, setCurrentView] = useState("game"); // 'game', 'settings', 'login', etc.
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isSignupOpen, setIsSignupOpen] = useState(false);
  // Add this effect to log any changes to authState
  useEffect(() => {
    console.log(
      "%c Auth State Changed:",
      "background: #4cc9f0; color: white; padding: 2px 6px; border-radius: 2px;",
      {
        authState,
        timestamp: new Date().toLocaleTimeString(),
      },
    );
  }, [authState]);
  // ==== DEVICE DETECTION ====
  const { isMobile, isLandscape, screenWidth, screenHeight, detectMobile } =
    useDeviceDetection();

  // Track whether we should use mobile mode
  const [useMobileMode, setUseMobileMode] = useState(false);

  // ==== AUTH METHODS ====
  // Initialize auth state from token if exists
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem("uncrypt-token");

      if (!token) {
        setAuthState({
          ...defaultUserState,
          authLoading: false,
        });
        return;
      }

      try {
        const response = await fetch(`${config.apiUrl}/validate-token`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          const userData = await response.json();
          setAuthState({
            user: userData,
            isAuthenticated: true,
            authLoading: false,
            authError: null,
          });
        } else {
          // Invalid token, clear it
          localStorage.removeItem("uncrypt-token");
          setAuthState({
            ...defaultUserState,
            authLoading: false,
          });
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
        setAuthState({
          ...defaultUserState,
          authLoading: false,
          authError: "Failed to validate authentication state",
        });
      }
    };

    initAuth();
  }, []);

  // Login method
  // In AppContext.js
  const login = useCallback(async (credentials) => {
    console.log(credentials.username, credentials.password);
    setAuthState((prev) => ({ ...prev, authLoading: true, authError: null }));

    try {
      // Use apiService instead of direct fetch
      const data = await apiService.loginapi(
        credentials,
        // credentials.username,
        // credentials.password,
      );

      // Save token if it exists in the response
      if (data.token) {
        localStorage.setItem("uncrypt-token", data.token);
      }

      // Update auth state
      setAuthState({
        user: data.user || { username: credentials.username },
        isAuthenticated: true,
        authLoading: false,
        authError: null,
      });
      console.log("auth state triggered");
      return { success: true };
    } catch (error) {
      console.error("Login error:", error);

      setAuthState((prev) => ({
        ...prev,
        authLoading: false,
        authError: error.message || "Login failed",
      }));

      return {
        success: false,
        error: error.message || "Login failed",
      };
    }
  }, []);

  // Register method
  const register = useCallback(async (userData) => {
    setAuthState((prev) => ({ ...prev, authLoading: true, authError: null }));

    try {
      const response = await fetch(`${config.apiUrl}/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Registration failed");
      }

      // Save token to localStorage if registration also logs in
      if (data.token) {
        localStorage.setItem("uncrypt-token", data.token);

        // Update auth state
        setAuthState({
          user: data.user,
          isAuthenticated: true,
          authLoading: false,
          authError: null,
        });
      } else {
        // If registration doesn't auto-login
        setAuthState((prev) => ({
          ...prev,
          authLoading: false,
          authError: null,
        }));
      }

      return { success: true };
    } catch (error) {
      console.error("Registration error:", error);

      setAuthState((prev) => ({
        ...prev,
        authLoading: false,
        authError: error.message || "Registration failed",
      }));

      return {
        success: false,
        error: error.message || "Registration failed",
      };
    }
  }, []);

  // Logout method
  const logout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user_id");
    localStorage.removeItem("username");

    // Call backend logout endpoint if needed
    fetch(`${config.apiUrl}/logout`, {
      method: "POST",
      credentials: "include",
    }).catch((err) => console.error("Logout error:", err));
  };

  // ==== SETTINGS METHODS ====
  // Update settings
  const updateSettings = useCallback((newSettings) => {
    // Always ensure textColor matches theme
    const updatedSettings = {
      ...newSettings,
      textColor: newSettings.theme === "dark" ? "scifi-blue" : "default",
      speedMode: true, // Always ensure speed mode is on
    };
    setSettings(updatedSettings);
  }, []);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("uncrypt-settings", JSON.stringify(settings));
  }, [settings]);

  // On component mount, check for existing token
  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    const userId = localStorage.getItem("user_id");
    const username = localStorage.getItem("username");

    if (token && userId) {
      // If token exists, set authenticated state
      setAuthState({
        user: { id: userId, username: username },
        isAuthenticated: true,
        token: token,
        loading: false,
      });
    } else {
      // No token found, mark as not authenticated
      setAuthState((prev) => ({ ...prev, loading: false }));
    }
  }, []);
  // ==== MOBILE MODE EFFECTS ====
  // Determine if we should use mobile mode based on settings and device
  useEffect(() => {
    if (settings.mobileMode === "always") {
      setUseMobileMode(true);
    } else if (settings.mobileMode === "never") {
      setUseMobileMode(false);
    } else {
      // Auto mode - use device detection
      setUseMobileMode(isMobile);
    }
  }, [settings.mobileMode, isMobile]);

  // Re-check device when window resizes
  useEffect(() => {
    const handleResize = () => {
      detectMobile();
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [detectMobile]);

  // ==== THEME EFFECTS ====
  // Apply theme whenever settings change
  useEffect(() => {
    try {
      // Use a forced timeout to ensure theme is applied on all browsers
      setTimeout(() => {
        if (settings.theme === "dark") {
          document.documentElement.classList.add("dark-theme");
          document.body.classList.add("dark-theme");
          document.documentElement.setAttribute("data-theme", "dark");

          // Force mobile browser compatibility
          if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
            document.documentElement.style.backgroundColor = "#222";
            document.body.style.backgroundColor = "#222";
            document.body.style.color = "#f8f9fa";
          }
        } else {
          document.documentElement.classList.remove("dark-theme");
          document.body.classList.remove("dark-theme");
          document.documentElement.setAttribute("data-theme", "light");

          // Force mobile browser compatibility
          if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
            document.documentElement.style.backgroundColor = "#ffffff";
            document.body.style.backgroundColor = "#ffffff";
            document.body.style.color = "#212529";
          }
        }
      }, 100);
    } catch (e) {
      console.error("Error applying theme:", e);
    }
  }, [settings.theme]);

  // ==== VIEW METHODS ====
  // Navigate to settings view
  const showSettings = useCallback(() => {
    setCurrentView("settings");
  }, []);

  // Navigate to game view
  const showGame = useCallback(() => {
    setCurrentView("game");
  }, []);

  const showLogin = useCallback(() => {
    setCurrentView("login");
  }, []);

  const showRegister = useCallback(() => {
    setCurrentView("register");
  }, []);

  const openAbout = useCallback(() => {
    setIsAboutOpen(true);
  }, []);

  const closeAbout = useCallback(() => {
    setIsAboutOpen(false);
  }, []);

  const openLogin = useCallback(() => {
    setIsLoginOpen(true);
  }, []);

  const closeLogin = useCallback(() => {
    setIsLoginOpen(false);
  }, []);

  const openSignup = useCallback(() => {
    setIsLoginOpen(false); // Close login when opening signup
    setIsSignupOpen(true);
    // Log for debugging
    console.log("Opening signup modal", {
      isLoginOpen: false,
      isSignupOpen: true,
    });
  }, []);

  const closeSignup = useCallback(() => {
    setIsSignupOpen(false);
  }, []);

  // ==== CONTEXT VALUE ====
  // Organize context value into logical sections
  const contextValue = {
    // Settings
    settings,
    updateSettings,
    maxMistakes: getMaxMistakes(settings.difficulty),

    // Auth
    ...authState, // Spread auth state (user, isAuthenticated, authLoading, authError)
    login,
    register,
    logout,

    // View state
    currentView,
    showSettings,
    showGame,
    showLogin,
    showRegister,
    isAboutOpen,
    openAbout,
    closeAbout,
    isLoginOpen,
    openLogin,
    closeLogin,
    isSignupOpen,
    openSignup,
    closeSignup,

    // Device/Mobile state
    isMobile,
    isLandscape,
    screenWidth,
    screenHeight,
    useMobileMode,
    // token,
  };

  return (
    <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>
  );
};

// Custom hook for using the context
export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
};

export default AppContext;
