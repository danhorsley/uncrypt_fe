// src/services/apiService.js
import axios from "axios";
import EventEmitter from "events";

class ApiService {
  constructor() {
    this.api = axios.create({
      baseURL: process.env.REACT_APP_API_URL,
      timeout: 10000,
      withCredentials: true,
    });

    this.events = new EventEmitter();
    this.sseConnection = null;

    // Add interceptor for token refresh
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        if (error.response.status === 401 && !originalRequest._retry) {
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
    console.log("api login attempt with credentials : ", credentials);
    try {
      const response = await this.api.post("/login", credentials);
      if (response.data.access_token) {
        localStorage.setItem("token", response.data.access_token);
        this.setupSSE(); // Start SSE connection after login
        this.events.emit("auth:login", response.data);
      }
      console.log("back end log iin respose data", response.data);
      return response.data;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  }

  async logout() {
    try {
      await this.api.post("/logout");
      localStorage.removeItem("token");
      this.closeSSE();
      this.events.emit("auth:logout");
      return { success: true };
    } catch (error) {
      console.error("Logout error:", error);
      // Still clear token on frontend
      localStorage.removeItem("token");
      this.events.emit("auth:logout");
      return { success: false, error };
    }
  }

  async refreshToken() {
    const response = await this.api.post("/refresh");
    if (response.data.access_token) {
      localStorage.setItem("token", response.data.access_token);
      return response.data;
    }
    throw new Error("Token refresh failed");
  }

  // Game methods - must add longstart to back end
  async startGame(options = {}) {
    try {
      console.log("Starting startGame function in apiService");

      // Get token and verify it exists
      const token = localStorage.getItem("token");
      console.log("Token from localStorage:", token ? "exists" : "missing");

      const endpoint = options.longText ? "api/longstart" : "/api/start";
      console.log("endpoint", endpoint);
      console.log(
        `Making request to endpoint: ${this.api.defaults.baseURL}${endpoint}`,
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
      const response = await this.api.get(endpoint, config);

      // Log response for debugging
      console.log("Response received:", {
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers["content-type"],
        responseType: typeof response.data,
        content: response.data,
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
    const gameId = localStorage.getItem("uncrypt-game-id");
    return this.api
      .post("/api/guess", {
        encrypted_letter: encryptedLetter,
        guessed_letter: guessedLetter,
        game_id: gameId,
      })
      .then((res) => res.data);
  }

  async getHint() {
    const gameId = localStorage.getItem("uncrypt-game-id");
    return this.api
      .post("/api/hint", { game_id: gameId })
      .then((res) => res.data);
  }

  // Server-sent events for win notifications
  setupSSE() {
    if (this.sseConnection) this.closeSSE();

    const token = localStorage.getItem("token");
    if (!token) return;

    this.sseConnection = new EventSource(
      `${process.env.REACT_APP_API_URL}/events?token=${token}`,
    );

    this.sseConnection.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.events.emit("sse:message", data);

        // Handle specific event types
        if (data.type === "win") {
          this.events.emit("game:win", data);
        } else if (data.type === "game_state") {
          this.events.emit("game:state", data);
        }
      } catch (error) {
        console.error("Error processing SSE message:", error);
      }
    };

    this.sseConnection.onerror = (error) => {
      console.error("SSE connection error:", error);
      this.closeSSE();

      // Try to reconnect after 5s
      setTimeout(() => this.setupSSE(), 5000);
    };
  }

  closeSSE() {
    if (this.sseConnection) {
      this.sseConnection.close();
      this.sseConnection = null;
    }
  }

  // Subscribe to events
  on(event, listener) {
    this.events.on(event, listener);
    return () => this.events.off(event, listener);
  }
}

export default new ApiService();
