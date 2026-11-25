/**
 * Runs an admin background job from the command line, against the database in .env, and prints
 * its progress. Useful where the server has no shell (Render's free plan) or for long runs.
 *
 *   npm run job -- emotions [--scope missing|all] [--limit N] [--concurrency N] [--batch-size N]
 *   npm run job -- embeddings
 *
 * The run is recorded like one started from the admin panel (it shows up in the job history).
 * Ctrl+C cancels it cleanly: work in flight finishes and is saved.
 */
import { closeDatabase, connectDatabase } from '../src/database/connection.js';
import { cancelJob, getJob, startJob } from '../src/services/jobs/index.js';
import logger from '../src/utils/logger.js';

const [type, ...rest] = process.argv.slice(2);
if (!type) {
    console.error('Usage: npm run job -- <emotions|embeddings|scraper> [--scope ...] [--limit N] [--concurrency N] [--batch-size N]');
    process.exit(1);
}

/** `--batch-size 10` → { batchSize: '10' } */
const params = {};
for (let i = 0; i < rest.length; i += 2) {
    const name = rest[i].replace(/^--/, '').replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    params[name] = rest[i + 1];
}

const POLL_MS = Number(process.env.JOB_POLL_MS) || 15_000;
const formatDuration = (ms) => {
    const minutes = Math.round(ms / 60_000);
    return minutes >= 60 ? `${Math.floor(minutes / 60)} h ${minutes % 60} min` : `${minutes} min`;
};

await connectDatabase();
const job = await startJob(type, params, null);
const startedAt = Date.now();
console.log(`Started ${type} job ${job.id} with`, JSON.stringify(params));

let stopping = false;
process.on('SIGINT', async () => {
    if (stopping) process.exit(1);
    stopping = true;
    console.log('\nCancelling: finishing the requests in flight…');
    await cancelJob(job.id).catch((error) => logger.warn(error.message));
});

for (;;) {
    await new Promise((resolve) => { setTimeout(resolve, POLL_MS); });
    const current = await getJob(job.id);
    const elapsed = Date.now() - startedAt;
    const rate = current.processed / (elapsed / 1000);
    const left = current.total && rate > 0 ? (current.total - current.processed) / rate : null;
    console.log(
        `${new Date().toLocaleTimeString('ro-RO')}  ${current.processed}/${current.total ?? '?'} processed`
        + ` (${current.failed} failed), ${rate.toFixed(1)}/s`
        + (left !== null ? `, ~${formatDuration(left * 1000)} left` : '')
        + (current.message ? `  ${current.message}` : ''),
    );
    if (current.status !== 'running') {
        console.log(`Job ${current.status} after ${formatDuration(elapsed)}.`, current.result ? JSON.stringify(current.result) : '');
        break;
    }
}
await closeDatabase();
process.exit(0);
