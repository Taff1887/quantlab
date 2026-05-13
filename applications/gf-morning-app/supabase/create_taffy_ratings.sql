-- Run this in your Supabase dashboard → SQL editor
-- Creates the taffy_ratings table used by the "How is Taffy doing?" card

create table if not exists taffy_ratings (
  id          text        primary key,
  date        date        not null unique,
  rating      smallint    not null check (rating >= 1 and rating <= 10),
  feedback    text        not null default '',
  created_at  timestamptz not null default now()
);

-- Row-level security (open access — no auth required for this app)
alter table taffy_ratings enable row level security;

create policy "Allow all operations"
  on taffy_ratings
  for all
  using (true)
  with check (true);
