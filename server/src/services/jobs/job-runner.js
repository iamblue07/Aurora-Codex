/**
 * Runs admin-triggered background jobs inside the API process and records them in
 * `background_jobs`. At most one job of each type runs at a time. Progress is kept in memory
 * (for live polling) and flushed to the database every few seconds; on restart, jobs that were
 * still running are marked "interrupted".
 *
 * A job definition is `{ parseParams(raw), preflight?(params), run(params, context) }`, where
 * `context` offers `signal` (aborted on cancel), `settings`, `setTotal`, `advance` and `note`.
 */
import { JOB_STATUSES } from '../../constants/domain.js';
import { BackgroundJob } from '../../models/index.js';
import HttpError from '../../utils/http-error.js';
import logger from '../../utils/logger.js';
import { getSettings } from '../settings.service.js';

const FLUSH_INTERVAL_MS = 3000;
const MAX_MESSAGE_LENGTH = 500;

/** @type {Map<string, object>} job type -> definition */
const definitions = new Map();
/** @type {Map<number, { type: string, controller: AbortController, progress: object }>} */
const active = new Map();

export const registerJob = (type, definition) => {
    definitions.set(type, definition);
};

const truncate = (text) => (text && text.length > MAX_MESSAGE_LENGTH ? `${text.slice(0, MAX_MESSAGE_LENGTH - 1)}…` : text);

const serialize = (job) => {
    const live = active.get(job.id)?.progress;
    return {
        id: job.id,
        type: job.type,
        status: job.status,
        params: job.params,
        total: live?.total ?? job.total,
        processed: live?.processed ?? job.processed,
        failed: live?.failed ?? job.failed,
        message: live?.message ?? job.message,
        result: job.result,
        startedBy: job.starter ? { id: job.starter.id, username: job.starter.username } : null,
        startedAt: job.startedAt,
        finishedAt: job.finishedAt,
    };
};

const persistProgress = (job, progress) => job.update({
    total: progress.total,
    processed: progress.processed,
    failed: progress.failed,
    message: truncate(progress.message),
}).catch((error) => logger.warn(`[jobs] could not save progress of job ${job.id}: ${error.message}`));

const execute = async (job, definition, params, controller) => {
    const progress = { total: null, processed: 0, failed: 0, message: null };
    active.set(job.id, { type: job.type, controller, progress });
    const flushTimer = setInterval(() => persistProgress(job, progress), FLUSH_INTERVAL_MS);

    const context = {
        signal: controller.signal,
        settings: await getSettings(),
        setTotal: (total) => { progress.total = total; },
        advance: ({ processed = 0, failed = 0 } = {}) => {
            progress.processed += processed;
            progress.failed += failed;
        },
        note: (message) => { progress.message = message; },
    };

    let status;
    let result = null;
    try {
        result = await definition.run(params, context);
        status = controller.signal.aborted ? JOB_STATUSES.CANCELLED : JOB_STATUSES.COMPLETED;
        if (status === JOB_STATUSES.CANCELLED) progress.message = 'Cancelled by an administrator';
    } catch (error) {
        if (controller.signal.aborted) {
            status = JOB_STATUSES.CANCELLED;
            progress.message = 'Cancelled by an administrator';
        } else {
            status = JOB_STATUSES.FAILED;
            progress.message = error.message;
            logger.error(`[jobs] ${job.type} job ${job.id} failed:`, error);
        }
        result = error.partialResult ?? null;
    } finally {
        clearInterval(flushTimer);
        active.delete(job.id);
    }

    await job.update({
        status,
        total: progress.total,
        processed: progress.processed,
        failed: progress.failed,
        message: truncate(progress.message),
        result,
        finishedAt: new Date(),
    });
    logger.info(`[jobs] ${job.type} job ${job.id} ${status} (${progress.processed} processed, ${progress.failed} failed)`);
};

/** Validates the parameters, records the job and starts it in the background. */
export const startJob = async (type, rawParams, userId) => {
    const definition = definitions.get(type);
    if (!definition) throw HttpError.badRequest(`Unknown job type: ${type}`);
    if ([...active.values()].some((job) => job.type === type)) {
        throw HttpError.conflict(`A ${type} job is already running`);
    }

    const params = definition.parseParams(rawParams ?? {});
    await definition.preflight?.(params);

    const job = await BackgroundJob.create({
        type,
        status: JOB_STATUSES.RUNNING,
        params,
        startedBy: userId,
        startedAt: new Date(),
    });
    const controller = new AbortController();
    // Not awaited: the job outlives the HTTP request. execute() records its own failures.
    execute(job, definition, params, controller).catch((error) => {
        logger.error(`[jobs] could not finish job ${job.id}:`, error);
    });
    return serialize(job);
};

/** Asks a running job to stop; it finishes its current step and is marked "cancelled". */
export const cancelJob = async (jobId) => {
    const running = active.get(jobId);
    if (!running) {
        const exists = await BackgroundJob.count({ where: { id: jobId } });
        if (!exists) throw HttpError.notFound('Job not found');
        throw HttpError.conflict('The job is not running');
    }
    running.controller.abort(new Error('Cancelled'));
    return getJob(jobId);
};

const starterInclude = { association: 'starter', attributes: ['id', 'username'] };

export const getJob = async (jobId) => {
    const job = await BackgroundJob.findByPk(jobId, { include: [starterInclude] });
    if (!job) throw HttpError.notFound('Job not found');
    return serialize(job);
};

export const listJobs = async ({ type, limit = 20 } = {}) => {
    const jobs = await BackgroundJob.findAll({
        where: type ? { type } : {},
        include: [starterInclude],
        order: [['id', 'DESC']],
        limit,
    });
    return jobs.map(serialize);
};

export const isJobRunning = (type) => [...active.values()].some((job) => job.type === type);

/** On startup: jobs left "running" by a previous process can never finish. */
export const markInterruptedJobs = async () => {
    const [count] = await BackgroundJob.update(
        { status: JOB_STATUSES.INTERRUPTED, message: 'The server restarted while the job was running', finishedAt: new Date() },
        { where: { status: JOB_STATUSES.RUNNING } },
    );
    if (count) logger.warn(`[jobs] marked ${count} unfinished job(s) as interrupted`);
};

/** Stops every running job (graceful shutdown). */
export const cancelAllJobs = () => {
    for (const { controller } of active.values()) controller.abort(new Error('Server shutting down'));
};
