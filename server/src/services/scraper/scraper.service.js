/**
 * Scrapes the English-language books section of carturesti.ro into the catalogue.
 *
 * Runs as an admin background job (see services/jobs/scraper.job.js): the job runner tracks
 * progress and cancellation. Puppeteer is an optional dependency loaded lazily, so the API works
 * on hosts where Chromium is not installed (the admin panel then reports the scraper unavailable).
 */
import fs from 'node:fs';
import path from 'node:path';
import { LOGS_DIR } from '../../config/paths.js';
import { Book, BookOffer, sequelize } from '../../models/index.js';
import HttpError from '../../utils/http-error.js';
import logger from '../../utils/logger.js';
import mapToGenre from './genre-mapper.js';

export const SCRAPER_SETTINGS = Object.freeze({
    store: 'Carturesti',
    listingUrl: (page) => `https://carturesti.ro/raft/carte-straina-1937?locations=44&limba=Engleza&page=${page}`,
    totalPages: 250,
    pageDelayMs: 1000,
    navigationTimeoutMs: 60_000,
    // Identify the bot honestly instead of faking a browser user agent.
    userAgent: "Readers web app catalogue scraper (Bachelor's thesis project)",
});

const sleep = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

const loadPuppeteer = async () => {
    try {
        return (await import('puppeteer')).default;
    } catch {
        throw HttpError.serviceUnavailable('The scraper requires the optional "puppeteer" package');
    }
};

/** Whether the optional Puppeteer dependency is installed. */
export const isScraperAvailable = async () => {
    try {
        await loadPuppeteer();
        return true;
    } catch {
        return false;
    }
};

/** Reads every field we need from a book page in a single round-trip to the browser. */
const extractBookData = (page) => page.evaluate(() => {
    const text = (selector) => document.querySelector(selector)?.textContent.replace(/\s+/g, ' ').trim() || null;
    const isbnNode = document.evaluate(
        "//div[@class='productAttr'][span[contains(text(),'ISBN')]]/div[1]",
        document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null,
    ).singleNodeValue;
    const paragraphs = [...document.querySelectorAll('article[itemprop="description"] p')]
        .map((p) => p.textContent.replace(/\s+/g, ' ').trim())
        .filter(Boolean);

    return {
        coverImage: document.querySelector('.imageSlider img')?.src ?? null,
        title: text('.titluProdus'),
        author: text('.autorProdus > a:nth-child(1)'),
        category: text('.linkuriCategorii > a:nth-child(1)'),
        description: paragraphs.join('\n') || null,
        priceUnits: document.querySelector('.pret')?.firstChild?.textContent.replace(/\s+/g, '') ?? null,
        priceCents: text('span.bani:nth-child(1)'),
        isbn: isbnNode?.textContent.trim() || null,
    };
});

/**
 * Inserts the book (or refreshes the price of an already known ISBN).
 * @returns {Promise<'created' | 'updated'>}
 */
export const saveScrapedBook = ({ url, title, author, category, description, coverImage, isbn, price }) =>
    sequelize.transaction(async (transaction) => {
        const existing = isbn ? await Book.findOne({ where: { isbn }, transaction }) : null;
        if (existing) {
            const [offer, created] = await BookOffer.findOrCreate({
                where: { bookId: existing.id, store: SCRAPER_SETTINGS.store },
                defaults: { url, price },
                transaction,
            });
            if (!created) await offer.update({ url, price }, { transaction });
            return 'updated';
        }

        // Missing values stay NULL; the UI renders its own placeholders.
        const book = await Book.create({
            isbn,
            title,
            author,
            description,
            genre: mapToGenre(category),
            coverImage,
        }, { transaction });
        await BookOffer.create({ bookId: book.id, store: SCRAPER_SETTINGS.store, url, price }, { transaction });
        return 'created';
    });

