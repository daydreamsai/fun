const express = require("express");
const httpProxy = require("http-proxy");
const cors = require("cors");
const app = express();

// --- Configuration ---
// Define your proxy routes here.
// Each object maps a static path prefix to a target origin.
// Requests matching 'pathPrefix/*' will be forwarded to 'target/*'.
// The 'pathPrefix' itself will be removed before forwarding.
// The order of configurations matters if paths overlap! Place more specific paths first.
const proxyConfigs = [
  {
    pathPrefix: "/gigaverse",
    target: "https://gigaverse.io/api", // The origin where your API server is running
  },
];

const proxyPort = 8000; // The port the Express proxy server will listen on

// --- Proxy Implementation ---

// Configure CORS to allow all origins
app.use(
  cors({
    origin: "*", // Allow all origins
    credentials: true, // Allow credentials (cookies, authorization headers, etc.)
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"], // Allow all common HTTP methods
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"], // Allow common headers
    preflightContinue: false,
    optionsSuccessStatus: 204,
  })
);

// --- Custom API Endpoints ---

// Price endpoint to fetch token prices from Alchemy
app.get("/price", async (req, res) => {
  try {
    // Get API key from environment variable
    const apiKey = process.env.ALCHEMY_API_KEY;
    if (!apiKey) {
      return res.status(400).json({
        error: "ALCHEMY_API_KEY environment variable is not set",
      });
    }

    // Get symbols from query parameters, default to ETH, BTC, USDT
    const symbols = req.query.symbols
      ? Array.isArray(req.query.symbols)
        ? req.query.symbols
        : [req.query.symbols]
      : ["ETH"];

    const fetchURL = `https://api.g.alchemy.com/prices/v1/${apiKey}/tokens/by-symbol`;

    const params = new URLSearchParams();
    symbols.forEach((symbol) => params.append("symbols", symbol));

    const urlWithParams = `${fetchURL}?${params.toString()}`;

    // Create an AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    try {
      const response = await fetch(urlWithParams, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      res.json(data);
    } catch (fetchError) {
      clearTimeout(timeoutId);

      if (fetchError.name === "AbortError") {
        console.error("Alchemy API request timed out");
        return res.status(504).json({
          error: "Request timeout",
          details: "The request to Alchemy API timed out after 5 seconds",
        });
      }
      throw fetchError; // Re-throw to be caught by outer catch block
    }
  } catch (error) {
    console.error("Error fetching prices:", error);

    // Ensure we always send a response
    if (!res.headersSent) {
      res.status(500).json({
        error: "Failed to fetch token prices",
        details: error.message,
      });
    }
  }
});

// Create a proxy server instance
const proxy = httpProxy.createProxyServer({});

// Listen for the 'error' event on the proxy server.
// This happens if the target backend is unreachable or sends an invalid response.
proxy.on("error", (err, req, res) => {
  console.error("Proxy Error:", err.stack || err);

  // Send a generic 500 Internal Server Error response to the client
  // Check if headers have already been sent to prevent errors
  if (!res.headersSent) {
    res.status(500).send("Internal Server Error: Could not proxy request.");
  }
});

// Add CORS headers to proxied responses
proxy.on("proxyRes", (proxyRes, req, res) => {
  // Add CORS headers to all responses
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, PATCH, OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With"
  );
  res.setHeader("Access-Control-Allow-Credentials", "true");
});

// Handle OPTIONS preflight requests for all routes
app.options("*", (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, PATCH, OPTIONS"
  );
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With"
  );
  res.header("Access-Control-Allow-Credentials", "true");
  res.sendStatus(204);
});

// Set up proxy middleware for each configuration
proxyConfigs.forEach((config) => {
  // Use app.use to match the path prefix for any HTTP method
  app.use(config.pathPrefix, (req, res) => {
    // Log the original request URL
    const originalUrl = req.originalUrl || req.url; // req.originalUrl is safer within app.use

    // --- Path Stripping Logic ---
    // We need to remove the 'config.pathPrefix' from the start of the URL
    // and get the remainder.
    // Example: If originalUrl is '/api/users/123' and pathPrefix is '/api'
    // We want the new URL to be '/users/123'
    // If originalUrl is '/api' and pathPrefix is '/api'
    // We want the new URL to be '/'
    let newUrl = originalUrl.substring(config.pathPrefix.length);

    // If the original URL was just the path prefix (e.g., '/api'),
    // the substring result is an empty string. We should proxy '/' in this case.
    if (newUrl === "") {
      newUrl = "/";
    }
    // Ensure the new URL starts with a slash, just in case.
    if (newUrl[0] !== "/") {
      newUrl = "/" + newUrl;
    }

    // Log the target and the new URL being forwarded
    console.log(
      `[${new Date().toISOString()}] Proxying ${req.method} ${originalUrl} to ${
        config.target
      }${newUrl}`
    );

    // --- Perform the Proxying ---
    // IMPORTANT: Modify the req.url object that http-proxy will use.
    req.url = newUrl;

    // Proxy the request to the target
    proxy.web(req, res, {
      target: config.target,
      secure: false, // Skip certificate verification for development
      changeOrigin: true, // Needed for virtual hosted sites
      withCredentials: true,
    });
  });
});

// If none of the app.use routes above matched, Express will fall through here
// and send a default 404 response. You can customize this if needed.
/*
app.use((req, res) => {
    console.log(`[${new Date().toISOString()}] No proxy match for ${req.method} ${req.originalUrl}. Returning 404.`);
    res.status(404).send('Not Found');
});
*/

// --- Start the Express Server ---
app.listen(proxyPort, () => {
  console.log(`Express proxy server listening on port ${proxyPort}`);
  console.log("Configured routes (with path stripping):");
  proxyConfigs.forEach((config) => {
    console.log(
      `  ${config.pathPrefix}/* -> ${config.target}/* (Stripping ${config.pathPrefix})`
    );
  });
  console.log("-----------------------------------------------");
  console.log("Make sure your backend servers are running!");
  console.log("-----------------------------------------------");
});

// Optional: Add error handling for the main server itself (e.g., port already in use)
app.on("error", (err) => {
  console.error("Express proxy server failed to start:", err.stack || err);
});
