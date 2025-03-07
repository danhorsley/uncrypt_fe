// Configuration for the app
const config = {
  apiUrl:
    process.env.REACT_APP_BACKEND_URL ||
    process.env.REACT_APP_API_URL ||
    "https://uncryptbe.replit.app",
  // Log API URL for debugging
  init: (() => {
    console.log(
      "🌐 API URL configured as:",
      process.env.REACT_APP_BACKEND_URL ||
        process.env.REACT_APP_API_URL ||
        "https://uncryptbe.replit.app",
    );
    return true;
  })(),

  // User session management
  session: {
    getHeaders: () => {
      const userId = localStorage.getItem("uncrypt-user-id");
      const token = localStorage.getItem("uncrypt-token");
      const gameId = localStorage.getItem("uncrypt-game-id");

      // Add authorization header if token exists
      const headers = {
        ...(gameId ? { "X-Game-ID": gameId } : {}),
        Origin: "https://uncryptbe.replit.app", // Match backend origin
        Accept: "application/json",
        "Content-Type": "application/json",
      };

      // Important: Add Authorization header for token-based authentication
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      // Also include user ID if available (as backup authentication method)
      if (userId) {
        headers["X-User-ID"] = userId;
      }

      return headers;
    },

    saveSession: (headers) => {
      if (headers.get("x-user-id")) {
        localStorage.setItem("uncrypt-user-id", headers.get("x-user-id"));
      }

      if (headers.get("authorization")) {
        const token = headers.get("authorization").replace("Bearer ", "");
        localStorage.setItem("uncrypt-token", token);
      }
    },

    clearSession: () => {
      localStorage.removeItem("uncrypt-user-id");
      localStorage.removeItem("uncrypt-token");
    },
  },

  // Debug flag to control logging
  DEBUG: true,

  // // Session management
  // session: {
  //   // Function to get any custom headers needed for requests
  //   getHeaders: () => {
  //     // Get session ID from localStorage if it exists
  //     const sessionId = localStorage.getItem("uncrypt-session-id");
  //     const gameId = localStorage.getItem("uncrypt-game-id");

  //     // Return headers object with session ID if available
  //     return {
  //       ...(sessionId ? { "X-Session-ID": sessionId } : {}),
  //       ...(gameId ? { "X-Game-ID": gameId } : {}),
  //       Origin: "https://uncryptbe.replit.app", // Match backend origin
  //       Accept: "application/json",
  //       "Content-Type": "application/json",
  //     };
  //   },

  //   // Function to save session ID from response headers
  //   saveSession: (headers) => {
  //     // Check if the response includes a session ID header
  //     const sessionId = headers.get("X-Session-ID");
  //     if (sessionId) {
  //       localStorage.setItem("uncrypt-session-id", sessionId);
  //       if (config.DEBUG) console.log("Saved session ID:", sessionId);
  //     }
  //   },
  // },

  // Deployment health check - simple function that will return true for root path
  healthCheck: async () => {
    try {
      const response = await fetch(`${config.apiUrl}/health`, {
        method: "GET",
        headers: config.session.getHeaders(),
        credentials: "include",
        mode: "cors",
      });
      return response.ok;
    } catch (error) {
      console.error("Health check failed:", error);
      return false;
    }
  },
};

export default config;
