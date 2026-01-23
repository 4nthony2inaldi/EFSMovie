import type { ScoreBreakdown, LeagueScoringSettings } from '@/types';
import { MIN_THEATERS_FOR_BOX_OFFICE, MAX_BOX_OFFICE_COMPONENT } from '@/lib/constants';

export interface MovieStats {
  domesticBoxOffice: number;
  theaterCount: number;
  metacriticScore: number | null;
  oscarNominations: number;
  oscarWins: number;
  bestPictureNominated: boolean;
  bestPictureWon: boolean;
}

// Extended score breakdown with league-specific info
export interface ScoreBreakdownWithSettings extends ScoreBreakdown {
  minTheatersRequired: number;
  maxBoxOfficeComponent: number | null;
}

/**
 * Calculate the full score breakdown for a movie
 *
 * Formula:
 * - Base Score = [Box Office per Theater] × [Rating] ÷ 1000
 * - BO/Theater capped at league setting (default $15k, null = no cap)
 * - Requires league's min theaters to earn box office points (default 5)
 * - Floor Rule: Until BO/Theater surpasses rating, score = rating alone
 * - Oscar Points: +0.5 per nom, +1.0 per win
 * - Best Picture nom: doubled (+1.0 total instead of +0.5)
 * - Best Picture win: doubled (+2.0 total instead of +1.0)
 *
 * @param stats - Movie statistics
 * @param leagueSettings - Optional league-specific scoring settings
 */
export function calculateMovieScore(
  stats: MovieStats,
  leagueSettings?: LeagueScoringSettings
): ScoreBreakdownWithSettings {
  const {
    domesticBoxOffice,
    theaterCount,
    metacriticScore,
    oscarNominations,
    oscarWins,
    bestPictureNominated,
    bestPictureWon,
  } = stats;

  // Use league settings or defaults
  const minTheaters = leagueSettings?.minTheaters ?? MIN_THEATERS_FOR_BOX_OFFICE;
  const maxBOComponent = leagueSettings?.maxBoxOfficePerTheater ?? MAX_BOX_OFFICE_COMPONENT;

  // Metacritic is stored as decimal (0.85 for 85%)
  const metacriticDecimal = metacriticScore ?? 0;
  // Keep 0-100 scale for display purposes
  const metacriticDisplay = metacriticDecimal * 100;

  // Box office component (must meet minimum theaters)
  let boxOfficeComponent = 0;
  if (theaterCount >= minTheaters) {
    const rawBOComponent = (domesticBoxOffice / theaterCount) / 1000;
    // Apply cap if set (null = no cap)
    boxOfficeComponent = maxBOComponent !== null
      ? Math.min(rawBOComponent, maxBOComponent)
      : rawBOComponent;
  }

  // Raw base score (using decimal metacritic as multiplier)
  const rawBaseScore = boxOfficeComponent * metacriticDecimal;

  // Floor rule: minimum is metacritic score (as decimal)
  const floorApplied = rawBaseScore < metacriticDecimal;
  const baseScore = floorApplied ? metacriticDecimal : rawBaseScore;

  // Oscar points
  const oscarNomPoints = oscarNominations * 0.5;
  const oscarWinPoints = oscarWins * 1.0;
  const bestPictureNomBonus = bestPictureNominated ? 0.5 : 0;
  const bestPictureWinBonus = bestPictureWon ? 1.0 : 0;
  const totalOscarPoints = oscarNomPoints + oscarWinPoints + bestPictureNomBonus + bestPictureWinBonus;

  // Final score
  const finalScore = Math.round((baseScore + totalOscarPoints) * 100) / 100;

  return {
    boxOfficeComponent: Math.round(boxOfficeComponent * 1000) / 1000,
    metacriticScore: metacriticDisplay,
    rawBaseScore: Math.round(rawBaseScore * 100) / 100,
    floorApplied,
    baseScore: Math.round(baseScore * 100) / 100,
    oscarNomPoints,
    oscarWinPoints,
    bestPictureNomBonus,
    bestPictureWinBonus,
    totalOscarPoints,
    finalScore,
    minTheatersRequired: minTheaters,
    maxBoxOfficeComponent: maxBOComponent,
  };
}

/**
 * Simple version that just returns the final score
 */
export function getMovieScore(stats: MovieStats, leagueSettings?: LeagueScoringSettings): number {
  return calculateMovieScore(stats, leagueSettings).finalScore;
}

/**
 * Format score for display
 */
export function formatScore(score: number | null | undefined): string {
  if (score == null) return '0.00';
  return score.toFixed(2);
}

/**
 * Format box office for display
 */
export function formatBoxOffice(amount: number | null | undefined): string {
  if (amount == null || amount === 0) return '-';
  if (amount >= 1_000_000_000) {
    return `$${(amount / 1_000_000_000).toFixed(2)}B`;
  }
  if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (amount >= 1_000) {
    return `$${(amount / 1_000).toFixed(1)}K`;
  }
  return `$${amount.toFixed(0)}`;
}

/**
 * Format theater count for display
 */
export function formatTheaters(count: number | null | undefined): string {
  if (count == null) return '-';
  return count.toLocaleString();
}

/**
 * Format metacritic score for display (stored as decimal, displayed as percentage)
 * e.g., 0.85 -> "85%"
 */
export function formatMetacritic(score: number | null | undefined): string {
  if (score == null || score === 0) return '-';
  return `${Math.round(score * 100)}%`;
}
