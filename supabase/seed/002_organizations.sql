-- MatchPoint — seed 002: real Lima Metropolitana / Callao sports communities (T020, FR-002/FR-012).
--
-- GATED FILE (FR-012): committed only now that the repository is private (confirmed via GitHub
-- API returning 404 unauthenticated on 2026-07-08). Do not commit this file, or any commit that
-- includes it, while the repository is public.
--
-- Sourcing discipline (BR-016 — never fabricate): every organization, district, contact channel,
-- and schedule value below was found via public web search (see the source noted per org). Where
-- no real schedule was found, no schedule row is inserted for that organization — per FR-005 /
-- research.md R8, schedule is a soft signal ("schedule or availability note"), not a hard
-- eligibility blocker; a later milestone's UI shows "Horario por confirmar" for it. ADN Deportivo™
-- scores are editorially curated from the qualitative research findings (vibe/level descriptions),
-- which docs/data-model.md explicitly allows ("In PMV, ADN can be manually curated") — they are not
-- guessed contact/schedule facts.
--
-- Coverage: all 6 PMV sports (>=1 org each); 2 organizations with a confirmed Callao venue
-- (Club Regatas Unión — La Punta; The Warrior House Gym — La Perla), satisfying FR-002/SC-001.
-- profile_status is 'preloaded' for all (ADR-0005: preload first, claim later).

-- ============================================================================
-- 1. Peru Runners — running — San Isidro / San Borja
-- Source: perurunners.com, elcomercio.pe, running4peru.com
-- ============================================================================
insert into organizations (id, name, slug, organization_type, description, short_description, instagram_url, website_url, profile_status)
values (
  '00000000-0000-0000-0000-000000000001',
  'Peru Runners',
  'peru-runners',
  'running_team',
  'Club de running establecido desde 1984, con entrenamientos estructurados para todos los niveles y organización de carreras propias, incluida la Media Maratón del Callao.',
  'Running desde 1984, todos los niveles',
  'https://instagram.com/perurunners',
  'https://perurunners.com',
  'preloaded'
);

insert into organization_sports (organization_id, sport_id, is_primary)
values ('00000000-0000-0000-0000-000000000001', (select id from sports where slug = 'running'), true);

insert into venues (id, organization_id, name, district_id, is_primary)
values (
  '00000000-0000-0000-0000-0000000000a1',
  '00000000-0000-0000-0000-000000000001',
  'Country Club Hotel',
  (select id from districts where name = 'San Isidro' and province = 'Lima'),
  true
);

insert into schedules (organization_id, venue_id, sport_id, day_of_week, start_time, session_name, level_min, level_max)
values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', (select id from sports where slug = 'running'), 6, '06:15:00', 'Entrenamiento grupal', 'beginner', 'advanced'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', (select id from sports where slug = 'running'), 1, '06:00:00', 'Técnica de running', 'beginner', 'intermediate');

insert into organization_adn (organization_id, beginner_friendly, competitiveness, social_atmosphere, training_intensity_score, performance_focus, inclusiveness, family_friendly, group_size, coach_involvement, event_frequency)
values ('00000000-0000-0000-0000-000000000001', 4, 3, 4, 3, 3, 4, 3, 'large', 4, 4);

-- ============================================================================
-- 2. Amateur Coffee & Run Club — running — Miraflores
-- Source: happycow.net, instagram.com/amateurcafe_pe
-- ============================================================================
insert into organizations (id, name, slug, organization_type, description, short_description, instagram_url, whatsapp_number, profile_status)
values (
  '00000000-0000-0000-0000-000000000002',
  'Amateur Coffee & Run Club',
  'amateur-coffee-run-club',
  'sports_community',
  'Run club social con base en una cafetería pet-friendly en Miraflores, con enfoque comunitario y de bienestar.',
  'Run club social basado en cafetería, Miraflores',
  'https://instagram.com/amateurcafe_pe',
  '51919285448',
  'preloaded'
);

