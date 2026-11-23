/**
 * A small pool of search worker threads sharing one index (SharedArrayBuffers). Requests are
 * handed out round-robin; each worker scans the whole index for one query.
 */
import os from 'node:os';
import { Worker } from 'node:worker_threads';
import logger from '../../utils/logger.js';

/** Leave cores for the API itself; two workers already serve searches in parallel. */
export const POOL_SIZE = Math.max(1, Math.min(2, os.availableParallelism() - 1));
const WORKER_URL = new URL('./vector-search.worker.js', import.meta.url);

/**
 * @param {{ ids, matrix, scales, dimensions, count }} index arrays backed by SharedArrayBuffers
 * @returns {{ search(query, options): Promise<object[]>, terminate(): void }}
 */
export const createSearchPool = (index, size = POOL_SIZE) => {
    const pending = new Map();
    let nextRequestId = 0;
    let nextWorker = 0;

    const workers = Array.from({ length: size }, () => {
        const worker = new Worker(WORKER_URL, {
            workerData: {
                ids: index.ids, matrix: index.matrix, scales: index.scales,
                dimensions: index.dimensions, count: index.count,
            },
        });
        worker.unref(); // never keeps the process alive on its own
        worker.on('message', ({ requestId, results, error }) => {
            const request = pending.get(requestId);
            if (!request) return;
            pending.delete(requestId);
            if (error) request.reject(new Error(error));
            else request.resolve(results);
        });
        worker.on('error', (error) => {
            logger.error('[vector-index] search worker crashed:', error);
            for (const [requestId, request] of pending) {
                if (request.worker === worker) {
                    pending.delete(requestId);
                    request.reject(error);
                }
            }
        });
        return worker;
    });

    return {
        search(query, { limit, exclude }) {
            const worker = workers[nextWorker];
            nextWorker = (nextWorker + 1) % workers.length;
            const requestId = nextRequestId;
            nextRequestId += 1;
            return new Promise((resolve, reject) => {
                pending.set(requestId, { resolve, reject, worker });
                worker.postMessage({ requestId, query, limit, exclude: [...exclude] });
            });
        },
        terminate() {
            for (const worker of workers) worker.terminate();
            for (const request of pending.values()) request.reject(new Error('Search index was replaced'));
            pending.clear();
        },
    };
};
