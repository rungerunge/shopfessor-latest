/**
 * 🛠️ Queue Manager
 *
 * 📝 Description:
 * Manages the initialization and shutdown of the queue system.
 * Ensures queues are only initialized once and properly cleaned up on shutdown.
 *
 * 📦 Features:
 * - Singleton instance to prevent multiple initializations.
 * - Abstracted entry point for queue system initialization (Bull, BullMQ, etc.).
 * - Clean shutdown handling for graceful server exits.
 *
 * 🚀 Usage:
 * - Call `queueManager.initialize()` during server startup.
 * - Call `queueManager.shutdown()` during server shutdown.
 */

class QueueManager {
  private isInitialized = false;

  async initialize() {
    if (this.isInitialized) {
      return;
    }

    // Initialize your queue system here
    // This could be Bull, BullMQ, or any other queue system
    this.isInitialized = true;
  }

  async shutdown() {
    if (!this.isInitialized) {
      return;
    }

    // Cleanup queue connections and workers
    this.isInitialized = false;
  }
}

export const queueManager = new QueueManager();
