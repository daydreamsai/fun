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

app.use(cors());

// Note: We're NOT using body parsing middleware for proxy routes
// as it can interfere with streaming the request body to the target.
// Body parsing middleware should only be used for non-proxy endpoints.

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

// Create a proxy server instance with enhanced settings
const proxy = httpProxy.createProxyServer({
  // Essential settings
  changeOrigin: true, // Changes the origin of the host header to the target URL
  secure: false, // Don't verify SSL certificates (for development)
  ws: true, // Enable WebSocket proxying

  // Timeouts
  timeout: 60000, // 60 seconds timeout
  proxyTimeout: 60000, // 60 seconds proxy timeout

  // Headers
  xfwd: true, // Adds X-Forwarded-* headers

  // Path handling
  ignorePath: false, // Don't ignore the path (we handle path stripping manually)

  // Response handling
  followRedirects: true, // Follow HTTP redirects

  // Cookie rewriting for development
  cookieDomainRewrite: {
    "*": "", // Remove domain from all cookies
  },
});

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

// Listen for the 'proxyReq' event to modify outgoing requests
proxy.on("proxyReq", (proxyReq, req, res, options) => {
  // Log outgoing request details
  console.log(`[PROXY-REQ] ${req.method} ${options.target.href}${req.url}`);

  // Add custom headers to outgoing requests if needed
  proxyReq.setHeader("X-Proxy-By", "Express Proxy Server");

  // Important: Since we're not using body parsing middleware,
  // the request body will be streamed directly to the target server
  // This is the correct behavior for a proxy
});

// Listen for the 'proxyRes' event to modify incoming responses
proxy.on("proxyRes", (proxyRes, req, res) => {
  // Log response details
  console.log(
    `[PROXY-RES] ${req.method} ${req.originalUrl} -> ${proxyRes.statusCode}`
  );

  // Add custom response headers if needed
  res.setHeader("X-Proxy-Response", "true");

  // Handle CORS headers if needed (though we already have cors middleware)
  if (!res.getHeader("Access-Control-Allow-Origin")) {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }

  // Ensure proper content encoding handling
  if (proxyRes.headers["content-encoding"]) {
    res.setHeader("Content-Encoding", proxyRes.headers["content-encoding"]);
  }

  // Ensure content type is passed through
  if (proxyRes.headers["content-type"]) {
    res.setHeader("Content-Type", proxyRes.headers["content-type"]);
  }

  // Remove problematic headers that might cause issues with Railway
  delete proxyRes.headers["connection"];
  delete proxyRes.headers["keep-alive"];
  delete proxyRes.headers["transfer-encoding"];

  // Set proper status code
  res.statusCode = proxyRes.statusCode;
});

// Listen for WebSocket upgrade events
proxy.on("proxyReqWs", (proxyReq, req, socket, options, head) => {
  console.log(
    `[WS-UPGRADE] WebSocket connection requested to ${options.target.href}`
  );

  // Add custom headers for WebSocket connections
  proxyReq.setHeader("X-Proxy-WebSocket", "true");
});

// Listen for WebSocket errors
proxy.on("error", (err, req, socket) => {
  if (socket && socket.writable) {
    console.error("WebSocket Proxy Error:", err);
    socket.end("HTTP/1.1 500 WebSocket Error\r\n\r\n");
  }
});

// Listen for the 'close' event on WebSocket connections
proxy.on("close", (req, socket, head) => {
  console.log("[WS-CLOSE] WebSocket connection closed");
});

// Set up proxy middleware for each configuration
proxyConfigs.forEach((config) => {
  // Use app.use to match the path prefix for any HTTP method
  app.use(config.pathPrefix, (req, res, next) => {
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

    // Add error handling for the response
    res.on("error", (err) => {
      console.error("Response error:", err);
    });

    // Ensure connection stays alive
    req.on("error", (err) => {
      console.error("Request error:", err);
      if (!res.headersSent) {
        res.status(500).end();
      }
    });

    try {
      // Proxy the request to the target
      proxy.web(req, res, {
        target: config.target,
        // Most settings are already configured in the proxy instance creation
        // Only override target-specific settings here if needed
      });
    } catch (err) {
      console.error("Proxy.web error:", err);
      if (!res.headersSent) {
        res.status(502).json({ error: "Bad Gateway", details: err.message });
      }
    }
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
