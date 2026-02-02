/*
 * Simple in-memory queue for rate-limiting asynchronous tasks.
 *
 * This module provides a minimal job queue to serialise API
 * requests, particularly those made to rate-limited third-party
 * services (e.g. OpenAI, Google Classroom). By enqueueing
 * asynchronous functions, you can ensure that only one job runs at
 * a time and that subsequent jobs wait for the previous job to
 * complete. This reduces the likelihood of hitting 429 errors and
 * provides a straightforward way to add backpressure to user-triggered
 * actions.
 *
 * Example usage:
 * ```ts
 * import { enqueue } from '@/services/queue';
 *
 * enqueue(() => openAiClient.generateAnswer(prompt))
 *   .then((response) => {
 *     // handle response
 *   });
 * ```
 */

export type Job<T> = () => Promise<T>;

// Internal queue of pending jobs
const jobQueue: Array<() => void> = [];

// Indicates whether a job is currently running
let isRunning = false;

/**
 * Processes the next job in the queue if one exists and no job is
 * currently running.
 */
function processQueue() {
  if (isRunning || jobQueue.length === 0) {
    return;
  }
  isRunning = true;
  const next = jobQueue.shift();
  if (next) {
    next();
  }
}

/**
 * Enqueue a job to be executed when the queue is free. The job
 * function should return a promise. The enqueue function returns a
 * promise that resolves or rejects with the result of the job.
 *
 * @param job The asynchronous function to enqueue
 * @returns A promise resolving with the job's return value
 */
export function enqueue<T>(job: Job<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const runJob = () => {
      job()
        .then((result) => {
          resolve(result);
        })
        .catch((error) => {
          reject(error);
        })
        .finally(() => {
          isRunning = false;
          processQueue();
        });
    };
    jobQueue.push(runJob);
    processQueue();
  });
}

/**
 * Returns the number of jobs currently waiting in the queue. Can be
 * useful for diagnostics or debugging.
 */
export function getPendingJobCount(): number {
  return jobQueue.length + (isRunning ? 1 : 0);
}