insert into organization_sports (organization_id, sport_id, is_primary)
values ('00000000-0000-0000-0000-000000000002', (select id from sports where slug = 'running'), true);

insert into venues (id, organization_id, name, district_id, address, is_primary)
values (
  '00000000-0000-0000-0000-0000000000a2',
  '00000000-0000-0000-0000-000000000002',
  'Amateur Café',
  (select id from districts where name = 'Miraflores' and province = 'Lima'),
  'Toribio Pacheco 353',
  true
);

-- No confirmed weekly run departure time was found (only the café's general opening hours,
-- Tue-Sun 7am-8pm) — per research.md R8, no schedule row is fabricated; left without one.

insert into organization_adn (organization_id, beginner_friendly, competitiveness, social_atmosphere, training_intensity_score, performance_focus, inclusiveness, family_friendly, group_size, coach_involvement, event_frequency)
values ('00000000-0000-0000-0000-000000000002', 4, 1, 5, 2, 1, 5, 3, 'medium', 1, 3);

-- ============================================================================
-- 3. Perú Trail Series — trail running — La Molina (Parque Ecológico de La Molina)
-- Source: running4peru.com ("Mi Primer Trail" event at Parque Ecológico de La Molina),
--   instagram.com/perutrailseries
-- ============================================================================
insert into organizations (id, name, slug, organization_type, description, short_description, instagram_url, profile_status)
values (
  '00000000-0000-0000-0000-000000000003',
  'Perú Trail Series',
  'peru-trail-series',
  'event_organizer',
  'Circuito de carreras de trail running en Lima, con eventos de iniciación como "Mi Primer Trail" en el Parque Ecológico de La Molina.',
  'Circuito de trail running, incl. eventos para principiantes',
  'https://instagram.com/perutrailseries',
  'preloaded'
);

insert into organization_sports (organization_id, sport_id, is_primary)
values ('00000000-0000-0000-0000-000000000003', (select id from sports where slug = 'trail-running'), true);

insert into venues (id, organization_id, name, district_id, is_primary)
values (
  '00000000-0000-0000-0000-0000000000a3',
  '00000000-0000-0000-0000-000000000003',
  'Parque Ecológico de La Molina',
  (select id from districts where name = 'La Molina' and province = 'Lima'),
  true
);

-- Event-based series, not a fixed weekly training slot — no schedule row fabricated.

insert into organization_adn (organization_id, beginner_friendly, competitiveness, social_atmosphere, training_intensity_score, performance_focus, inclusiveness, family_friendly, group_size, coach_involvement, event_frequency)
values ('00000000-0000-0000-0000-000000000003', 4, 3, 3, 3, 3, 4, 2, 'large', 2, 5);

-- ============================================================================
-- 4. LimaBIKE — ciclismo — San Isidro
-- Source: limabike.com
-- ============================================================================
insert into organizations (id, name, slug, organization_type, description, short_description, instagram_url, website_url, profile_status)
values (
  '00000000-0000-0000-0000-000000000004',
  'LimaBIKE',
  'limabike',
  'cycling_club',
  'Comunidad de ciclismo de ruta activa desde hace 25 años, con salidas gratuitas todos los domingos y tres niveles: principiante, intermedio y avanzado.',
  'Ciclismo de ruta, 25 años, todos los niveles',
  'https://instagram.com/limabikeoficial',
  'https://limabike.com',
  'preloaded'
);

insert into organization_sports (organization_id, sport_id, is_primary)
values ('00000000-0000-0000-0000-000000000004', (select id from sports where slug = 'ciclismo'), true);

insert into venues (id, organization_id, name, district_id, address, is_primary)
values (
  '00000000-0000-0000-0000-0000000000a4',
  '00000000-0000-0000-0000-000000000004',
  'Esquina Verde',
  (select id from districts where name = 'San Isidro' and province = 'Lima'),
  'Av. Arequipa cdra. 38 / esquina Aramburú',
  true
);

