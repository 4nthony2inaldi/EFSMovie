import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Film, Trophy, Users, Calendar, TrendingUp, Star } from 'lucide-react';

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect('/standings');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-purple-900">
      {/* Navigation */}
      <nav className="px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Film className="h-8 w-8 text-gold-400" />
            <span className="text-2xl font-bold text-white">EFS Movie League</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-white hover:text-gold-400 transition-colors"
            >
              Log In
            </Link>
            <Link
              href="/signup"
              className="bg-gold-500 text-gold-900 px-4 py-2 rounded-lg font-medium hover:bg-gold-400 transition-colors"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="px-6 py-20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
              Fantasy Movie League
            </h1>
            <p className="text-xl text-purple-200 max-w-2xl mx-auto mb-8">
              Draft movies in silent auctions, compete with friends, and score big based on box office performance, critical ratings, and Oscar recognition.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link
                href="/signup"
                className="bg-gold-500 text-gold-900 px-8 py-3 rounded-lg font-semibold text-lg hover:bg-gold-400 transition-colors"
              >
                Get Started
              </Link>
              <Link
                href="/login"
                className="border border-white text-white px-8 py-3 rounded-lg font-semibold text-lg hover:bg-white/10 transition-colors"
              >
                Log In
              </Link>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Trophy className="h-8 w-8 text-gold-400" />}
              title="Silent Auctions"
              description="Place blind bids on movies each month. Win up to 2 movies per auction and build your roster strategically."
            />
            <FeatureCard
              icon={<TrendingUp className="h-8 w-8 text-gold-400" />}
              title="Real-Time Scoring"
              description="Scores update based on box office performance, theater count, and Metacritic ratings."
            />
            <FeatureCard
              icon={<Star className="h-8 w-8 text-gold-400" />}
              title="Oscar Bonuses"
              description="Earn bonus points for nominations and wins. Best Picture awards are doubled!"
            />
            <FeatureCard
              icon={<Users className="h-8 w-8 text-gold-400" />}
              title="Compete with Friends"
              description="Join a league, draft movies through monthly auctions, and compete for the championship."
            />
            <FeatureCard
              icon={<Calendar className="h-8 w-8 text-gold-400" />}
              title="Season-Long Competition"
              description="Auctions run monthly throughout the season, culminating after the Academy Awards."
            />
            <FeatureCard
              icon={<Film className="h-8 w-8 text-gold-400" />}
              title="Budget Management"
              description="Start with a budget and manage it wisely across all auctions to build the best roster."
            />
          </div>

          {/* Scoring Preview */}
          <div className="mt-20 bg-white/10 backdrop-blur rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">
              How Scoring Works
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-semibold text-gold-400 mb-3">Base Score Formula</h3>
                <div className="bg-purple-900/50 rounded-lg p-4 font-mono text-sm text-purple-100">
                  <p>Box Office Component = min(15, ($/theaters)/1000)</p>
                  <p className="mt-2">Base Score = Box Office Component × Metacritic</p>
                  <p className="mt-2">Floor Rule: If Base &lt; Metacritic, use Metacritic</p>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gold-400 mb-3">Oscar Points</h3>
                <ul className="space-y-2 text-purple-100">
                  <li className="flex items-center gap-2">
                    <span className="text-gold-400">+0.5</span> per nomination
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-gold-400">+1.0</span> per win
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-gold-400">+1.0</span> Best Picture nomination (doubled)
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-gold-400">+2.0</span> Best Picture win (doubled)
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-8 border-t border-purple-700/50">
        <div className="max-w-7xl mx-auto text-center text-purple-300">
          <p>&copy; {new Date().getFullYear()} EFS Movie League. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-white/10 backdrop-blur rounded-xl p-6 hover:bg-white/15 transition-colors">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
      <p className="text-purple-200">{description}</p>
    </div>
  );
}
