/**
 * Browser-based scraper using Puppeteer
 * This scraper can render JavaScript and extract data that's not in the initial HTML
 */

import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

export interface BrowserScrapeResult {
  domestic_box_office: number;
  theater_count: number;
  opening_weekend: number | null;
  opening_theaters: number | null;
  widest_release: number | null;
}

/**
 * Parse a money string like "$123,456,789" to a number
 */
function parseMoney(str: string): number {
  const cleaned = str.replace(/[$,]/g, '');
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? 0 : num;
}

/**
 * Parse a number string like "4,123" to a number
 */
function parseNumber(str: string): number {
  const cleaned = str.replace(/,/g, '');
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? 0 : num;
}

/**
 * Scrape Box Office Mojo using a headless browser
 * This allows us to get JavaScript-rendered content like theater counts
 */
export async function scrapeBoxOfficeMojoBrowser(imdbId: string): Promise<BrowserScrapeResult | null> {
  const url = `https://www.boxofficemojo.com/title/${imdbId}/`;
  let browser = null;

  try {
    // Configure chromium for serverless environment
    const executablePath = await chromium.executablePath();

    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: 1280, height: 720 },
      executablePath,
      headless: true,
    });

    const page = await browser.newPage();

    // Set a realistic user agent
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // Navigate to the page and wait for content to load
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Wait a bit for any dynamic content
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Extract the page text content
    const pageText = await page.evaluate(() => document.body.innerText);

    const result: BrowserScrapeResult = {
      domestic_box_office: 0,
      theater_count: 0,
      opening_weekend: null,
      opening_theaters: null,
      widest_release: null,
    };

    // Extract domestic box office
    const domesticMatch = pageText.match(/DOMESTIC[^\$]*\$([\d,]+)/i);
    if (domesticMatch) {
      result.domestic_box_office = parseMoney(domesticMatch[1]);
    }

    // Extract opening weekend
    const openingMatch = pageText.match(/Opening[^\$]*\$([\d,]+)/i);
    if (openingMatch) {
      result.opening_weekend = parseMoney(openingMatch[1]);
    }

    // Extract theater counts - look for "X,XXX theaters" patterns
    const theaterMatches = pageText.match(/([\d,]+)\s*theaters?/gi);
    if (theaterMatches) {
      const counts = theaterMatches.map(m => {
        const numMatch = m.match(/([\d,]+)/);
        return numMatch ? parseNumber(numMatch[1]) : 0;
      }).filter(n => n >= 100 && n < 10000);

      if (counts.length > 0) {
        result.widest_release = Math.max(...counts);
        result.theater_count = result.widest_release;
        result.opening_theaters = counts[0];
      }
    }

    // Also try to extract from specific table rows
    const widestMatch = pageText.match(/Widest\s*Release[:\s]*([\d,]+)/i);
    if (widestMatch && !result.widest_release) {
      const num = parseNumber(widestMatch[1]);
      if (num >= 100 && num < 10000) {
        result.widest_release = num;
        result.theater_count = num;
      }
    }

    console.log(`Browser scrape for ${imdbId}:`, result);

    return result;
  } catch (error) {
    console.error(`Browser scrape error for ${imdbId}:`, error);
    return null;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
