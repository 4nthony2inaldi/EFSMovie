// Database types for Fantasy Movie League

export interface League {
  id: string;
  slug: string | null;
  name: string;
  season_year: number;
  season_end_month: number;
  season_end_year: number;
  status: 'active' | 'completed' | 'frozen';
  scores_frozen_at: string | null;
  created_at: string;
  updated_at: string;
  // Scoring settings
  movies_per_auction: number;
  min_theaters_for_scoring: number;
  max_box_office_per_theater: number | null;
}

// League scoring settings for score calculations
export interface LeagueScoringSettings {
  minTheaters: number;
  maxBoxOfficePerTheater: number | null;
}

export interface Team {
  id: string;
  league_id: string;
  user_id: string;
  name: string;
  photo_url: string | null;
  budget_remaining: number;
  created_at: string;
  updated_at: string;
}

export type ReleaseType = 'wide' | 'limited' | 'streaming' | 'unknown';

export interface Movie {
  id: string;
  title: string;
  release_date: string | null;
  release_month: number;
  release_year: number;
  release_type: ReleaseType;
  tmdb_id: number | null;
  imdb_id: string | null;
  poster_url: string | null;
  backdrop_url: string | null;
  genre: string | null;
  runtime_minutes: number | null;
  director: string | null;
  cast_list: string[] | null;
  synopsis: string | null;
  trailer_url: string | null;
  production_companies: string[] | null;
  domestic_box_office: number;
  theater_count: number;
  metacritic_score: number | null;
  rotten_tomatoes_score: number | null;
  oscar_nominations: number;
  oscar_wins: number;
  best_picture_nominated: boolean;
  best_picture_won: boolean;
  calculated_score: number;
  created_at: string;
  updated_at: string;
}

export interface Auction {
  id: string;
  league_id: string;
  for_month: number;
  for_year: number;
  opens_at: string;
  closes_at: string;
  status: 'upcoming' | 'open' | 'closed' | 'resolved';
  created_at: string;
  updated_at: string;
}

export interface AuctionMovie {
  id: string;
  auction_id: string;
  movie_id: string;
  added_by_team_id: string | null; // NULL = commissioner added, otherwise user-added
  created_at: string;
}

export interface Bid {
  id: string;
  auction_id: string;
  team_id: string;
  movie_id: string;
  amount: number;
  priority: number | null; // User-defined priority (lower = higher priority), null = default (by amount)
  submitted_at: string;
  updated_at: string;
}

export interface TeamMovie {
  id: string;
  team_id: string;
  movie_id: string;
  auction_id: string | null;
  winning_bid: number;
  acquired_at: string;
}

export interface StandingsSnapshot {
  id: string;
  auction_id: string;
  team_id: string;
  rank: number;
  total_points: number;
  random_tiebreaker: number;
  created_at: string;
}

export interface NotificationLog {
  id: string;
  user_id: string;
  notification_type: string;
  reference_id: string | null;
  sent_at: string;
}

export interface MovieInterest {
  id: string;
  user_id: string;
  movie_id: string;
  created_at: string;
}

// Extended types with relations
export interface TeamWithMovies extends Team {
  movies: (TeamMovie & { movie: Movie })[];
  total_points: number;
}

export interface AuctionWithMovies extends Auction {
  auction_movies: (AuctionMovie & { movie: Movie })[];
}

export interface BidWithDetails extends Bid {
  movie: Movie;
  team: Team;
}

// Standings type returned from database function
export interface TeamStanding {
  team_id: string;
  team_name: string;
  photo_url: string | null;
  total_points: number;
  points_back: number;
  budget_remaining: number;
  movies_owned: number;
  total_box_office: number;
  avg_theaters: number;
  avg_rating: number;
  oscar_points: number;
  rank: number;
}

// Score breakdown for display
export interface ScoreBreakdown {
  boxOfficeComponent: number;
  metacriticScore: number;
  rawBaseScore: number;
  floorApplied: boolean;
  baseScore: number;
  oscarNomPoints: number;
  oscarWinPoints: number;
  bestPictureNomBonus: number;
  bestPictureWinBonus: number;
  totalOscarPoints: number;
  finalScore: number;
}

// Auction results
export interface AuctionResult {
  movie: Movie;
  winner: Team | null;
  winning_bid: number;
  your_bid: number | null;
  status: 'won' | 'outbid' | 'unowned' | 'no_bid';
}

// User profile
export interface UserProfile {
  id: string;
  email: string;
  team: Team | null;
  league: League | null;
}

// Month names helper
export const MONTH_NAMES = [
  '',
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

// Score tier helper
export type ScoreTier = 'gold' | 'purple' | 'white' | 'gray';

export function getScoreTier(score: number): ScoreTier {
  if (score >= 15) return 'gold';
  if (score >= 10) return 'purple';
  if (score >= 5) return 'white';
  return 'gray';
}