const createRunLogger = (onError) => {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
    const stream = fs.createWriteStream(path.join(LOGS_DIR, 'scraper.log'), { flags: 'a' });
    const write = (line) => stream.write(`[${new Date().toISOString()}] ${line}
`);
    return {
        info: write,
        error: (context, error, url) => {
            onError(`${context}: ${error.message}`);
            write(`ERROR (${context}) ${error.message}${url ? ` | ${url}` : ''}`);
        },
        close: () => new Promise((resolve) => { stream.end(resolve); }),
    };
};

const openPage = async (browser) => {
    const page = await browser.newPage();
    await page.setUserAgent(SCRAPER_SETTINGS.userAgent);
    return page;
};

const scrapeBook = async (browser, url) => {
    const page = await openPage(browser);
    try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: SCRAPER_SETTINGS.navigationTimeoutMs });
        const data = await extractBookData(page);
        if (!data.title) throw new Error('title not found');

        const price = (Number.parseFloat(data.priceUnits) || 0) + (Number.parseFloat(data.priceCents) || 0) / 100;
        return await saveScrapedBook({ ...data, url, price: Math.round(price * 100) / 100 });
    } finally {
        await page.close();
    }
};

const getBookLinks = async (browser, pageNumber) => {
    const page = await openPage(browser);
    try {
        await page.goto(SCRAPER_SETTINGS.listingUrl(pageNumber), {
            waitUntil: 'domcontentloaded',
            timeout: SCRAPER_SETTINGS.navigationTimeoutMs,
        });
        await page.waitForSelector('div.products-container-grid:nth-child(2)', { timeout: 15_000 });
        return await page.$$eval(
            'div.products-container-grid:nth-child(2) .cartu-grid-tile a.clean-a',
            (anchors) => anchors.map((a) => a.href),
        );
    } finally {
        await page.close();
    }
};

/**
 * Scrapes listing pages `fromPage`..`toPage`. Each page's books are split between
 * `concurrency` workers that wait `requestDelayMs` between requests (polite crawling).
 *
 * @param {{ fromPage: number, toPage: number, concurrency: number, requestDelayMs: number }} options
 * @param {{ signal: AbortSignal, onBook: (outcome) => void, onError: (message) => void,
 *   onPage: (pageNumber) => void }} hooks
 * @returns {Promise<{ created: number, updated: number, failures: number }>}
 */
export const scrapeCatalogue = async (
    { fromPage, toPage, concurrency, requestDelayMs },
    { signal, onBook, onError, onPage },
) => {
    const totals = { created: 0, updated: 0, failures: 0 };
    const fail = (message) => { totals.failures += 1; onError(message); };
    const runLog = createRunLogger(fail);
    const puppeteer = await loadPuppeteer();
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    runLog.info(`Run started (pages ${fromPage}-${toPage})`);

    try {
        for (let pageNumber = fromPage; pageNumber <= toPage && !signal.aborted; pageNumber += 1) {
            let urls = [];
            try {
                urls = await getBookLinks(browser, pageNumber);
            } catch (error) {
                runLog.error('listing page', error, `page ${pageNumber}`);
            }

            await Promise.all(Array.from({ length: concurrency }, async (_, worker) => {
                for (let i = worker; i < urls.length && !signal.aborted; i += concurrency) {
                    try {
                        const outcome = await scrapeBook(browser, urls[i]);
                        totals[outcome] += 1;
                        onBook(outcome);
                    } catch (error) {
                        runLog.error('book', error, urls[i]);
                    }
                    await sleep(requestDelayMs);
                }
            }));

            onPage(pageNumber);
            logger.info(`[scraper] page ${pageNumber}/${toPage} done (${totals.created} new, ${totals.updated} updated)`);
            await sleep(SCRAPER_SETTINGS.pageDelayMs);
        }
    } finally {
        await browser.close().catch(() => {});
        runLog.info(`Run ended: ${totals.created} new, ${totals.updated} updated, ${totals.failures} failures`);
        await runLog.close();
    }
    return totals;
};
