/**
 * Alternative scraper for Box Office Mojo
 * Uses The Numbers API and OMDB as fallback sources for theater data
 */

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
 * Scrape The Numbers website for theater count data
 * The Numbers tends to have theater counts in the initial HTML
 */
async function scrapeTheNumbers(title: string, year: number): Promise<{ theaters: number | null; boxOffice: number | null }> {
  try {
    // Format title for URL: replace spaces with dashes, lowercase
    const formattedTitle = title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-');

    const url = `https://www.the-numbers.com/movie/${year}/${formattedTitle}`;
    console.log(`Trying The Numbers: ${url}`);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (!response.ok) {
      console.log(`The Numbers returned ${response.status}`);
      return { theaters: null, boxOffice: null };
    }

    const html = await response.text();

    let theaters: number | null = null;
    let boxOffice: number | null = null;

    // Look for theater counts - The Numbers shows "X,XXX theaters"
    const theaterMatch = html.match(/>([\d,]+)\s*theaters?</i);
    if (theaterMatch) {
      const num = parseNumber(theaterMatch[1]);
      if (num >= 100 && num < 10000) {
        theaters = num;
        console.log(`The Numbers found theaters: ${theaters}`);
      }
    }

    // Also try "Maximum Theaters" or "Widest Release"
    const maxTheatersMatch = html.match(/(?:Maximum|Widest)[^<]*<[^>]*>([\d,]+)/i);
    if (maxTheatersMatch && !theaters) {
      const num = parseNumber(maxTheatersMatch[1]);
      if (num >= 100 && num < 10000) {
        theaters = num;
        console.log(`The Numbers found max theaters: ${theaters}`);
      }
    }

    // Get domestic box office too
    const boxOfficeMatch = html.match(/Domestic Box Office[^$]*\$([\d,]+)/i);
    if (boxOfficeMatch) {
      boxOffice = parseMoney(boxOfficeMatch[1]);
    }

    return { theaters, boxOffice };
  } catch (error) {
    console.error('The Numbers scrape error:', error);
    return { theaters: null, boxOffice: null };
  }
}

/**
 * Try to get data from OMDB API (free tier)
 */
async function tryOMDB(imdbId: string): Promise<{ theaters: number | null; boxOffice: number | null }> {
  const omdbKey = process.env.OMDB_API_KEY;
  if (!omdbKey) {
    return { theaters: null, boxOffice: null };
  }

  try {
    const response = await fetch(`http://www.omdbapi.com/?i=${imdbId}&apikey=${omdbKey}`);
    const data = await response.json();

    if (data.Response === 'True' && data.BoxOffice) {
      const boxOffice = parseMoney(data.BoxOffice);
      // OMDB doesn't provide theater count but may help with box office
      return { theaters: null, boxOffice: boxOffice > 0 ? boxOffice : null };
    }
  } catch (error) {
    console.error('OMDB error:', error);
  }

  return { theaters: null, boxOffice: null };
}

/**
 * Try scraping Wikipedia for theater count (often in static HTML)
 */
