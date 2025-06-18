/**
 * 🚀 Queue Worker Initialization Entry Point
 *
 * 📝 Description:
 * Initializes the queue manager and starts all registered workers.
 * This should be called during server startup to ensure queue processing is ready.
 *
 * ⚠️ Error Handling:
 * - Logs errors if initialization fails.
 * - Throws error to prevent silent failures on startup.
 */

import { queueManager } from "./queue-manager.server";

export async function initializeWorkers() {
  try {
    await queueManager.initialize();
    console.log("Queue workers initialized successfully");
  } catch (error) {
    console.error("Failed to initialize queue workers:", error);
    throw error;
  }
}
