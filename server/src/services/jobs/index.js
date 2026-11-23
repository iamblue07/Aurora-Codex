/** Registers every admin job type with the runner. Import once at startup (app.js). */
import { JOB_TYPES } from '../../constants/domain.js';
import embeddingsJob from './embeddings.job.js';
import emotionsJob from './emotions.job.js';
import { registerJob } from './job-runner.js';
import scraperJob from './scraper.job.js';

registerJob(JOB_TYPES.SCRAPER, scraperJob);
registerJob(JOB_TYPES.EMBEDDINGS, embeddingsJob);
registerJob(JOB_TYPES.EMOTIONS, emotionsJob);

export * from './job-runner.js';
