// EFS Movie League Constants

// Budget
export const STARTING_BUDGET = 1000;
export const MIN_BID = 0;

// Season
export const SEASON_START_MONTH = 4; // April
export const SEASON_END_MONTH = 1; // January (next year)
export const TOTAL_AUCTION_MONTHS = 10;

// Auction
export const MOVIES_WON_PER_AUCTION = 2;
export const AUCTION_OPEN_DAYS = 7;

// Scoring
export const MIN_THEATERS_FOR_BOX_OFFICE = 5;
export const MAX_BOX_OFFICE_COMPONENT = 15;

// Score Tiers
export const SCORE_TIERS = {
  gold: 15,
  purple: 10,
  white: 5,
  gray: 0,
} as const;

// League
export const MAX_TEAMS_PER_LEAGUE = 12;

// API
export const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';
export const TMDB_POSTER_SIZE = 'w500';
export const TMDB_BACKDROP_SIZE = 'w1280';

// Routes
export const ROUTES = {
  home: '/',
  login: '/login',
  signup: '/signup',
  forgotPassword: '/forgot-password',
  standings: '/standings',
  movies: '/movies',
  teams: '/teams',
  auction: '/auction',
  schedule: '/schedule',
  settings: '/settings',
  admin: '/admin',
} as const;

// Colors (for reference in components)
export const COLORS = {
  purple: {
    50: '#faf5ff',
    100: '#f3e8ff',
    200: '#e9d5ff',
    300: '#d8b4fe',
    400: '#c084fc',
    500: '#a855f7',
    600: '#9333ea',
    700: '#7c3aed',
    800: '#6b21a8',
    900: '#581c87',
  },
  gold: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },
} as const;
