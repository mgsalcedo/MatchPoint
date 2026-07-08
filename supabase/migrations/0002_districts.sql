-- MatchPoint — migration 0002: districts (step 3) + Lima Metropolitana / Callao reference seed.
-- District names/provinces are public geographic facts (no PII), so this reference seed ships
-- inside the migration (research.md R7) — it is not the gated org seed.

create table districts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  province text not null,
  region text not null default 'Lima',
  latitude numeric,
  longitude numeric,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(name, province)
);

-- Lima Metropolitana (province 'Lima').
insert into districts (name, province, region) values
  ('Miraflores', 'Lima', 'Lima'),
  ('San Isidro', 'Lima', 'Lima'),
  ('Barranco', 'Lima', 'Lima'),
  ('Santiago de Surco', 'Lima', 'Lima'),
  ('San Borja', 'Lima', 'Lima'),
  ('La Molina', 'Lima', 'Lima'),
  ('San Miguel', 'Lima', 'Lima'),
  ('Magdalena del Mar', 'Lima', 'Lima'),
  ('Jesús María', 'Lima', 'Lima'),
  ('Lince', 'Lima', 'Lima'),
  ('Pueblo Libre', 'Lima', 'Lima'),
  ('Surquillo', 'Lima', 'Lima'),
  ('Chorrillos', 'Lima', 'Lima'),
  ('San Juan de Miraflores', 'Lima', 'Lima'),
  ('La Victoria', 'Lima', 'Lima'),
  ('Lima', 'Lima', 'Lima'),
  ('Ate', 'Lima', 'Lima'),
  ('Los Olivos', 'Lima', 'Lima'),
  ('Comas', 'Lima', 'Lima'),
  ('Independencia', 'Lima', 'Lima'),
  ('San Juan de Lurigancho', 'Lima', 'Lima'),
  ('Villa María del Triunfo', 'Lima', 'Lima'),
  ('Villa El Salvador', 'Lima', 'Lima')
on conflict (name, province) do nothing;

-- Callao province.
insert into districts (name, province, region) values
  ('Callao', 'Callao', 'Callao'),
  ('Bellavista', 'Callao', 'Callao'),
  ('La Perla', 'Callao', 'Callao'),
  ('La Punta', 'Callao', 'Callao'),
  ('Carmen de la Legua Reynoso', 'Callao', 'Callao'),
  ('Ventanilla', 'Callao', 'Callao')
on conflict (name, province) do nothing;
