/** Admin job: scrape bookstore listing pages into the catalogue (see scraper.service.js). */
import HttpError from '../../utils/http-error.js';
import { parseInteger } from '../../utils/validation.js';
import { isScraperAvailable, SCRAPER_SETTINGS, scrapeCatalogue } from '../scraper/scraper.service.js';

export default {
    parseParams(raw) {
        const fromPage = raw.fromPage === undefined ? 1 : parseInteger(raw.fromPage, 'fromPage', { min: 1, max: 10_000 });
        const toPage = raw.toPage === undefined
            ? SCRAPER_SETTINGS.totalPages
            : parseInteger(raw.toPage, 'toPage', { min: 1, max: 10_000 });
        if (fromPage > toPage) throw HttpError.badRequest('fromPage must be less than or equal to toPage');
        return { fromPage, toPage };
    },

    async preflight() {
        if (!(await isScraperAvailable())) {
            throw HttpError.serviceUnavailable('The scraper requires the optional "puppeteer" package');
        }
    },

    async run({ fromPage, toPage }, { signal, settings, setTotal, advance, note }) {
        // Progress is counted in listing pages; the result holds the book counts.
        setTotal(toPage - fromPage + 1);
        let lastError = null;
        const totals = await scrapeCatalogue({
            fromPage,
            toPage,
            concurrency: settings['scraper.concurrency'],
            requestDelayMs: settings['scraper.requestDelayMs'],
        }, {
            signal,
            onBook: () => {},
            onError: (message) => { lastError = message; },
            onPage: (pageNumber) => {
                advance({ processed: 1 });
                note(`Page ${pageNumber}/${toPage} done${lastError ? ` (last error: ${lastError})` : ''}`);
            },
        });
        return totals;
    },
};
