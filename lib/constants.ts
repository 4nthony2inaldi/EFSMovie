// Fantasy Movie League Constants

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

// Oscar-Caliber Studios
// Studios with significant history of Oscar nominations/wins
// Used to filter TMDB imports to movies with major studio backing
export const OSCAR_CALIBER_STUDIOS = [
  // Independent / Specialty (frequent Oscar contenders)
  'A24',
  'Searchlight Pictures',
  'Fox Searchlight Pictures',
  'Focus Features',
  'Neon',
  'Annapurna Pictures',
  'Plan B Entertainment',
  'Participant',
  'Bleecker Street',
  'Roadside Attractions',
  'IFC Films',
  'Magnolia Pictures',
  'The Weinstein Company',
  'Miramax',
  'Miramax Films',

  // Streaming Studios
  'Netflix',
  'Amazon Studios',
  'Amazon MGM Studios',
  'Apple Studios',
  'Apple Original Films',
  'Max',
  'HBO Films',
  'Hulu',

  // Major Studios
  'Universal Pictures',
  'Warner Bros. Pictures',
  'Warner Bros.',
  'Paramount Pictures',
  'Walt Disney Pictures',
  'Walt Disney Studios',
  'Disney',
  'Sony Pictures',
  'Columbia Pictures',
  'TriStar Pictures',
  '20th Century Studios',
  '20th Century Fox',
  'Twentieth Century Fox',
  'Lionsgate',
  'Lionsgate Films',
  'Metro-Goldwyn-Mayer',
  'MGM',
  'New Line Cinema',
  'DreamWorks Pictures',
  'DreamWorks',
  'DreamWorks Animation',
  'Amblin Entertainment',

  // International (Oscar history)
  'StudioCanal',
  'Studio Canal',
  'Pathé',
  'Gaumont',
  'Film4 Productions',
  'Film4',
  'BBC Film',
  'Working Title Films',
  'Legendary Pictures',
  'Legendary Entertainment',
  'Lakeshore Entertainment',
  'Village Roadshow Pictures',
  'Regency Enterprises',
  'New Regency',
  'New Regency Productions',

  // Production Companies (frequent Oscar nominees)
  'Blumhouse Productions',
  'Bad Robot Productions',
  'Scott Free Productions',
  'Imagine Entertainment',
  'Skydance Media',
  'Skydance',
  'Chernin Entertainment',
  'TSG Entertainment',
  'Syncopy',
  'Heyday Films',
  'Bron Studios',
  'BRON Studios',
  'Killer Films',
  'Big Beach',
  'FilmNation Entertainment',
] as const;

// Helper to check if a movie has Oscar-caliber studio backing
export function hasOscarCaliberStudio(productionCompanies: string[] | null | undefined): boolean {
  if (!productionCompanies || productionCompanies.length === 0) return false;
  return productionCompanies.some(company =>
    OSCAR_CALIBER_STUDIOS.some(studio =>
      company.toLowerCase().includes(studio.toLowerCase()) ||
      studio.toLowerCase().includes(company.toLowerCase())
    )
  );
}

// Major Studios - Tighter filter for major theatrical distributors only
// These are the studios most likely to have wide theatrical releases
export const MAJOR_STUDIOS = [
  // Big Six / Major Studios
  'Universal Pictures',
  'Warner Bros. Pictures',
  'Warner Bros.',
  'Paramount Pictures',
  'Walt Disney Pictures',
  'Walt Disney Studios',
  'Disney',
  'Sony Pictures',
  'Columbia Pictures',
  '20th Century Studios',
  '20th Century Fox',
  'Lionsgate',
  'Lionsgate Films',
  'Metro-Goldwyn-Mayer',
  'MGM',

  // Major Specialty/Indie
  'A24',
  'Searchlight Pictures',
  'Fox Searchlight Pictures',
  'Focus Features',
  'Neon',

  // Streaming Giants
  'Netflix',
  'Amazon Studios',
  'Amazon MGM Studios',
  'Apple Studios',
  'Apple Original Films',

  // Other Major Players
  'New Line Cinema',
  'DreamWorks Pictures',
  'DreamWorks',
  'DreamWorks Animation',
  'Pixar',
  'Marvel Studios',
  'Lucasfilm',
  'Amblin Entertainment',
  'Legendary Pictures',
  'Legendary Entertainment',
  'Blumhouse Productions',
] as const;

// Helper to check if a movie has major studio backing
export function hasMajorStudio(productionCompanies: string[] | null | undefined): boolean {
  if (!productionCompanies || productionCompanies.length === 0) return false;
  return productionCompanies.some(company =>
    MAJOR_STUDIOS.some(studio =>
      company.toLowerCase().includes(studio.toLowerCase()) ||
      studio.toLowerCase().includes(company.toLowerCase())
    )
  );
}

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
