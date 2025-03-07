import config from "../config";

// Debug logging function
const logApiOperation = (
  method,
  endpoint,
  requestData = null,
  response = null,
  error = null,
) => {
  if (config.DEBUG) {
    const timestamp = new Date().toISOString();
    console.group(`🌐 API ${method} - ${endpoint} (${timestamp})`);
    console.log(`URL: ${config.apiUrl}${endpoint}`);

    // Log origin info for debugging cross-origin issues
    console.log("Current Origin:", window.location.origin);
    console.log("API Target Origin:", new URL(config.apiUrl).origin);

    if (requestData) {
      console.log("Request Data:", requestData);
    }

    if (response) {
      console.log("Response Status:", response.status);
      console.log("Response OK:", response.ok);
      if (response.headers) {
        console.log("Response Headers:", {
          "content-type": response.headers.get("content-type"),
          "x-session-id": response.headers.get("x-session-id"),
          "x-game-id": response.headers.get("x-game-id"),
        });
      }
    }

    if (error) {
      console.error("Error:", error);
      if (
        (error.message && error.message.includes("postMessage")) ||
        error.name === "SecurityError"
      ) {
        console.error("Cross-Origin Error Details:", {
          message: error.message,
          name: error.name,
          stack: error.stack,
        });
      }
    }

    console.groupEnd();
  }
};

