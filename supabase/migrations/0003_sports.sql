-- MatchPoint — migration 0003: sports (step 4) + the 6 PMV sports reference seed.
-- Reference data, no PII — ships inside the migration (research.md R7).

create table sports (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into sports (name, slug) values
  ('Running', 'running'),
  ('Trail Running', 'trail-running'),
  ('Ciclismo', 'ciclismo'),
  ('Natación', 'natacion'),
  ('Triatlón', 'triatlon'),
  ('Centro de Entrenamiento', 'centro-entrenamiento')
on conflict (slug) do nothing;
