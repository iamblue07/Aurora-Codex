/**
 * Worker thread that runs brute-force similarity searches, so a ~0.1 s scan over the whole
 * catalogue never blocks the API's event loop. The index arrays live in SharedArrayBuffers:
 * every worker reads the same memory, nothing is copied.
 */
import { parentPort, workerData } from 'node:worker_threads';
import { scanTopK } from './vector-math.js';

parentPort.on('message', ({ requestId, query, limit, exclude }) => {
    try {
        const results = scanTopK(workerData, query, { limit, exclude: new Set(exclude) });
        parentPort.postMessage({ requestId, results });
    } catch (error) {
        parentPort.postMessage({ requestId, error: error.message });
    }
});
