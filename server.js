const { createRequestHandler } = require("@remix-run/express");
const express = require("express");
const path = require("path");

const app = express();

// Set the port from environment variable or default to 3000
const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname, "build/client")));

// Create Remix request handler
const remixHandler = createRequestHandler({
  build: require("./build/server/index.js"),
});

// Handle all requests with Remix
app.all("*", remixHandler);

// Start the server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server ready at http://0.0.0.0:${PORT}`);
  console.log(`🚀 Environment: ${process.env.NODE_ENV}`);
});