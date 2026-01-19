-- Add release_type column to movies table
-- Values: 'wide', 'limited', 'streaming', 'unknown'

alter table movies
add column if not exists release_type text default 'unknown';

-- Add check constraint for valid values
alter table movies
add constraint movies_release_type_check
check (release_type in ('wide', 'limited', 'streaming', 'unknown'));

-- Create index for filtering by release type
create index if not exists idx_movies_release_type on movies(release_type);
