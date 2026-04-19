/**
 * Alternative scraper for Box Office Mojo
 * Uses yearly stats page which has theater counts in static HTML
 * Falls back to The Numbers and OMDB for additional data
 */

export interface BrowserScrapeResult {
  domestic_box_office: number;
  theater_count: number;
  opening_weekend: number | null;
  opening_theaters: number | null;
  widest_release: number | null;
  release_scale: 'wide' | 'limited' | null;
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
 * Normalize a movie title for comparison
 */
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/**
 * Scrape BOM Release Schedule page to get actual release scale (Wide/Limited)
 * URL: https://www.boxofficemojo.com/release-schedule/?year=2026&month=01
 */
async function scrapeBOMReleaseSchedule(title: string, year: number, month: number): Promise<'wide' | 'limited' | null> {
  const normalizedTitle = normalizeTitle(title);
  const monthStr = String(month).padStart(2, '0');
  const url = `https://www.boxofficemojo.com/release-schedule/?year=${year}&month=${monthStr}`;

  console.log(`Fetching BOM release schedule: ${url}`);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (!response.ok) {
      console.log(`BOM release schedule returned ${response.status}`);
      return null;
    }

    const html = await response.text();
    console.log(`BOM release schedule HTML length: ${html.length}`);

    // The release schedule page has rows with movie titles and "Wide" or "Limited" labels
    // Split into table rows
    const rows = html.split(/<tr[^>]*>/i);

    for (const row of rows) {
      // Check if this row contains our movie title
      const titleMatch = row.match(/<a[^>]*href="\/release\/[^"]*"[^>]*>([^<]+)<\/a>/i);
      if (!titleMatch) continue;

      const rowTitle = normalizeTitle(titleMatch[1]);

      // Check if titles match (allow partial match for longer titles)
      if (rowTitle.includes(normalizedTitle) || normalizedTitle.includes(rowTitle)) {
        console.log(`Found movie in release schedule: "${titleMatch[1]}" (looking for "${title}")`);

        // Look for "Wide" or "Limited" in the same row
        if (/>\s*Wide\s*</i.test(row)) {
          console.log(`Release scale from BOM schedule: Wide`);
          return 'wide';
        } else if (/>\s*Limited\s*</i.test(row)) {
          console.log(`Release scale from BOM schedule: Limited`);
          return 'limited';
        }
      }
    }

    console.log(`Movie "${title}" not found in release schedule for ${year}-${monthStr}`);
    return null;
  } catch (error) {
    console.error(`Error scraping BOM release schedule:`, error);
    return null;
  }
}

/**
 * Scrape BOM yearly stats page for theater counts
 * The yearly page has all movies with theater counts in static HTML!
 * URL: https://www.boxofficemojo.com/year/{year}/
 */