insert into schedules (organization_id, venue_id, sport_id, day_of_week, start_time, session_name, level_min, level_max)
values ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-0000000000a4', (select id from sports where slug = 'ciclismo'), 7, '07:30:00', 'Salida dominical (reunión 7:30am, salida 8:00am)', 'never_practiced', 'advanced');

insert into organization_adn (organization_id, beginner_friendly, competitiveness, social_atmosphere, training_intensity_score, performance_focus, inclusiveness, family_friendly, group_size, coach_involvement, event_frequency)
values ('00000000-0000-0000-0000-000000000004', 5, 2, 5, 3, 2, 5, 3, 'large', 2, 4);

-- ============================================================================
-- 5. ProBike Perú — ciclismo — Barranco
-- Source: probikeperu.com, strava.com/clubs/probike-perú-224184
-- ============================================================================
insert into organizations (id, name, slug, organization_type, description, short_description, instagram_url, website_url, profile_status)
values (
  '00000000-0000-0000-0000-000000000005',
  'ProBike Perú',
  'probike-peru',
  'cycling_club',
  'Rutas urbanas de ciclismo combinando deporte y turismo por Barranco, San Isidro, Miraflores y Chorrillos, con opciones de 10, 20 y 30+ km, y escuela de ciclismo.',
  'Ciclismo urbano y escuela, rutas de 10-30+ km',
  'https://instagram.com/probikeperu',
  'https://probikeperu.com',
  'preloaded'
);

insert into organization_sports (organization_id, sport_id, is_primary)
values ('00000000-0000-0000-0000-000000000005', (select id from sports where slug = 'ciclismo'), true);

insert into venues (id, organization_id, name, district_id, is_primary)
values (
  '00000000-0000-0000-0000-0000000000a5',
  '00000000-0000-0000-0000-000000000005',
  'Punto de encuentro Barranco',
  (select id from districts where name = 'Barranco' and province = 'Lima'),
  true
);

-- No confirmed weekly day/time found (only distance tiers) — no schedule row fabricated.

insert into organization_adn (organization_id, beginner_friendly, competitiveness, social_atmosphere, training_intensity_score, performance_focus, inclusiveness, family_friendly, group_size, coach_involvement, event_frequency)
values ('00000000-0000-0000-0000-000000000005', 4, 2, 4, 2, 2, 4, 3, 'medium', 2, 3);

-- ============================================================================
-- 6. Swimming Gold (Club Deportivo Lima Norte) — natación — Comas
-- Source: portallosolivos.com, clubswimgold.com
-- ============================================================================
insert into organizations (id, name, slug, organization_type, description, short_description, instagram_url, whatsapp_number, profile_status)
values (
  '00000000-0000-0000-0000-000000000006',
  'Swimming Gold',
  'swimming-gold',
  'swimming_academy',
  'Academia de natación en Comas con piscina semiolímpica temperada, educación acuática desde recién nacidos hasta categorías máster, incluyendo adultos.',
  'Academia de natación, todas las edades, Comas',
  'https://instagram.com/swimmingold_',
  '51949604292',
  'preloaded'
);

insert into organization_sports (organization_id, sport_id, is_primary)
values ('00000000-0000-0000-0000-000000000006', (select id from sports where slug = 'natacion'), true);

insert into venues (id, organization_id, name, district_id, address, is_primary)
values (
  '00000000-0000-0000-0000-0000000000a6',
  '00000000-0000-0000-0000-000000000006',
  'Swimming Gold',
  (select id from districts where name = 'Comas' and province = 'Lima'),
  'Av. Maestro Peruano 380, Comas',
  true
);

insert into schedules (organization_id, venue_id, sport_id, day_of_week, start_time, end_time, session_name, level_min, level_max)
values
  ('00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-0000000000a6', (select id from sports where slug = 'natacion'), 1, '07:00:00', '20:00:00', 'Horario de local (lun-sáb)', 'never_practiced', 'advanced'),
  ('00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-0000000000a6', (select id from sports where slug = 'natacion'), 7, '08:00:00', '18:00:00', 'Horario de local (domingo)', 'never_practiced', 'advanced');

