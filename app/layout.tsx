import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Fantasy Movie League',
  description: 'Fantasy movie league where teams compete by bidding on movies and scoring based on box office, ratings, and Oscar recognition.',
  keywords: ['fantasy', 'movies', 'league', 'box office', 'oscars', 'auction'],
  metadataBase: new URL('https://fmovieleague.com'),
  openGraph: {
    title: 'Fantasy Movie League',
    description: 'Fantasy movie league where teams compete by bidding on movies and scoring based on box office, ratings, and Oscar recognition.',
    url: 'https://fmovieleague.com',
    siteName: 'Fantasy Movie League',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Fantasy Movie League',
    description: 'Fantasy movie league where teams compete by bidding on movies and scoring based on box office, ratings, and Oscar recognition.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}
