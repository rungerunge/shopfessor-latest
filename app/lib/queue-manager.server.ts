import { Queue, Worker, Job } from "bullmq";
import { redis } from "./redis.server";
import { JobTypes } from "app/types/queue";

class QueueManager {
  private queues: Map<string, Queue> = new Map();
  private workers: Map<string, Worker> = new Map();

  // Create or get existing queue
  getQueue<T extends keyof JobTypes>(name: T): Queue<JobTypes[T]> {
    if (!this.queues.has(name)) {
      const queue = new Queue<JobTypes[T]>(name, {
        connection: redis,
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 50,
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: 2000,
          },
        },
      });
      this.queues.set(name, queue);
    }
    return this.queues.get(name) as Queue<JobTypes[T]>;
  }

  // Add job to queue
  async addJob<T extends keyof JobTypes>(
    queueName: T,
    jobData: JobTypes[T],
    options?: {
      delay?: number;
      priority?: number;
      repeat?: { cron: string };
    },
  ) {
    const queue = this.getQueue(queueName);
    return await queue.add(queueName, jobData, options);
  }

  // Create worker for processing jobs
  createWorker<T extends keyof JobTypes>(
    queueName: T,
    processor: (job: Job<JobTypes[T]>) => Promise<void>,
  ) {
    if (this.workers.has(queueName)) {
      return this.workers.get(queueName);
    }

    const worker = new Worker<JobTypes[T]>(queueName, processor, {
      connection: redis,
      concurrency: 5,
    });

    // Error handling
    worker.on("failed", (job, err) => {
      console.error(`Job ${job?.id} failed:`, err);
    });

    worker.on("completed", (job) => {
      console.log(`Job ${job.id} completed successfully`);
    });

    this.workers.set(queueName, worker);
    return worker;
  }

  // Graceful shutdown
  async shutdown() {
    const closePromises = [
      ...Array.from(this.queues.values()).map((queue) => queue.close()),
      ...Array.from(this.workers.values()).map((worker) => worker.close()),
    ];
    await Promise.all(closePromises);
  }
}

export const queueManager = new QueueManager();