insert into organization_adn (organization_id, beginner_friendly, competitiveness, social_atmosphere, training_intensity_score, performance_focus, inclusiveness, family_friendly, group_size, coach_involvement, event_frequency)
values ('00000000-0000-0000-0000-000000000006', 5, 1, 3, 2, 1, 5, 5, 'medium', 3, 2);

-- ============================================================================
-- 7. Club Regatas Unión — natación — La Punta, Callao
-- Source: cru.pe/contacto, portalcallao.net (clases de natación, todos los días 8am-5pm)
-- ============================================================================
insert into organizations (id, name, slug, organization_type, description, short_description, website_url, profile_status)
values (
  '00000000-0000-0000-0000-000000000007',
  'Club Regatas Unión',
  'club-regatas-union',
  'sports_community',
  'Club histórico (118 años) en La Punta, Callao, con piscina frente al mar y clases de iniciación y perfeccionamiento de natación para adultos, todos los días.',
  'Club histórico, natación frente al mar, La Punta - Callao',
  'https://cru.pe',
  'preloaded'
);

insert into organization_sports (organization_id, sport_id, is_primary)
values ('00000000-0000-0000-0000-000000000007', (select id from sports where slug = 'natacion'), true);

insert into venues (id, organization_id, name, district_id, address, is_primary)
values (
  '00000000-0000-0000-0000-0000000000a7',
  '00000000-0000-0000-0000-000000000007',
  'Club Regatas Unión',
  (select id from districts where name = 'La Punta' and province = 'Callao'),
  'Parque Gálvez S/N, La Punta',
  true
);

insert into schedules (organization_id, venue_id, sport_id, day_of_week, start_time, end_time, session_name, level_min, level_max)
values
  ('00000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-0000000000a7', (select id from sports where slug = 'natacion'), 1, '08:00:00', '17:00:00', 'Clases de natación (lun-dom)', 'never_practiced', 'intermediate');

insert into organization_adn (organization_id, beginner_friendly, competitiveness, social_atmosphere, training_intensity_score, performance_focus, inclusiveness, family_friendly, group_size, coach_involvement, event_frequency)
values ('00000000-0000-0000-0000-000000000007', 5, 1, 3, 2, 1, 4, 5, 'medium', 3, 2);

-- ============================================================================
-- 8. TRIFIT Perú — triatlón — San Borja / Surco
-- Source: elcomercio.pe (cobertura Ironman 70.3 Lima 2026), instagram.com/trifitperu
-- ============================================================================
insert into organizations (id, name, slug, organization_type, description, short_description, instagram_url, profile_status)
values (
  '00000000-0000-0000-0000-000000000008',
  'TRIFIT Perú',
  'trifit-peru',
  'triathlon_club',
  'Equipo de triatlón federado con entrenadores certificados (World Triathlon Level 3, Ironman), orientado a preparación competitiva.',
  'Triatlón competitivo, coach certificado Ironman',
  'https://instagram.com/trifitperu',
  'preloaded'
);

insert into organization_sports (organization_id, sport_id, is_primary)
values
  ('00000000-0000-0000-0000-000000000008', (select id from sports where slug = 'triatlon'), true),
  ('00000000-0000-0000-0000-000000000008', (select id from sports where slug = 'natacion'), false),
  ('00000000-0000-0000-0000-000000000008', (select id from sports where slug = 'ciclismo'), false),
  ('00000000-0000-0000-0000-000000000008', (select id from sports where slug = 'running'), false);

insert into venues (id, organization_id, name, district_id, is_primary)
values (
  '00000000-0000-0000-0000-0000000000a8',
  '00000000-0000-0000-0000-000000000008',
  'Pentagonito',
  (select id from districts where name = 'San Borja' and province = 'Lima'),
  true
);

insert into schedules (organization_id, venue_id, sport_id, day_of_week, start_time, session_name, level_min, level_max)
values ('00000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-0000000000a8', (select id from sports where slug = 'triatlon'), 1, '05:00:00', 'Entrenamiento matutino (hora de inicio aproximada)', 'intermediate', 'advanced');

