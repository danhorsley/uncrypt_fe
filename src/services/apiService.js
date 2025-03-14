// src/services/apiService.js - Updated startGame method
import axios from "axios";
import EventEmitter from "events";
import config from "../config";

let isRefreshing = false;
let refreshFailureTime = 0;

class ApiService {
  constructor() {
    this.api = axios.create({
      baseURL: process.env.REACT_APP_API_URL,
      timeout: 10000,
      withCredentials: true,
    });

    // Add request interceptor to consistently add auth token to all requests
    this.api.interceptors.request.use(
      (config) => {
        const token =
          localStorage.getItem("uncrypt-token") ||
          sessionStorage.getItem("uncrypt-token");
        if (token) {
          console.log(`Adding auth token to ${config.url}`);
          config.headers.Authorization = `Bearer ${token}`;
        } else {
          console.warn(`No token available for request to ${config.url}`);
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      },
    );

    // Create event emitter for auth events
    this.events = new EventEmitter();

    // Add interceptor for token refresh
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          try {
            await this.refreshToken();
            return this.api(originalRequest);
          } catch (refreshError) {
            // Token refresh failed, user needs to login again
            this.events.emit("auth:logout");
            return Promise.reject(refreshError);
          }
        }
        return Promise.reject(error);
      },
    );
  }

  // Auth methods
  async login(credentials) {
    try {
      const response = await this.api.post("/login", credentials);
      if (response.data.access_token) {
        localStorage.setItem("uncrypt-token", response.data.access_token);

        // Ensure we save the refresh token if provided
        if (response.data.refresh_token) {
          localStorage.setItem("refresh_token", response.data.refresh_token);
          console.log("Refresh token saved successfully");
        } else {
          console.warn("No refresh token received from login endpoint");
        }

        // Include hasActiveGame in the event data
        this.events.emit("auth:login", {
          ...response.data,
          hasActiveGame: response.data.has_active_game || false,
        });
      }
      return response.data;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  }

  async logout() {
    try {
      await this.api.post("/logout");
      localStorage.removeItem("uncrypt-token");
      localStorage.removeItem("refresh_token");
      this.events.emit("auth:logout");
      return { success: true };
    } catch (error) {
      console.error("Logout error:", error);
      // Still clear token on frontend
      localStorage.removeItem("uncrypt-token");
      localStorage.removeItem("refresh_token");
      this.events.emit("auth:logout");
      return { success: false, error };
    }
  }

  async refreshToken() {
    // Prevent concurrent refresh attempts
    if (isRefreshing) {
      console.log("Token refresh already in progress, skipping");
      return Promise.reject(new Error("Refresh already in progress"));
    }

    // Check if we actually have a refresh token before attempting
    const refreshToken = localStorage.getItem("refresh_token");
    if (!refreshToken) {
      console.warn("No refresh token available - cannot refresh");

      // If we also don't have an access token, we should consider the user logged out

      if (
        !localStorage.getItem("uncrypt-token") ||
        sessionStorage.getItem("uncrypt-token")
      ) {
        console.log("No access token either, emitting auth:logout event");
        this.events.emit("auth:logout");
      } else {
        // Otherwise, we should prompt for login to get a new refresh token
        console.log(
          "Access token exists but no refresh token, emitting auth:required event",
        );
        this.events.emit("auth:required");
      }

      return Promise.reject(new Error("No refresh token available"));
    }

    try {
      console.log("Attempting to refresh token...");
      isRefreshing = true;

      const response = await this.api.post(
        "/refresh",
        {},
        {
          headers: {
            Authorization: `Bearer ${refreshToken}`,
          },
        },
      );

      if (response.data.access_token) {
        console.log("Successfully refreshed access token");
        localStorage.setItem("uncrypt-token", response.data.access_token);
        isRefreshing = false;
        return response.data;
      } else {
        throw new Error("Invalid response from refresh endpoint");
      }
    } catch (error) {
      console.error("Token refresh failed:", error.message);

      // Record the failure time to implement cooldown
      refreshFailureTime = Date.now();
      isRefreshing = false;

      // Force logout if the refresh endpoint returned 401
      if (error.response && error.response.status === 401) {
        console.warn("Refresh token is invalid or expired - logging out");
        // Clear tokens
        localStorage.removeItem("uncrypt-token");
        localStorage.removeItem("refresh_token");
        this.events.emit("auth:logout");
      }

      throw error;
    }
  }

  // Game methods
  async startGame(options = {}) {
    try {
      console.log(
        "Starting startGame function in apiService with options:",
        options,
      );

      // Get token and verify it exists
      const token =
        localStorage.getItem("uncrypt-token") ||
        sessionStorage.getItem("uncrypt-token");
      console.log("Token from localStorage:", token ? "exists" : "missing");

      // Determine endpoint based on longText option
      const endpoint = options.longText ? "api/longstart" : "/api/start";

      // Build query parameters, including difficulty if provided
      const queryParams = new URLSearchParams();
      if (options.difficulty) {
        queryParams.append("difficulty", options.difficulty);
        console.log(`Adding difficulty=${options.difficulty} parameter`);
      }

      // Create full URL with query parameters
      const url = `${endpoint}${queryParams.toString() ? "?" + queryParams.toString() : ""}`;

      console.log(
        `Making request to endpoint: ${this.api.defaults.baseURL}${url}`,
      );

      // Log request configuration
      const config = {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      };

      if (token) {
        config.headers["Authorization"] = `Bearer ${token}`;
      }

      console.log("Request config:", JSON.stringify(config));

      // Make the request
      const response = await this.api.get(url, config);

      // Log response for debugging
      console.log("Response received:", {
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers["content-type"],
        responseType: typeof response.data,
      });

      return response.data;
    } catch (error) {
      console.error("Error in startGame:", error);
      if (error.response) {
        console.error("Response details:", {
          status: error.response.status,
          statusText: error.response.statusText,
          contentType: error.response.headers["content-type"],
          data: error.response.data,
        });
      }
      throw error;
    }
  }

  async submitGuess(encryptedLetter, guessedLetter) {
    try {
      const gameId = localStorage.getItem("uncrypt-game-id");
      console.log(`Submitting guess: ${encryptedLetter} → ${guessedLetter}`);

      // Simple token debugging inline
      console.group("Token Debug for submitGuess");
      console.log(
        "Access Token:",
        localStorage.getItem("uncrypt-token") ||
          sessionStorage.getItem("uncrypt-token")
          ? "Present"
          : "Missing",
      );
      console.log("Game ID:", gameId ? "Present" : "Missing");
      console.groupEnd();

      // Make a direct fetch request to bypass axios interceptors
      const baseUrl =
        this.api.defaults.baseURL || process.env.REACT_APP_API_URL || "";
      const url = `${baseUrl}/api/guess`;
      const token =
        localStorage.getItem("uncrypt-token") ||
        sessionStorage.getItem("uncrypt-token");

      console.log(`Making fetch request to ${url} with data:`, {
        encrypted_letter: encryptedLetter,
        guessed_letter: guessedLetter,
        game_id: gameId,
      });

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({
          encrypted_letter: encryptedLetter,
          guessed_letter: guessedLetter,
          game_id: gameId,
        }),
        credentials: "include",
      });

      console.log("Fetch response status:", response.status);

      if (!response.ok) {
        // Handle non-200 responses
        if (response.status === 401) {
          console.warn("Authentication required for guess");
          this.events.emit("auth:required");
          return { error: "Authentication required", authRequired: true };
        }
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Guess response:", data);
      return data;
    } catch (error) {
      console.error("Error submitting guess:", error);
      return { error: error.message };
    }
  }

  async getHint() {
    try {
      const gameId = localStorage.getItem("uncrypt-game-id");
      console.log(`Sending hint request with game_id: ${gameId}`);

      // Simple token debugging
      console.group("Token Debug");
      console.log(
        "Access Token:",
        localStorage.getItem("uncrypt-token") ||
          sessionStorage.getItem("uncrypt-token")
          ? "Present"
          : "Missing",
      );
      console.log("Game ID:", gameId ? "Present" : "Missing");
      console.groupEnd();

      // Make a direct fetch request to bypass axios interceptors
      const baseUrl =
        this.api.defaults.baseURL || process.env.REACT_APP_API_URL || "";
      const url = `${baseUrl}/api/hint`;
      const token =
        localStorage.getItem("uncrypt-token") ||
        sessionStorage.getItem("uncrypt-token");

      console.log(`Making fetch request to ${url}`);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ game_id: gameId }),
        credentials: "include",
      });

      console.log("Fetch response status:", response.status);

      if (!response.ok) {
        // Handle non-200 responses
        if (response.status === 401) {
          console.warn("Authentication required for hint");
          this.events.emit("auth:required");
          return { error: "Authentication required", authRequired: true };
        }
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Hint response:", data);
      return data;
    } catch (error) {
      console.error("Error getting hint:", error);
      return { error: error.message };
    }
  }
  async checkActiveGame() {
    try {
      console.log("Making API call to check for active games");
      // Fix the path here too if needed
      const response = await this.api.get("/api/check-active-game");
      console.log("Active game check response:", response.data);
      return response.data;
    } catch (error) {
      console.error("Error checking for active games:", error);
      return { has_active_game: false };
    }
  }
  async getGameStatus() {
    try {
      console.log("Fetching game status");

      // Get token and game ID
      const token =
        localStorage.getItem("uncrypt-token") ||
        sessionStorage.getItem("uncrypt-token");
      const gameId = localStorage.getItem("uncrypt-game-id");

      // Simple token debugging
      console.group("Token Debug for getGameStatus");
      console.log("Access Token:", token ? "Present" : "Missing");
      console.log("Game ID:", gameId ? "Present" : "Missing");
      console.groupEnd();

      // Make a direct fetch request
      const baseUrl =
        this.api.defaults.baseURL || process.env.REACT_APP_API_URL || "";
      const url = `${baseUrl}/api/game-status`;

      console.log(`Making fetch request to ${url}`);

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        credentials: "include",
      });

      console.log("Fetch response status:", response.status);

      if (!response.ok) {
        // Handle non-200 responses
        if (response.status === 401) {
          console.warn("Authentication required for game status");
          this.events.emit("auth:required");
          return { error: "Authentication required", authRequired: true };
        }
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Game status response:", data);
      return data;
    } catch (error) {
      console.error("Error getting game status:", error);
      return { error: error.message };
    }
  }

  // Subscribe to events
  on(event, listener) {
    this.events.on(event, listener);
    return () => this.events.off(event, listener);
  }
}

export default new ApiService();
