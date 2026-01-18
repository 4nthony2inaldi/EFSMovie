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

    // Look for Domestic box office
    // BOM shows: "DOMESTIC (48.1%)" then "$15,000,000" - we need the dollar amount, not the percentage
    // Look for dollar amounts that are at least $100,000 (6+ digits)
    const moneyMatches = html.match(/\$[\d,]+/g);
    if (moneyMatches) {
      // Find the largest dollar amount on the page (likely the total gross)
      const amounts = moneyMatches.map(m => parseMoney(m)).filter(n => n >= 100000);
      if (amounts.length > 0) {
        // The domestic box office is usually one of the larger amounts
        // Sort descending and take a reasonable one (not worldwide which is largest)
        amounts.sort((a, b) => b - a);
        // If we have multiple amounts, domestic is often the 2nd or 3rd largest
        // But for safety, let's look specifically for the domestic section
        const domesticSection = html.match(/DOMESTIC[^$]*\$([\d,]+)/i);
        if (domesticSection) {
          data.domestic_box_office = parseMoney(domesticSection[1]);
        } else if (amounts.length > 0) {
          // Fallback to largest reasonable amount
          data.domestic_box_office = amounts[0];
        }
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

    // Look for theater counts - BOM has table structure with "X,XXX theaters"
    // The most reliable approach is to find all "X,XXX theaters" patterns on the page
    const theaterMatches = html.match(/([\d,]+)\s*theaters?/gi);
    if (theaterMatches) {
      const counts = theaterMatches.map(m => {
        const numMatch = m.match(/([\d,]+)/);
        return numMatch ? parseNumber(numMatch[1]) : 0;
      }).filter(n => n >= 500 && n < 10000); // Filter to reasonable theater counts (500+ for wide release)

      if (counts.length > 0) {
        // Widest release is the largest number
        data.widest_release = Math.max(...counts);
        data.theater_count = data.widest_release;
        // Opening theaters is usually the first mentioned (or smallest)
        data.opening_theaters = counts[0];

        console.log(`Found theater counts: ${counts.join(', ')}, using widest=${data.widest_release}`);
      }
    }

    // Also try to find the opening weekend theaters specifically
    const openingMatch = html.match(/Opening[^]*?([\d,]+)\s*theaters?/i);
    if (openingMatch && !data.opening_theaters) {
      const num = parseNumber(openingMatch[1]);
      if (num >= 500 && num < 10000) {
        data.opening_theaters = num;
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