insert into organization_adn (organization_id, beginner_friendly, competitiveness, social_atmosphere, training_intensity_score, performance_focus, inclusiveness, family_friendly, group_size, coach_involvement, event_frequency)
values ('00000000-0000-0000-0000-000000000008', 2, 5, 3, 5, 5, 2, 1, 'small', 5, 3);

-- ============================================================================
-- 9. The Warrior House Gym — centro de entrenamiento — La Perla, Callao
-- Source: instagram.com/thewarriorhousegym, facebook.com/thewarriorhouse
-- ============================================================================
insert into organizations (id, name, slug, organization_type, description, short_description, instagram_url, profile_status)
values (
  '00000000-0000-0000-0000-000000000009',
  'The Warrior House Gym',
  'the-warrior-house-gym',
  'gym',
  'Gimnasio de entrenamiento funcional en La Perla, Callao.',
  'Entrenamiento funcional, La Perla - Callao',
  'https://instagram.com/thewarriorhousegym',
  'preloaded'
);

insert into organization_sports (organization_id, sport_id, is_primary)
values ('00000000-0000-0000-0000-000000000009', (select id from sports where slug = 'centro-entrenamiento'), true);

insert into venues (id, organization_id, name, district_id, address, is_primary)
values (
  '00000000-0000-0000-0000-0000000000a9',
  '00000000-0000-0000-0000-000000000009',
  'The Warrior House Gym',
  (select id from districts where name = 'La Perla' and province = 'Callao'),
  'Jr. Atahualpa 1512',
  true
);

-- No confirmed schedule found — no schedule row fabricated (research.md R8: soft signal).

insert into organization_adn (organization_id, beginner_friendly, competitiveness, social_atmosphere, training_intensity_score, performance_focus, inclusiveness, family_friendly, group_size, coach_involvement, event_frequency)
values ('00000000-0000-0000-0000-000000000009', 3, 3, 3, 4, 3, 3, 2, 'small', 3, 2);

-- ============================================================================
-- 10. Altaïr CrossFit — centro de entrenamiento — Miraflores
-- Source: facebook.com/AltairCrossFit (lists Miraflores + Surco addresses)
-- ============================================================================
insert into organizations (id, name, slug, organization_type, description, short_description, profile_status)
values (
  '00000000-0000-0000-0000-00000000000a',
  'Altaïr CrossFit',
  'altair-crossfit',
  'gym',
  'Box de CrossFit / entrenamiento funcional con sedes en Miraflores y Surco.',
  'CrossFit, sedes en Miraflores y Surco',
  'preloaded'
);

-- Only a landline/mobile phone was found (no confirmed WhatsApp-enabled number, no IG handle) —
-- stored nowhere on this org, since the schema has no generic "phone" contact field and we won't
-- guess whether it accepts WhatsApp. This organization is intentionally left with NO contact
-- channel and will therefore NOT pass meetsMinimumDataset() — it stays in the catalog for
-- completeness/future claim, but is not publicly discoverable yet. See research.md R8.

insert into organization_sports (organization_id, sport_id, is_primary)
values ('00000000-0000-0000-0000-00000000000a', (select id from sports where slug = 'centro-entrenamiento'), true);

insert into venues (id, organization_id, name, district_id, address, is_primary)
values (
  '00000000-0000-0000-0000-0000000000aa',
  '00000000-0000-0000-0000-00000000000a',
  'Altaïr CrossFit Miraflores',
  (select id from districts where name = 'Miraflores' and province = 'Lima'),
  'Calle Esperanza 243',
  true
);

insert into organization_adn (organization_id, beginner_friendly, competitiveness, social_atmosphere, training_intensity_score, performance_focus, inclusiveness, family_friendly, group_size, coach_involvement, event_frequency)
values ('00000000-0000-0000-0000-00000000000a', 3, 4, 3, 5, 4, 3, 2, 'small', 4, 2);