async function scrapeWikipedia(title: string, year: number): Promise<number | null> {
  try {
    // Format for Wikipedia URL
    const wikiTitle = title.replace(/\s+/g, '_').replace(/[:']/g, '');
    const urls = [
      `https://en.wikipedia.org/wiki/${wikiTitle}_(${year}_film)`,
      `https://en.wikipedia.org/wiki/${wikiTitle}_(film)`,
      `https://en.wikipedia.org/wiki/${wikiTitle}`,
    ];

    for (const url of urls) {
      console.log(`Trying Wikipedia: ${url}`);
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; MovieBot/1.0)',
        },
      });

      if (!response.ok) continue;

      const html = await response.text();

      // Wikipedia often has theater count in infobox or box office section
      // Look for patterns like "3,506 theaters" or "widest release" info
      const patterns = [
        /(\d{1,2},?\d{3})\s*theaters?/gi,
        /widest[^0-9]*(\d{1,2},?\d{3})/gi,
        /opened[^0-9]*(\d{1,2},?\d{3})\s*(?:theaters?|locations?|screens?)/gi,
      ];

      for (const pattern of patterns) {
        const match = html.match(pattern);
        if (match) {
          const numMatch = match[0].match(/(\d[\d,]*)/);
          if (numMatch) {
            const num = parseNumber(numMatch[1]);
            if (num >= 500 && num < 10000) {
              console.log(`Wikipedia found theaters: ${num}`);
              return num;
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Wikipedia scrape error:', error);
  }
  return null;
}

/**
 * Enhanced Box Office Mojo scraper
 * Note: BOM loads theater data via JavaScript, so this only gets box office
 */
async function scrapeBOMEnhanced(imdbId: string): Promise<BrowserScrapeResult | null> {
  const url = `https://www.boxofficemojo.com/title/${imdbId}/`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (!response.ok) {
      console.log(`BOM returned ${response.status}`);
      return null;
    }

    const html = await response.text();
    console.log(`BOM HTML length: ${html.length}`);

    const result: BrowserScrapeResult = {
      domestic_box_office: 0,
      theater_count: 0,
      opening_weekend: null,
      opening_theaters: null,
      widest_release: null,
    };

    // Extract domestic box office - this IS in static HTML
    const domesticMatch = html.match(/DOMESTIC[^$]*\$([\d,]+)/i);
    if (domesticMatch) {
      result.domestic_box_office = parseMoney(domesticMatch[1]);
      console.log(`BOM found domestic: $${result.domestic_box_office}`);
    }

    // Extract opening weekend
    const openingMatch = html.match(/Opening[^$]*\$([\d,]+)/i);
    if (openingMatch) {
      result.opening_weekend = parseMoney(openingMatch[1]);
    }

    // Theater counts are loaded via JavaScript on BOM - they won't be in static HTML
    // Try anyway in case the page structure changes
    const allTheaterMatches = html.match(/([\d,]+)\s*theaters?/gi);
    if (allTheaterMatches) {
      console.log(`BOM theater patterns found: ${allTheaterMatches.join(', ')}`);
      const counts = allTheaterMatches.map(m => {
        const numMatch = m.match(/([\d,]+)/);
        return numMatch ? parseNumber(numMatch[1]) : 0;
      }).filter(n => n >= 100 && n < 10000);

      if (counts.length > 0) {
        result.widest_release = Math.max(...counts);
        result.theater_count = result.widest_release;
        result.opening_theaters = counts[0];
        console.log(`BOM theater counts: ${counts.join(', ')}, using=${result.widest_release}`);
      }
    } else {
      console.log('BOM: No theater patterns found in static HTML (loaded via JS)');
    }

    return result;
  } catch (error) {
    console.error(`BOM enhanced scrape error for ${imdbId}:`, error);
    return null;
  }
}

/**
 * Main scraper function - combines multiple sources
 */
export async function scrapeBoxOfficeMojoBrowser(imdbId: string, title?: string, year?: number): Promise<BrowserScrapeResult | null> {
  console.log(`Starting enhanced scrape for ${imdbId} (${title} ${year})`);

  // Start with BOM enhanced scraper (gets box office, theater counts are JS-loaded)
  const bomResult = await scrapeBOMEnhanced(imdbId);

  const result: BrowserScrapeResult = {
    domestic_box_office: bomResult?.domestic_box_office || 0,
    theater_count: bomResult?.theater_count || 0,
    opening_weekend: bomResult?.opening_weekend || null,
    opening_theaters: bomResult?.opening_theaters || null,
    widest_release: bomResult?.widest_release || null,
  };

  // BOM theater counts are loaded via JS, so try alternative sources
  if (!result.theater_count && title && year) {
    console.log('BOM theater count not available, trying Wikipedia...');

    // Try Wikipedia (often has theater counts in static HTML)
    const wikiTheaters = await scrapeWikipedia(title, year);
    if (wikiTheaters) {
      result.theater_count = wikiTheaters;
      result.widest_release = wikiTheaters;
      console.log(`Got theaters from Wikipedia: ${wikiTheaters}`);
    }
  }

  // If still no theater data, try The Numbers
  if (!result.theater_count && title && year) {
    console.log('Trying The Numbers for theater count...');
    const numbersData = await scrapeTheNumbers(title, year);
    if (numbersData.theaters) {
      result.theater_count = numbersData.theaters;
      result.widest_release = numbersData.theaters;
      console.log(`Got theaters from The Numbers: ${numbersData.theaters}`);
    }
    if (!result.domestic_box_office && numbersData.boxOffice) {
      result.domestic_box_office = numbersData.boxOffice;
    }
  }

  // Try OMDB as last resort for box office
  if (!result.domestic_box_office) {
    const omdbData = await tryOMDB(imdbId);
    if (omdbData.boxOffice) {
      result.domestic_box_office = omdbData.boxOffice;
    }
  }

  console.log(`Enhanced scrape final result for ${imdbId}:`, result);

  // Return null if we got nothing useful
  if (result.domestic_box_office === 0 && result.theater_count === 0) {
    return null;
  }

  return result;
}