const apiService = {
  // Login functionality
  // In apiService.js

  loginapi: async (credentials) => {
    console.log("credentials : ", credentials);
    try {
      const response = await fetch(`${config.apiUrl}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (response.ok) {
        // Store token and user info in localStorage
        if (data.token) {
          localStorage.setItem("auth_token", data.token);
        }
        localStorage.setItem("user_id", data.user_id);
        localStorage.setItem("username", data.username);
        console.log("token : ", data.token);
        return {
          success: true,
          user: {
            id: data.user_id,
            username: data.username,
          },
          token: data.token,
        };
      } else {
        throw new Error(data.error || "Login failed");
      }
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  },

  // Signup functionality
  signup: async (email, password) => {
    const endpoint = "/signup";

    try {
      const requestBody = {
        email,
        password,
      };

      const headers = {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...config.session.getHeaders(),
      };

      logApiOperation("POST", endpoint, { email: email });

      const response = await fetch(`${config.apiUrl}${endpoint}`, {
        method: "POST",
        credentials: "include",
        mode: "cors",
        headers: headers,
        body: JSON.stringify(requestBody),
      });

      logApiOperation("POST", endpoint, { email: email }, response);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `HTTP error! Status: ${response.status}, Response:`,
          errorText,
        );
        throw new Error(`Signup failed with status: ${response.status}`);
      }

      // Save session if applicable
      config.session.saveSession(response.headers);

      const data = await response.json();
      return data;
    } catch (error) {
      logApiOperation("POST", endpoint, { email: email }, null, error);
      console.error("Error during signup:", error);
      throw error;
    }
  },

  // Function to check API health status
  checkHealth: async () => {
    const endpoint = "/health";
    try {
      logApiOperation("GET", endpoint);

      const response = await fetch(`${config.apiUrl}${endpoint}`, {
        method: "GET",
        headers: {
          ...config.session.getHeaders(),
        },
        credentials: "include",
        mode: "cors",
      });

      logApiOperation("GET", endpoint, null, response);
      return response.ok;
    } catch (error) {
      logApiOperation("GET", endpoint, null, null, error);
      console.error("Health check failed:", error);
      return false;
    }
  },

  // Other API methods can be added here
  startGame: async (useLongQuotes = false) => {
    const endpoint = useLongQuotes ? "/longstart" : "/start";

    try {
      const headers = {
        ...config.session.getHeaders(),
      };

      logApiOperation("GET", endpoint, { headers });

      const response = await fetch(`${config.apiUrl}${endpoint}`, {
        method: "GET",
        credentials: "include",
        mode: "cors",
        headers: headers,
      });

      logApiOperation("GET", endpoint, { headers }, response);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `HTTP error! Status: ${response.status}, Response:`,
          errorText,
        );
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      // Save session if applicable
      config.session.saveSession(response.headers);

      const data = await response.json();
      return data;
    } catch (error) {
      logApiOperation("GET", endpoint, null, null, error);
      console.error("Error starting game:", error);
      throw error;
    }
  },

  submitGuess: async (gameId, encryptedLetter, guessedLetter) => {
    const endpoint = "/guess";

    try {
      const requestBody = {
        encrypted_letter: encryptedLetter,
        guessed_letter: guessedLetter.toUpperCase(),
      };

      if (gameId) {
        requestBody.game_id = gameId;
      }

      const headers = {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...config.session.getHeaders(),
      };

      logApiOperation("POST", endpoint, { requestBody, headers });

      const response = await fetch(`${config.apiUrl}${endpoint}`, {
        method: "POST",
        credentials: "include",
        mode: "cors",
        headers: headers,
        body: JSON.stringify(requestBody),
      });

      logApiOperation("POST", endpoint, { requestBody }, response);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `HTTP error! Status: ${response.status}, Response:`,
          errorText,
        );
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      // Save session if applicable
      config.session.saveSession(response.headers);

      const data = await response.json();
      return data;
    } catch (error) {
      logApiOperation(
        "POST",
        endpoint,
        { encryptedLetter, guessedLetter, gameId },
        null,
        error,
      );
      console.error("Error submitting guess:", error);
      throw error;
    }
  },
  getHint: async () => {
    const endpoint = "/hint";

    try {
      const headers = {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...config.session.getHeaders(),
      };

      logApiOperation("POST", endpoint, { headers });

      const response = await fetch(`${config.apiUrl}${endpoint}`, {
        method: "POST",
        credentials: "include",
        mode: "cors",
        headers: headers,
        body: JSON.stringify({}),
      });

      logApiOperation("POST", endpoint, {}, response);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `HTTP error! Status: ${response.status}, Response:`,
          errorText,
        );
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      // Save session if applicable
      config.session.saveSession(response.headers);

      const data = await response.json();
      return data;
    } catch (error) {
      logApiOperation("POST", endpoint, {}, null, error);
      console.error("Error getting hint:", error);
      throw error;
    }
  },
  getAttribution: async () => {
    // Get game ID from localStorage
    const gameId = localStorage.getItem("uncrypt-game-id");

    // Construct URL with game_id as a query parameter if available
    const endpoint = gameId
      ? `/get_attribution?game_id=${encodeURIComponent(gameId)}`
      : "/get_attribution";

    try {
      const headers = {
        Accept: "application/json",
        ...config.session.getHeaders(),
      };

      logApiOperation("GET", endpoint, { headers });

      const response = await fetch(`${config.apiUrl}${endpoint}`, {
        method: "GET",
        credentials: "include",
        mode: "cors",
        headers: headers,
      });

      logApiOperation("GET", endpoint, { gameId }, response);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `HTTP error! Status: ${response.status}, Response:`,
          errorText,
        );
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      // Save session if applicable
      config.session.saveSession(response.headers);

      const data = await response.json();
      return data;
    } catch (error) {
      logApiOperation("GET", endpoint, { gameId }, null, error);
      console.error("Error fetching attribution:", error);
      // Return a default value on error to avoid breaking the UI
      return {
        major_attribution: "",
        minor_attribution: "",
      };
    }
  },
  saveQuote: async () => {
    const endpoint = "/save_quote";

    try {
      const headers = {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...config.session.getHeaders(),
      };

      logApiOperation("POST", endpoint, { headers });

      const response = await fetch(`${config.apiUrl}${endpoint}`, {
        method: "POST",
        credentials: "include",
        mode: "cors",
        headers: headers,
        body: JSON.stringify({}),
      });

      logApiOperation("POST", endpoint, {}, response);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `HTTP error! Status: ${response.status}, Response:`,
          errorText,
        );
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      // Save session if applicable
      config.session.saveSession(response.headers);

      const data = await response.json();
      return data;
    } catch (error) {
      logApiOperation("POST", endpoint, {}, null, error);
      console.error("Error saving quote:", error);
      throw error;
    }
  },
  // Add to src/services/apiService.js
  recordScore: async (gameData) => {
    const endpoint = "/record_score";

    try {
      const gameId = localStorage.getItem("uncrypt-game-id");
      const token = localStorage.getItem("auth_token");
      const userId = localStorage.getItem("user_id");

      const requestBody = {
        game_id: gameId,
        score: gameData.score,
        mistakes: gameData.mistakes,
        time_taken: gameData.timeTaken,
        difficulty: gameData.difficulty,
        user_id: userId, // Include user_id as fallback
      };

      console.log("Request body for score recording:", requestBody);

      const headers = {
        "Content-Type": "application/json",
        Accept: "application/json",
      };

      // Add token to Authorization header if available
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(`${config.apiUrl}${endpoint}`, {
        method: "POST",
        credentials: "include", // Still include cookies for backward compatibility
        headers: headers,
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to record score");
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error recording score:", error);
      throw error;
    }
  },
};

export default apiService;
