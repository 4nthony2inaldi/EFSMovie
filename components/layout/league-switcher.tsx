'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronDown, Check, Plus, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLeague, TeamWithLeague } from '@/contexts/league-context';

export function LeagueSwitcher() {
  const { teams, currentTeam, switchTeam } = useLeague();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown on escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  if (!currentTeam) return null;

  const hasMultipleTeams = teams.length > 1;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-3 w-full p-3 bg-purple-800/50 rounded-lg transition-colors text-left',
          hasMultipleTeams ? 'hover:bg-purple-800 cursor-pointer' : 'cursor-default'
        )}
      >
        <div className="w-10 h-10 rounded-full bg-gold-500 flex items-center justify-center overflow-hidden flex-shrink-0">
          {currentTeam.photo_url ? (
            <img
              src={currentTeam.photo_url}
              alt={currentTeam.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-gold-900 font-bold text-sm">
              {currentTeam.name.slice(0, 2).toUpperCase()}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{currentTeam.name}</p>
          <p className="text-purple-300 text-sm truncate">
            {currentTeam.league?.name || 'League'}
          </p>
        </div>
        {hasMultipleTeams && (
          <ChevronDown
            className={cn(
              'h-4 w-4 text-purple-400 transition-transform flex-shrink-0',
              isOpen && 'rotate-180'
            )}
          />
        )}
      </button>

      {/* Dropdown */}
      {isOpen && hasMultipleTeams && (
        <div className="absolute left-0 right-0 mt-2 bg-purple-800 rounded-lg shadow-xl border border-purple-700 overflow-hidden z-50">
          <div className="py-1">
            <div className="px-3 py-2 text-xs font-semibold text-purple-400 uppercase tracking-wider">
              Your Teams
            </div>
            {teams.map((team) => (
              <TeamOption
                key={team.id}
                team={team}
                isSelected={team.id === currentTeam.id}
                onSelect={() => {
                  if (team.id !== currentTeam.id) {
                    switchTeam(team.id);
                  }
                  setIsOpen(false);
                }}
              />
            ))}
          </div>

          {/* Divider */}
          <div className="border-t border-purple-700" />

          {/* Add League Option */}
          <div className="py-1">
            <Link
              href="/leagues/join"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 text-purple-300 hover:bg-purple-700 hover:text-white transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-purple-700 flex items-center justify-center">
                <Plus className="h-4 w-4" />
              </div>
              <span className="text-sm">Join or Create League</span>
            </Link>
          </div>
        </div>
      )}

      {/* Single team - link to settings */}
      {!hasMultipleTeams && (
        <Link
          href="/leagues/join"
          className="flex items-center gap-2 mt-2 px-3 py-2 text-purple-300 hover:text-white text-sm transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Join or Create League</span>
        </Link>
      )}
    </div>
  );
}

function TeamOption({
  team,
  isSelected,
  onSelect,
}: {
  team: TeamWithLeague;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        'flex items-center gap-3 w-full px-3 py-2.5 text-left transition-colors',
        isSelected
          ? 'bg-purple-700 text-white'
          : 'text-purple-200 hover:bg-purple-700 hover:text-white'
      )}
    >
      <div className="w-8 h-8 rounded-full bg-gold-500 flex items-center justify-center overflow-hidden flex-shrink-0">
        {team.photo_url ? (
          <img
            src={team.photo_url}
            alt={team.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-gold-900 font-bold text-xs">
            {team.name.slice(0, 2).toUpperCase()}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-medium truncate">{team.name}</span>
          {team.is_commissioner && (
            <span title="Commissioner">
              <Shield className="h-3.5 w-3.5 text-gold-400 flex-shrink-0" />
            </span>
          )}
        </div>
        <p className="text-xs text-purple-400 truncate">
          {team.league?.name}
        </p>
      </div>
      {isSelected && (
        <Check className="h-4 w-4 text-gold-400 flex-shrink-0" />
      )}
    </button>
  );
}
