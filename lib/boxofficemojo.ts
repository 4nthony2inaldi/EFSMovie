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

    // Extract data using regex patterns (more reliable than DOM parsing in serverless)
    const data: BoxOfficeData = {
      domestic_box_office: 0,
      theater_count: 0,
      opening_weekend: null,
      opening_theaters: null,
      widest_release: null,
      scraped_at: new Date().toISOString(),
    };

    // Look for Domestic box office - it's in a summary section
    // Pattern: "Domestic" followed by money amount
    const domesticMatch = html.match(/Domestic[^$]*\$[\d,]+/i);
    if (domesticMatch) {
      const moneyMatch = domesticMatch[0].match(/\$([\d,]+)/);
      if (moneyMatch) {
        data.domestic_box_office = parseMoney(moneyMatch[0]);
      }
    }

    // Alternative pattern: Look for the money-delta span with domestic gross
    const grossMatch = html.match(/<span class="money">\$([\d,]+)<\/span>/g);
    if (grossMatch && grossMatch.length > 0) {
      // First money span is usually domestic gross
      const firstMoney = grossMatch[0].match(/\$([\d,]+)/);
      if (firstMoney && data.domestic_box_office === 0) {
        data.domestic_box_office = parseMoney(firstMoney[0]);
      }
    }

    // Look for Opening Weekend
    const openingMatch = html.match(/Opening[^$]*\$([\d,]+)/i);
    if (openingMatch) {
      const moneyMatch = openingMatch[0].match(/\$([\d,]+)/);
      if (moneyMatch) {
        data.opening_weekend = parseMoney(moneyMatch[0]);
      }
    }

    // Look for theater counts - usually near "theaters" text
    // Pattern: "X,XXX theaters" or "theaters: X,XXX"
    const theaterMatches = html.match(/([\d,]+)\s*theaters/gi);
    if (theaterMatches) {
      const counts = theaterMatches.map(m => {
        const numMatch = m.match(/([\d,]+)/);
        return numMatch ? parseNumber(numMatch[1]) : 0;
      }).filter(n => n > 0);

      if (counts.length > 0) {
        // Widest release is usually the largest number
        data.widest_release = Math.max(...counts);
        data.theater_count = data.widest_release;

        // Opening theaters might be first mentioned
        if (counts.length > 1) {
          data.opening_theaters = counts[0];
        }
      }
    }

    // Alternative: Look for "Widest Release" specifically
    const widestMatch = html.match(/Widest Release[^0-9]*([\d,]+)/i);
    if (widestMatch) {
      data.widest_release = parseNumber(widestMatch[1]);
      if (data.theater_count === 0) {
        data.theater_count = data.widest_release;
      }
    }

    return data;
  } catch (error) {
    console.error(`Error scraping BOM for ${imdbId}:`, error);
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