async function scrapeBOMYearlyChart(title: string, year: number): Promise<{ theaters: number | null; boxOffice: number | null }> {
  const normalizedTitle = normalizeTitle(title);
  const url = `https://www.boxofficemojo.com/year/${year}/`;

  console.log(`Fetching BOM yearly chart: ${url}`);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (!response.ok) {
      console.log(`BOM yearly chart returned ${response.status}`);
      return { theaters: null, boxOffice: null };
    }

    const html = await response.text();
    console.log(`BOM yearly chart HTML length: ${html.length}`);

    // Split into table rows
    const rows = html.split(/<tr[^>]*>/i);

    for (const row of rows) {
      // Check if this row contains our movie title
      // BOM yearly page uses /release/ links for movie titles
      const titleMatch = row.match(/<a[^>]*href="\/release\/[^"]*"[^>]*>([^<]+)<\/a>/i);
      if (!titleMatch) continue;

      const rowTitle = normalizeTitle(titleMatch[1]);

      // Check if titles match (allow partial match for longer titles)
      if (rowTitle.includes(normalizedTitle) || normalizedTitle.includes(rowTitle)) {
        console.log(`Found movie in yearly chart: "${titleMatch[1]}" (looking for "${title}")`);

        // The yearly chart has columns: Rank, Release, Gross, Theaters, Total Gross, Release Date, Distributor
        // Extract all cell contents from this row
        const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi);

        if (cells) {
          let theaters = 0;
          let boxOffice = 0;
          let foundFirstGross = false;

          for (let i = 0; i < cells.length; i++) {
            // Remove HTML tags to get cell content
            const content = cells[i].replace(/<[^>]*>/g, '').trim();

            // Check for dollar amount (Gross column)
            if (content.startsWith('$')) {
              const amount = parseMoney(content);
              if (amount > boxOffice) {
                boxOffice = amount;
              }
              foundFirstGross = true;
            }
            // Check for theater count - must be after first gross column to avoid picking up rank
            // Theater count is between 1-5000 (allowing limited releases with few theaters)
            else if (foundFirstGross && /^[\d,]+$/.test(content)) {
              const num = parseNumber(content);
              if (num >= 1 && num <= 5000 && theaters === 0) {
                console.log(`Found theater count in yearly chart: ${num}`);
                theaters = num;
              }
            }
          }

          if (theaters > 0) {
            console.log(`BOM yearly chart found theaters: ${theaters}, box office: ${boxOffice}`);
            return { theaters, boxOffice: boxOffice > 0 ? boxOffice : null };
          }
        }
      }
    }

    console.log(`Movie "${title}" not found in yearly chart for ${year}`);
    return { theaters: null, boxOffice: null };
  } catch (error) {
    console.error(`Error scraping BOM yearly chart:`, error);
    return { theaters: null, boxOffice: null };
  }
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
      // Allow limited releases with as few as 1 theater
      if (num >= 1 && num < 10000) {
        theaters = num;
        console.log(`The Numbers found theaters: ${theaters}`);
      }
    }

    // Also try "Maximum Theaters" or "Widest Release"
    const maxTheatersMatch = html.match(/(?:Maximum|Widest)[^<]*<[^>]*>([\d,]+)/i);
    if (maxTheatersMatch && !theaters) {
      const num = parseNumber(maxTheatersMatch[1]);
      // Allow limited releases with as few as 1 theater
      if (num >= 1 && num < 10000) {
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
      release_scale: null,
    };

    // Extract domestic box office from BOM's performance summary table.
    // We anchor on the "(xx.x%)" marker so we only pick up the summary cell
    // (never a tab label, nav link, or the international/worldwide gross).
    const domesticMatch = html.match(/DOMESTIC[^$(]{0,200}?\(\s*[\d.]+\s*%\s*\)[^$]*?\$([\d,]+)/i);
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
      // Allow limited releases with as few as 1 theater
      const counts = allTheaterMatches.map(m => {
        const numMatch = m.match(/([\d,]+)/);
        return numMatch ? parseNumber(numMatch[1]) : 0;
      }).filter(n => n >= 1 && n < 10000);

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
 * releaseDate should be in YYYY-MM-DD format for best results
 */
export async function scrapeBoxOfficeMojoBrowser(
  imdbId: string,
  title?: string,
  year?: number,
  releaseDate?: string,
  month?: number
): Promise<BrowserScrapeResult | null> {
  console.log(`Starting enhanced scrape for ${imdbId} (${title} ${year}, month: ${month}, release: ${releaseDate})`);

  const result: BrowserScrapeResult = {
    domestic_box_office: 0,
    theater_count: 0,
    opening_weekend: null,
    opening_theaters: null,
    widest_release: null,
    release_scale: null,
  };

  // 0. Get release scale from BOM release schedule (most authoritative source)
  if (title && year && month) {
    console.log('Trying BOM release schedule for release scale...');
    const releaseScale = await scrapeBOMReleaseSchedule(title, year, month);
    if (releaseScale) {
      result.release_scale = releaseScale;
      console.log(`Got release scale from BOM schedule: ${releaseScale}`);
    }
  }

  // 1. Get box office data from the movie's title page (this works with static HTML)
  const bomResult = await scrapeBOMEnhanced(imdbId);
  if (bomResult) {
    result.domestic_box_office = bomResult.domestic_box_office;
    result.opening_weekend = bomResult.opening_weekend;
  }

  // 2. Get theater counts from the yearly stats page (static HTML!)
  // Much simpler than daily pages - one request gets all movies for the year.
  // BOM's /year/YYYY/ page is the domestic chart, so its gross columns are
  // also domestic - safe to use as a fallback when the title page didn't
  // expose a "Domestic (xx.x%)" summary row.
  if (title && year) {
    console.log('Trying BOM yearly chart for theater counts...');
    const yearlyData = await scrapeBOMYearlyChart(title, year);
    if (yearlyData.theaters) {
      result.theater_count = yearlyData.theaters;
      result.widest_release = yearlyData.theaters;
      console.log(`Got theaters from BOM yearly chart: ${yearlyData.theaters}`);
    }
    if (!result.domestic_box_office && yearlyData.boxOffice) {
      result.domestic_box_office = yearlyData.boxOffice;
      console.log(`Got domestic box office from BOM yearly chart: $${yearlyData.boxOffice}`);
    }
  }

  // 3. Fallback: Try The Numbers for theater data
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

  // 4. Fallback: Try OMDB for box office
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
