/**
 * Box Office Mojo Scraper
 *
 * Scrapes domestic box office and theater count data from Box Office Mojo.
 * Uses IMDB IDs to look up movies since BOM uses IMDB's database.
 */

export interface BoxOfficeData {
  domestic_box_office: number;
  theater_count: number;
  opening_weekend: number | null;
  opening_theaters: number | null;
  widest_release: number | null;
  metacritic_score: number | null;
  scraped_at: string;
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
 * Scrape box office data from Box Office Mojo using IMDB ID
 */
export async function scrapeBoxOfficeData(imdbId: string): Promise<BoxOfficeData | null> {
  // BOM URL format: https://www.boxofficemojo.com/title/tt1234567/
  const url = `https://www.boxofficemojo.com/title/${imdbId}/`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });

    if (!response.ok) {
      console.error(`BOM fetch failed: ${response.status} for ${imdbId}`);
      return null;
    }

    const html = await response.text();

    // Extract data using regex patterns
    const data: BoxOfficeData = {
      domestic_box_office: 0,
      theater_count: 0,
      opening_weekend: null,
      opening_theaters: null,
      widest_release: null,
      metacritic_score: null,
      scraped_at: new Date().toISOString(),
    };

    // Look for Domestic box office - multiple patterns
    // BOM typically shows: Domestic (X.X%) $XXX,XXX,XXX
    const domesticPatterns = [
      /Domestic[^<]*<[^>]*>\s*\$?([\d,]+)/i,
      /Domestic[^$]*\$([\d,]+)/i,
      /<span class="money">\$([\d,]+)<\/span>/,
      /Gross[^$]*\$([\d,]+)/i,
    ];

    for (const pattern of domesticPatterns) {
      const match = html.match(pattern);
      if (match && data.domestic_box_office === 0) {
        data.domestic_box_office = parseMoney(match[1] || match[0]);
      }
    }

    // Look for Opening Weekend - BOM shows "Opening" with dollar amount
    const openingPatterns = [
      /Opening[^$]*\$([\d,]+)/i,
      /Opening Weekend[^$]*\$([\d,]+)/i,
    ];

    for (const pattern of openingPatterns) {
      const match = html.match(pattern);
      if (match && !data.opening_weekend) {
        data.opening_weekend = parseMoney(match[1]);
      }
    }

    // Look for theater counts - BOM shows various theater-related data
    // The HTML structure often includes spans with theater counts

    // Pattern for "Widest Release" section - this is the most reliable
    const widestPatterns = [
      /Widest Release<\/span><span[^>]*>([\d,]+)/i,
      /Widest Release[^<]*<[^>]*>([\d,]+)/i,
      /Widest Release[:\s]*([\d,]+)/i,
      /widest[^0-9]*([\d,]+)\s*theater/i,
    ];

    for (const pattern of widestPatterns) {
      const match = html.match(pattern);
      if (match && !data.widest_release) {
        const num = parseNumber(match[1]);
        if (num > 100) { // Sanity check - widest release should be > 100
          data.widest_release = num;
          data.theater_count = num;
        }
      }
    }

    // Look for Opening theaters - often shows "X theaters" near opening weekend
    const openingTheaterPatterns = [
      /Opening[^<]*<[^>]*>\$([\d,]+)[^<]*<[^>]*>([\d,]+)\s*theater/i,
      /Opening[^0-9]*\$[\d,]+[^0-9]*([\d,]+)\s*theater/i,
      /([\d,]+)\s*theaters?\s*<\/span>[^<]*Opening/i,
    ];

    for (const pattern of openingTheaterPatterns) {
      const match = html.match(pattern);
      if (match && !data.opening_theaters) {
        // Get the last capture group which should be the theater count
        const num = parseNumber(match[match.length - 1]);
        if (num > 100 && num < 10000) {
          data.opening_theaters = num;
        }
      }
    }

    // If still no theater count, search more broadly
    if (!data.theater_count) {
      // Look for all instances of "X,XXX theaters" or similar
      const theaterMatches = html.match(/([\d,]+)\s*theaters?/gi);
      if (theaterMatches) {
        const counts = theaterMatches.map(m => {
          const numMatch = m.match(/([\d,]+)/);
          return numMatch ? parseNumber(numMatch[1]) : 0;
        }).filter(n => n >= 100 && n < 10000); // Filter to reasonable theater counts

        if (counts.length > 0) {
          // Widest release is usually the largest number
          data.widest_release = Math.max(...counts);
          data.theater_count = data.widest_release;
          // Opening theaters is usually the smallest reasonable count
          if (!data.opening_theaters && counts.length > 1) {
            data.opening_theaters = Math.min(...counts);
          }
        }
      }
    }

    // Log what we found for debugging
    console.log(`BOM scrape for ${imdbId}: box_office=${data.domestic_box_office}, theaters=${data.theater_count}, widest=${data.widest_release}`);

    return data;
  } catch (error) {
    console.error(`Error scraping BOM for ${imdbId}:`, error);
    return null;
  }
}

/**
 * Scrape Metacritic score for a movie
 */
export async function scrapeMetacriticScore(title: string, year?: number): Promise<number | null> {
  // Format title for URL: lowercase, replace spaces with dashes, remove special chars
  const formattedTitle = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

  const url = `https://www.metacritic.com/movie/${formattedTitle}/`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });

    if (!response.ok) {
      console.log(`Metacritic fetch failed: ${response.status} for ${title}`);
      return null;
    }

    const html = await response.text();

    // Look for metascore patterns
    const scorePatterns = [
      /metascore_w[^>]*>(\d+)</i,
      /"ratingValue":\s*"?(\d+)"?/i,
      /Metascore[^0-9]*(\d+)/i,
      /<span[^>]*class="[^"]*metascore[^"]*"[^>]*>(\d+)/i,
      /data-metascore="(\d+)"/i,
    ];

    for (const pattern of scorePatterns) {
      const match = html.match(pattern);
      if (match) {
        const score = parseInt(match[1], 10);
        if (score >= 0 && score <= 100) {
          return score;
        }
      }
    }

    return null;
  } catch (error) {
    console.error(`Error scraping Metacritic for ${title}:`, error);
    return null;
  }
}

/**
 * Search Box Office Mojo by title if we don't have an IMDB ID
 */
export async function searchBoxOfficeMojo(title: string, year?: number): Promise<string | null> {
  const query = encodeURIComponent(year ? `${title} ${year}` : title);
  const url = `https://www.boxofficemojo.com/search/?q=${query}`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!response.ok) return null;

    const html = await response.text();

    // Look for first IMDB ID in search results
    const imdbMatch = html.match(/\/title\/(tt\d+)\//);
    return imdbMatch ? imdbMatch[1] : null;
  } catch (error) {
    console.error(`Error searching BOM for ${title}:`, error);
    return null;
  }
}
