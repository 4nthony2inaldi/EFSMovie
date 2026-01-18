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
 * Enhanced Box Office Mojo scraper
 * Uses multiple patterns to find theater data in the static HTML
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
      return null;
    }

    const html = await response.text();

    const result: BrowserScrapeResult = {
      domestic_box_office: 0,
      theater_count: 0,
      opening_weekend: null,
      opening_theaters: null,
      widest_release: null,
    };

    // Extract domestic box office
    const domesticMatch = html.match(/DOMESTIC[^$]*\$([\d,]+)/i);
    if (domesticMatch) {
      result.domestic_box_office = parseMoney(domesticMatch[1]);
    }

    // Extract opening weekend
    const openingMatch = html.match(/Opening[^$]*\$([\d,]+)/i);
    if (openingMatch) {
      result.opening_weekend = parseMoney(openingMatch[1]);
    }

    // Try multiple patterns for theater counts
    // BOM shows "3,506 theaters" in various places - use simple global pattern
    const allTheaterMatches = html.match(/([\d,]+)\s*theaters?/gi);
    if (allTheaterMatches) {
      console.log(`Found theater patterns: ${allTheaterMatches.join(', ')}`);
      const counts = allTheaterMatches.map(m => {
        const numMatch = m.match(/([\d,]+)/);
        return numMatch ? parseNumber(numMatch[1]) : 0;
      }).filter(n => n >= 100 && n < 10000);

      if (counts.length > 0) {
        result.widest_release = Math.max(...counts);
        result.theater_count = result.widest_release;
        result.opening_theaters = counts[0];
        console.log(`Theater counts found: ${counts.join(', ')}, using widest=${result.widest_release}`);
      }
    }

    // Also try "Widest Release" specific pattern
    if (!result.theater_count) {
      const widestMatch = html.match(/Widest\s*Release[^0-9]*([\d,]+)/i);
      if (widestMatch) {
        const num = parseNumber(widestMatch[1]);
        if (num >= 100 && num < 10000) {
          result.widest_release = num;
          result.theater_count = num;
          console.log(`Found via Widest Release: ${num}`);
        }
      }
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

  // Start with BOM enhanced scraper
  const bomResult = await scrapeBOMEnhanced(imdbId);

  const result: BrowserScrapeResult = {
    domestic_box_office: bomResult?.domestic_box_office || 0,
    theater_count: bomResult?.theater_count || 0,
    opening_weekend: bomResult?.opening_weekend || null,
    opening_theaters: bomResult?.opening_theaters || null,
    widest_release: bomResult?.widest_release || null,
  };

  // If we still don't have theater data and have title/year, try The Numbers
  if (!result.theater_count && title && year) {
    const numbersData = await scrapeTheNumbers(title, year);
    if (numbersData.theaters) {
      result.theater_count = numbersData.theaters;
      result.widest_release = numbersData.theaters;
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

  console.log(`Enhanced scrape result for ${imdbId}:`, result);

  // Return null if we got nothing useful
  if (result.domestic_box_office === 0 && result.theater_count === 0) {
    return null;
  }

  return result;
}
