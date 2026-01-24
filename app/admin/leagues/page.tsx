'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Users, Search, Loader2, ChevronDown, ChevronUp } from 'lucide-react';

interface League {
  id: string;
  name: string;
  slug: string | null;
  season_year: number;
  created_at: string;
  commissioner_user_id: string;
  teams: {
    id: string;
    name: string;
  }[];
}

export default function AdminLeaguesPage() {
  const supabase = createClient();
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedLeagueId, setExpandedLeagueId] = useState<string | null>(null);

  useEffect(() => {
    loadLeagues();
  }, []);

  async function loadLeagues() {
    setLoading(true);

    const { data } = await supabase
      .from('leagues')
      .select(`
        id,
        name,
        slug,
        season_year,
        created_at,
        commissioner_user_id,
        teams(id, name)
      `)
      .order('created_at', { ascending: false });

    setLeagues((data as League[]) || []);
    setLoading(false);
  }

  const filteredLeagues = leagues.filter((league) =>
    league.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 text-purple-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">League Management</h1>
        <p className="text-gray-600 mt-1">View and manage all leagues on the platform</p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input pl-10 w-full"
          placeholder="Search leagues..."
        />
      </div>

      {/* Leagues List */}
      <div className="space-y-4">
        {filteredLeagues.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              <Trophy className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No leagues found</p>
            </CardContent>
          </Card>
        ) : (
          filteredLeagues.map((league) => (
            <Card key={league.id}>
              <CardHeader
                className="cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() =>
                  setExpandedLeagueId(expandedLeagueId === league.id ? null : league.id)
                }
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Trophy className="h-6 w-6 text-purple-600" />
                    <div>
                      <CardTitle className="text-lg">{league.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="gray">{league.season_year}</Badge>
                        {league.slug && (
                          <Badge variant="default">ID: {league.slug}</Badge>
                        )}
                        <span className="text-sm text-gray-500">
                          {league.teams?.length || 0} teams
                        </span>
                      </div>
                    </div>
                  </div>
                  {expandedLeagueId === league.id ? (
                    <ChevronUp className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  )}
                </div>
              </CardHeader>
              {expandedLeagueId === league.id && (
                <CardContent className="border-t border-gray-100">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Teams in this League
                      </h4>
                      {league.teams && league.teams.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {league.teams.map((team) => (
                            <div
                              key={team.id}
                              className="p-2 bg-gray-50 rounded text-sm"
                            >
                              {team.name}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm">No teams yet</p>
                      )}
                    </div>
                    <div className="pt-4 border-t border-gray-100 text-sm text-gray-500">
                      <p>League ID: <code className="bg-gray-100 px-1 rounded">{league.id}</code></p>
                      <p>Created: {new Date(league.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
