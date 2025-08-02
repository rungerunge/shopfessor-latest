import { createRequestHandler } from "@remix-run/express";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Set the port from environment variable or default to 3000
const PORT = process.env.PORT || 3000;

console.log(`🔄 Starting server on PORT: ${PORT}`);
console.log(`🔄 Environment: ${process.env.NODE_ENV}`);

// Serve static files
app.use(express.static(path.join(__dirname, "build/client")));

// Import the build
const build = await import("./build/server/index.js");

// Create Remix request handler
const remixHandler = createRequestHandler({
  build: build,
});

// Handle all requests with Remix
app.all("*", remixHandler);

// Start the server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server ready at http://0.0.0.0:${PORT}`);
  console.log(`🚀 Environment: ${process.env.NODE_ENV}`);
  console.log(`🚀 Build directory: ${path.join(__dirname, "build")}`);
});