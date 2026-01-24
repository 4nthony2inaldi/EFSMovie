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
    // BOM structure: "DOMESTIC (48.1%)" followed by "$15,000,000"
    // OR "DOMESTIC (–)" with "–" below when there's no domestic data
    // We need to be careful not to pick up INTERNATIONAL or WORLDWIDE numbers

    // First check if domestic exists (not just a dash)
    const domesticDashCheck = html.match(/DOMESTIC\s*\([^)]*\)\s*<[^>]*>\s*[\-–—]/i);
    if (domesticDashCheck) {
      // Domestic shows a dash, meaning no domestic box office
      console.log('BOM shows no domestic box office (dash)');
      data.domestic_box_office = 0;
    } else {
      // Look for DOMESTIC with a percentage, then find the dollar amount nearby
      // The pattern should match: DOMESTIC (XX.X%) ... $XXX,XXX
      // But NOT match across INTERNATIONAL section
      const domesticWithPercent = html.match(/DOMESTIC\s*\(\s*[\d.]+%?\s*\)[^I]*?\$([\d,]+)/i);
      if (domesticWithPercent) {
        data.domestic_box_office = parseMoney(domesticWithPercent[1]);
        console.log(`Found domestic box office with percentage: $${data.domestic_box_office}`);
      } else {
        // Alternative: look for domestic in a more structured way
        // Match DOMESTIC followed by dollar amount within 200 chars, before hitting INTERNATIONAL
        const domesticSection = html.match(/DOMESTIC[^I]{0,200}\$([\d,]+)/i);
        if (domesticSection) {
          // Verify this isn't after a dash indicating no data
          const beforeDollar = html.substring(
            html.indexOf('DOMESTIC'),
            html.indexOf(domesticSection[0]) + domesticSection[0].length
          );
          if (!beforeDollar.match(/>\s*[\-–—]\s*</)) {
            data.domestic_box_office = parseMoney(domesticSection[1]);
            console.log(`Found domestic box office (alt pattern): $${data.domestic_box_office}`);
          }
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
    // Try multiple approaches to find theater counts

    // Approach 1: Direct "X,XXX theaters" pattern (handles "3,506 theaters")
    const theaterMatches = html.match(/([\d,]+)\s*theaters?/gi);
    if (theaterMatches) {
      const counts = theaterMatches.map(m => {
        const numMatch = m.match(/([\d,]+)/);
        return numMatch ? parseNumber(numMatch[1]) : 0;
      }).filter(n => n >= 100 && n < 10000); // Lower threshold to 100

      if (counts.length > 0) {
        data.widest_release = Math.max(...counts);
        data.theater_count = data.widest_release;
        data.opening_theaters = counts[0];
        console.log(`Found theater counts (pattern 1): ${counts.join(', ')}, using widest=${data.widest_release}`);
      }
    }

    // Approach 2: Look for "Widest Release" row with number nearby (handles table cells)
    if (!data.theater_count) {
      const widestMatch = html.match(/Widest\s*Release[^>]*>([^<]*<[^>]*>)*([\d,]+)/i);
      if (widestMatch) {
        const num = parseNumber(widestMatch[2] || widestMatch[1]);
        if (num >= 100 && num < 10000) {
          data.widest_release = num;
          data.theater_count = num;
          console.log(`Found theater count (pattern 2 - Widest): ${num}`);
        }
      }
    }

    // Approach 3: Look for 4-digit numbers followed by "theater" anywhere
    if (!data.theater_count) {
      const broadMatch = html.match(/(\d{1},?\d{3})\s*(?:<[^>]*>)*\s*theaters?/gi);
      if (broadMatch) {
        const counts = broadMatch.map(m => {
          const numMatch = m.match(/(\d[\d,]*)/);
          return numMatch ? parseNumber(numMatch[1]) : 0;
        }).filter(n => n >= 100 && n < 10000);

        if (counts.length > 0) {
          data.widest_release = Math.max(...counts);
          data.theater_count = data.widest_release;
          console.log(`Found theater count (pattern 3 - broad): ${counts.join(', ')}`);
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
 * Convert a movie title to a Metacritic URL slug
 * e.g., "28 Years Later: The Bone Temple" -> "28-years-later-the-bone-temple"
 */
function toMetacriticSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[:']/g, '') // Remove colons and apostrophes
    .replace(/&/g, 'and') // Replace & with 'and'
    .replace(/[^a-z0-9\s-]/g, '') // Remove other special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Collapse multiple hyphens
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Result from Metacritic scraping
 */
export interface MetacriticResult {
  score: number | null;  // Score as decimal (0-1)
  source: 'metacritic' | 'user' | null;  // Where the score came from
}

/**
 * Scrape Metacritic score directly from Metacritic website
 * Returns score as decimal (0-1) and the source (metacritic critic score or user score)
 */
export async function scrapeMetacriticScore(imdbId: string, title: string, year?: number): Promise<MetacriticResult> {
  const slug = toMetacriticSlug(title);

  // Build list of URLs to try - Metacritic sometimes appends the year to the slug
  const urlsToTry = [
    `https://www.metacritic.com/movie/${slug}/`,
  ];

  // Add year variants if we have a year
  if (year) {
    urlsToTry.push(`https://www.metacritic.com/movie/${slug}-${year}/`);
    // Also try previous year (release dates can be off by a year)
    urlsToTry.push(`https://www.metacritic.com/movie/${slug}-${year - 1}/`);
  }

  for (const metacriticUrl of urlsToTry) {
    console.log(`Trying Metacritic URL: ${metacriticUrl}`);
    const result = await tryFetchMetacriticScore(metacriticUrl, title);
    if (result.score !== null) {
      return result;
    }
  }

  console.log(`No valid score found on Metacritic for ${title} (tried ${urlsToTry.length} URLs)`);
  return { score: null, source: null };
}

/**
 * Try to fetch and parse Metacritic score from a specific URL
 */
async function tryFetchMetacriticScore(metacriticUrl: string, title: string): Promise<MetacriticResult> {

  try {
    const response = await fetch(metacriticUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Cache-Control': 'no-cache',
      },
    });

    // If 404 or other error, this URL doesn't work - try next one
    if (!response.ok) {
      console.log(`Metacritic fetch failed: ${response.status} for ${metacriticUrl}`);
      return { score: null, source: null };
    }

    const html = await response.text();
    console.log(`Metacritic HTML length: ${html.length} bytes for ${metacriticUrl}`);

    // Try to parse JSON-LD blocks to find aggregateRating
    const jsonLdMatches = html.matchAll(/<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);

    for (const jsonLdMatch of jsonLdMatches) {
      try {
        const jsonText = jsonLdMatch[1].trim();
        const jsonData = JSON.parse(jsonText);

        // Check if this JSON-LD has an aggregateRating
        const rating = jsonData.aggregateRating;
        if (rating && rating.ratingValue !== undefined) {
          const bestRating = rating.bestRating;
          const ratingValue = parseFloat(rating.ratingValue);

          // Critic score uses 0-100 scale (bestRating: 100)
          if (bestRating === 100 && ratingValue >= 1 && ratingValue <= 99) {
            console.log(`Found Metascore ${ratingValue} via JSON-LD parsing for ${title}`);
            return { score: ratingValue / 100, source: 'metacritic' };
          }

          // User score uses 0-10 scale (bestRating: 10)
          if (bestRating === 10 && ratingValue >= 0 && ratingValue <= 10) {
            const convertedScore = Math.round(ratingValue * 10);
            console.log(`Found user score ${ratingValue} (${convertedScore}%) via JSON-LD parsing for ${title}`);
            return { score: convertedScore / 100, source: 'user' };
          }
        }
      } catch (e) {
        // JSON parse failed, continue to next block
        console.log(`Failed to parse JSON-LD block: ${e}`);
      }
    }

    // Fallback: try HTML patterns for critic score
    const metascorePatterns = [
      /c-siteReviewScore[^"]*metascore[^>]*>(\d+)</i,
      /data-metascore="(\d+)"/i,
      />(\d+)<\/span>\s*<\/a>\s*<span[^>]*>Metascore/i,
      /Metascore[^<]*<[^>]*>(\d+)</i,
    ];

    for (const pattern of metascorePatterns) {
      const match = html.match(pattern);
      if (match) {
        const score = parseInt(match[1], 10);
        if (score >= 1 && score <= 99) {
          console.log(`Scraped Metacritic critic score ${score} via HTML pattern for ${title}`);
          return { score: score / 100, source: 'metacritic' };
        }
      }
    }

    // Fallback: try HTML patterns for user score
    const userScorePatterns = [
      /USER\s*SCORE[^>]*>[^<]*<[^>]*>([\d.]+)/i,
      /c-siteReviewScore[^"]*user[^>]*>([\d.]+)</i,
      /data-userscore="([\d.]+)"/i,
    ];

    for (const pattern of userScorePatterns) {
      const match = html.match(pattern);
      if (match) {
        const userScore = parseFloat(match[1]);
        if (userScore >= 0 && userScore <= 10) {
          const convertedScore = Math.round(userScore * 10);
          console.log(`Scraped user score ${userScore} (${convertedScore}%) via HTML pattern for ${title}`);
          return { score: convertedScore / 100, source: 'user' };
        }
      }
    }

    // Page loaded but no score found (tbd or not enough reviews)
    console.log(`Page loaded but no valid score found for ${title}`);
    return { score: null, source: null };
  } catch (error) {
    console.error(`Error fetching ${metacriticUrl}:`, error);
    return { score: null, source: null };
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
