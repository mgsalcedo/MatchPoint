-- MatchPoint — seed 002: real Lima Metropolitana / Callao sports communities (T020, FR-002/FR-012).
--
-- Repo-visibility note: this file was originally gated ("do not commit while the repository is
-- public") because it carries real organizations' contact info. The product owner made an
-- explicit, informed decision on 2026-08-04 to make the repository public anyway, reasoning that
-- every fact below is itself sourced from public web pages (the orgs' own public Instagram/
-- websites) — see the session record for the full risk disclosure. This file (and its git
-- history) has been public since that decision; the gate no longer applies going forward, but is
-- kept here as a record of the tradeoff rather than silently deleted.
--
-- Sourcing discipline (BR-016 — never fabricate): every organization, district, contact channel,
-- and schedule value below was found via public web search (see the source noted per org). Where
-- no real schedule was found, no schedule row is inserted for that organization — per FR-005 /
-- research.md R8, schedule is a soft signal ("schedule or availability note"), not a hard
-- eligibility blocker; a later milestone's UI shows "Horario por confirmar" for it. ADN Deportivo™
-- scores are editorially curated from the qualitative research findings (vibe/level descriptions),
-- which docs/data-model.md explicitly allows ("In PMV, ADN can be manually curated") — they are not
-- guessed contact/schedule facts. Organizations 11-20 (added 2026-08-07, catalog expansion to 50)
-- follow the identical discipline; where a fact came from only one secondary source (a directory
-- site rather than the organization's own channel), that's noted inline per org.
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

-- Code-review fix: the source states "lun-sáb" (Mon-Sat) hours — one row per day of that
-- range so day-based filtering actually matches, instead of a single Monday row standing in
-- for the whole range (previously days 2-6 had no schedule row at all).
insert into schedules (organization_id, venue_id, sport_id, day_of_week, start_time, end_time, session_name, level_min, level_max)
values
  ('00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-0000000000a6', (select id from sports where slug = 'natacion'), 1, '07:00:00', '20:00:00', 'Horario de local (lun-sáb)', 'never_practiced', 'advanced'),
  ('00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-0000000000a6', (select id from sports where slug = 'natacion'), 2, '07:00:00', '20:00:00', 'Horario de local (lun-sáb)', 'never_practiced', 'advanced'),
  ('00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-0000000000a6', (select id from sports where slug = 'natacion'), 3, '07:00:00', '20:00:00', 'Horario de local (lun-sáb)', 'never_practiced', 'advanced'),
  ('00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-0000000000a6', (select id from sports where slug = 'natacion'), 4, '07:00:00', '20:00:00', 'Horario de local (lun-sáb)', 'never_practiced', 'advanced'),
  ('00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-0000000000a6', (select id from sports where slug = 'natacion'), 5, '07:00:00', '20:00:00', 'Horario de local (lun-sáb)', 'never_practiced', 'advanced'),
  ('00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-0000000000a6', (select id from sports where slug = 'natacion'), 6, '07:00:00', '20:00:00', 'Horario de local (lun-sáb)', 'never_practiced', 'advanced'),
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

-- Code-review fix: the only start_time found was explicitly labeled "aproximada" (approximate)
-- by the source — not a confirmed fact, so per the seed's own no-fabrication policy (BR-016,
-- research.md R8) no schedule row is inserted, same as orgs 2, 3, 5, 9 with no confirmed time.

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

-- ============================================================================
-- 11. AquaXtreme San Miguel — natación — San Miguel
-- Source: axt.pe/sedes/academia-de-natacion-en-san-miguel
-- ============================================================================
insert into organizations (id, name, slug, organization_type, description, short_description, website_url, profile_status)
values (
  '00000000-0000-0000-0000-000000000011',
  'AquaXtreme San Miguel',
  'aquaxtreme-san-miguel',
  'swimming_academy',
  'Academia de natación con clases agrupadas por edad y nivel, desde bebés hasta adultos sin límite de edad, sin experiencia previa requerida.',
  'Academia de natación, todas las edades, San Miguel',
  'https://axt.pe',
  'preloaded'
);

insert into organization_sports (organization_id, sport_id, is_primary)
values ('00000000-0000-0000-0000-000000000011', (select id from sports where slug = 'natacion'), true);

insert into venues (id, organization_id, name, district_id, address, is_primary)
values (
  '00000000-0000-0000-0000-0000000000b1',
  '00000000-0000-0000-0000-000000000011',
  'AquaXtreme San Miguel (piscina Colegio Bartolomé Herrera)',
  (select id from districts where name = 'San Miguel' and province = 'Lima'),
  'Av. La Marina cuadra 11, San Miguel',
  true
);

insert into schedules (organization_id, venue_id, sport_id, day_of_week, start_time, end_time, session_name, level_min, level_max)
values
  ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-0000000000b1', (select id from sports where slug = 'natacion'), 1, '06:00:00', '08:00:00', 'Clases lun-vie (mañana)', 'never_practiced', 'advanced'),
  ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-0000000000b1', (select id from sports where slug = 'natacion'), 6, '07:00:00', '12:00:00', 'Clases sábado', 'never_practiced', 'advanced');

insert into organization_adn (organization_id, beginner_friendly, competitiveness, social_atmosphere, training_intensity_score, performance_focus, inclusiveness, family_friendly, group_size, coach_involvement, event_frequency)
values ('00000000-0000-0000-0000-000000000011', 5, 1, 3, 2, 1, 5, 5, 'medium', 4, 2);

-- ============================================================================
-- 12. Intense Running — running — San Isidro (Parque Roosevelt)
-- Source: runatico.com/running-team-lima, instagram.com/intenserunningclub
-- ============================================================================
insert into organizations (id, name, slug, organization_type, description, short_description, instagram_url, profile_status)
values (
  '00000000-0000-0000-0000-000000000012',
  'Intense Running',
  'intense-running',
  'running_team',
  'Equipo de running con entrenamientos intensos de madrugada en Parque Roosevelt, San Isidro, liderado por el coach Walter Takano y auspiciado por Reebok Perú.',
  'Running de alto compromiso, madrugada, San Isidro',
  'https://instagram.com/intenserunningclub',
  'preloaded'
);

insert into organization_sports (organization_id, sport_id, is_primary)
values ('00000000-0000-0000-0000-000000000012', (select id from sports where slug = 'running'), true);

insert into venues (id, organization_id, name, district_id, is_primary)
values (
  '00000000-0000-0000-0000-0000000000b2',
  '00000000-0000-0000-0000-000000000012',
  'Parque Roosevelt',
  (select id from districts where name = 'San Isidro' and province = 'Lima'),
  true
);

insert into schedules (organization_id, venue_id, sport_id, day_of_week, start_time, session_name, level_min, level_max)
values
  ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-0000000000b2', (select id from sports where slug = 'running'), 1, '05:00:00', 'Entrenamiento grupal (lun-sáb)', 'intermediate', 'advanced'),
  ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-0000000000b2', (select id from sports where slug = 'running'), 6, '05:00:00', 'Entrenamiento grupal (lun-sáb)', 'intermediate', 'advanced');

insert into organization_adn (organization_id, beginner_friendly, competitiveness, social_atmosphere, training_intensity_score, performance_focus, inclusiveness, family_friendly, group_size, coach_involvement, event_frequency)
values ('00000000-0000-0000-0000-000000000012', 2, 4, 3, 4, 4, 3, 1, 'medium', 4, 3);

-- ============================================================================
-- 13. Fighter Fit Perú — centro de entrenamiento (box / artes marciales) — Pueblo Libre
-- Source: instagram.com/fighterfitperu, Google Maps listing
-- Schedule sourced only from a directory aggregator (feelingperu.com), not an official Fighter
-- Fit channel — kept per the seed's existing precedent of noting single-source facts inline.
-- ============================================================================
insert into organizations (id, name, slug, organization_type, description, short_description, instagram_url, whatsapp_number, profile_status)
values (
  '00000000-0000-0000-0000-000000000013',
  'Fighter Fit Perú',
  'fighter-fit-peru',
  'gym',
  'Gimnasio de boxeo y artes marciales (Muay Thai, Jiu Jitsu, Taekwondo, Karate) en Pueblo Libre, con sala de máquinas de fuerza y cardio, asociado al boxeador Jonathan Maicelo.',
  'Box y artes marciales, Pueblo Libre',
  'https://instagram.com/fighterfitperu',
  '51965618964',
  'preloaded'
);

insert into organization_sports (organization_id, sport_id, is_primary)
values ('00000000-0000-0000-0000-000000000013', (select id from sports where slug = 'centro-entrenamiento'), true);

insert into venues (id, organization_id, name, district_id, address, is_primary)
values (
  '00000000-0000-0000-0000-0000000000b3',
  '00000000-0000-0000-0000-000000000013',
  'Fighter Fit Perú',
  (select id from districts where name = 'Pueblo Libre' and province = 'Lima'),
  'Av. Antonio José de Sucre 1027, Pueblo Libre',
  true
);

insert into organization_adn (organization_id, beginner_friendly, competitiveness, social_atmosphere, training_intensity_score, performance_focus, inclusiveness, family_friendly, group_size, coach_involvement, event_frequency)
values ('00000000-0000-0000-0000-000000000013', 3, 3, 4, 4, 3, 4, 2, 'medium', 4, 3);

-- ============================================================================
-- 14. Gimnasio Lima 14 — centro de entrenamiento (funcional) — Lince
-- Source: instagram.com/gimnasiolima14, facebook.com/GymLima14
-- Address found only via a search-engine summary of gimnasiolima14.com (site itself unreachable
-- for direct verification) — lower confidence, noted per the seed's inline-caveat precedent.
-- ============================================================================
insert into organizations (id, name, slug, organization_type, description, short_description, instagram_url, whatsapp_number, profile_status)
values (
  '00000000-0000-0000-0000-000000000014',
  'Gimnasio Lima 14',
  'gimnasio-lima-14',
  'training_center',
  'Gimnasio boutique de entrenamiento funcional en Lince, con clases grupales por reserva y enfoque comunitario.',
  'Entrenamiento funcional boutique, Lince',
  'https://instagram.com/gimnasiolima14',
  '51960884629',
  'preloaded'
);

insert into organization_sports (organization_id, sport_id, is_primary)
values ('00000000-0000-0000-0000-000000000014', (select id from sports where slug = 'centro-entrenamiento'), true);

insert into venues (id, organization_id, name, district_id, address, is_primary)
values (
  '00000000-0000-0000-0000-0000000000b4',
  '00000000-0000-0000-0000-000000000014',
  'Gimnasio Lima 14',
  (select id from districts where name = 'Lince' and province = 'Lima'),
  'Jr. Belisario Flores 338, Lince',
  true
);

-- No confirmed class schedule found (reservation-based via app/social media) — no schedule row
-- fabricated (research.md R8).

insert into organization_adn (organization_id, beginner_friendly, competitiveness, social_atmosphere, training_intensity_score, performance_focus, inclusiveness, family_friendly, group_size, coach_involvement, event_frequency)
values ('00000000-0000-0000-0000-000000000014', 4, 2, 5, 3, 2, 4, 2, 'small', 4, 2);

-- ============================================================================
-- 15. Baransu Gym — centro de entrenamiento — Surquillo
-- Source: instagram.com/baransu_gym
-- ============================================================================
insert into organizations (id, name, slug, organization_type, description, short_description, instagram_url, whatsapp_number, profile_status)
values (
  '00000000-0000-0000-0000-000000000015',
  'Baransu Gym',
  'baransu-gym',
  'gym',
  'Gimnasio de fuerza y acondicionamiento en Surquillo, con equipo de máquinas (hack squat, jalón asistido) y planes mensuales.',
  'Fuerza y acondicionamiento, Surquillo',
  'https://instagram.com/baransu_gym',
  '51934999909',
  'preloaded'
);

insert into organization_sports (organization_id, sport_id, is_primary)
values ('00000000-0000-0000-0000-000000000015', (select id from sports where slug = 'centro-entrenamiento'), true);

insert into venues (id, organization_id, name, district_id, address, is_primary)
values (
  '00000000-0000-0000-0000-0000000000b5',
  '00000000-0000-0000-0000-000000000015',
  'Baransu Gym',
  (select id from districts where name = 'Surquillo' and province = 'Lima'),
  'Jr. Contralmirante Lizardo Montero 760, Surquillo',
  true
);

-- Horarios solo visibles en un highlight de Instagram, no extraíbles como texto — no se fabrica
-- una hora específica (research.md R8).

insert into organization_adn (organization_id, beginner_friendly, competitiveness, social_atmosphere, training_intensity_score, performance_focus, inclusiveness, family_friendly, group_size, coach_involvement, event_frequency)
values ('00000000-0000-0000-0000-000000000015', 3, 2, 2, 3, 2, 3, 2, 'small', 2, 1);

-- ============================================================================
-- 16. Academia Kallpa Triatlón — triatlón — Jesús María
-- Source: portaljesusmaria.com/academia-de-natacion-kallpa-triatlon, instagram.com/kallpa_triatlon
-- ============================================================================
insert into organizations (id, name, slug, organization_type, description, short_description, instagram_url, whatsapp_number, profile_status)
values (
  '00000000-0000-0000-0000-000000000016',
  'Academia Kallpa Triatlón',
  'academia-kallpa-triatlon',
  'triathlon_club',
  'Academia de triatlón y aguas abiertas afiliada a la Federación Peruana de Triatlón, con entrenamiento ajustado por edad y nivel.',
  'Triatlón y aguas abiertas, afiliada a la federación, Jesús María',
  'https://instagram.com/kallpa_triatlon',
  '51955882306',
  'preloaded'
);

insert into organization_sports (organization_id, sport_id, is_primary)
values ('00000000-0000-0000-0000-000000000016', (select id from sports where slug = 'triatlon'), true);

insert into venues (id, organization_id, name, district_id, address, is_primary)
values (
  '00000000-0000-0000-0000-0000000000b6',
  '00000000-0000-0000-0000-000000000016',
  'Academia Kallpa Triatlón',
  (select id from districts where name = 'Jesús María' and province = 'Lima'),
  'Av. Talara 450, Jesús María',
  true
);

-- Horario de local (lun-vie 6am-10pm, sáb 6am-2pm) solo confirmado vía directorio de terceros,
-- no un canal oficial de Kallpa — no se inserta como horario de clase específico (research.md R8).

insert into organization_adn (organization_id, beginner_friendly, competitiveness, social_atmosphere, training_intensity_score, performance_focus, inclusiveness, family_friendly, group_size, coach_involvement, event_frequency)
values ('00000000-0000-0000-0000-000000000016', 4, 3, 3, 3, 3, 4, 3, 'medium', 4, 2);

-- ============================================================================
-- 17. Penta Run — running (con preparación trail) — San Borja (Pentagonito)
-- Source: sites.google.com/view/pentarunperu/sedes/san-borja, instagram.com/pentarunperu
-- ============================================================================
insert into organizations (id, name, slug, organization_type, description, short_description, instagram_url, whatsapp_number, website_url, profile_status)
values (
  '00000000-0000-0000-0000-000000000017',
  'Penta Run',
  'penta-run',
  'running_team',
  'Grupo de entrenamiento gratuito de running y preparación trail, con tres niveles (básico, intermedio, avanzado) guiados por entrenadores, en el Pentagonito de San Borja.',
  'Running gratuito, 3 niveles, San Borja',
  'https://instagram.com/pentarunperu',
  '51991465485',
  'https://pentarunperu.com',
  'preloaded'
);

insert into organization_sports (organization_id, sport_id, is_primary)
values
  ('00000000-0000-0000-0000-000000000017', (select id from sports where slug = 'running'), true),
  ('00000000-0000-0000-0000-000000000017', (select id from sports where slug = 'trail-running'), false);

insert into venues (id, organization_id, name, district_id, address, is_primary)
values (
  '00000000-0000-0000-0000-0000000000b7',
  '00000000-0000-0000-0000-000000000017',
  'Pentagonito, Parque Olímpico',
  (select id from districts where name = 'San Borja' and province = 'Lima'),
  'Jr. Paseo del Bosque con Av. San Borja Sur, San Borja',
  true
);

insert into schedules (organization_id, venue_id, sport_id, day_of_week, start_time, session_name, level_min, level_max)
values
  ('00000000-0000-0000-0000-000000000017', '00000000-0000-0000-0000-0000000000b7', (select id from sports where slug = 'running'), 2, '20:00:00', 'Entrenamiento grupal (reunión 7:30pm)', 'never_practiced', 'advanced'),
  ('00000000-0000-0000-0000-000000000017', '00000000-0000-0000-0000-0000000000b7', (select id from sports where slug = 'running'), 4, '20:00:00', 'Entrenamiento grupal (reunión 7:30pm)', 'never_practiced', 'advanced');

insert into organization_adn (organization_id, beginner_friendly, competitiveness, social_atmosphere, training_intensity_score, performance_focus, inclusiveness, family_friendly, group_size, coach_involvement, event_frequency)
values ('00000000-0000-0000-0000-000000000017', 5, 2, 5, 3, 2, 5, 3, 'large', 3, 3);

-- ============================================================================
-- 18. El Piñón Loco — ciclismo — San Borja
-- Source: elpinonloco.com, instagram.com/elpinonloco, strava.com/clubs/el-piñon-loco-team-457091
-- "Group rides" description found only on a directory site that returned repeated fetch errors
-- during verification — treated as weakly sourced; no schedule row inserted (research.md R8).
-- ============================================================================
insert into organizations (id, name, slug, organization_type, description, short_description, instagram_url, whatsapp_number, website_url, profile_status)
values (
  '00000000-0000-0000-0000-000000000018',
  'El Piñón Loco',
  'el-pinon-loco',
  'cycling_club',
  'Taller de mantenimiento de bicicletas en San Borja que también organiza un equipo de ciclismo con salidas grupales y entrenamiento técnico.',
  'Taller y equipo de ciclismo, San Borja',
  'https://instagram.com/elpinonloco',
  '51940400808',
  'https://elpinonloco.com',
  'preloaded'
);

insert into organization_sports (organization_id, sport_id, is_primary)
values ('00000000-0000-0000-0000-000000000018', (select id from sports where slug = 'ciclismo'), true);

insert into venues (id, organization_id, name, district_id, address, is_primary)
values (
  '00000000-0000-0000-0000-0000000000b8',
  '00000000-0000-0000-0000-000000000018',
  'El Piñón Loco',
  (select id from districts where name = 'San Borja' and province = 'Lima'),
  'Tienda 6, Torre 21, Calle Jorge Muelle 433, San Borja',
  true
);

insert into organization_adn (organization_id, beginner_friendly, competitiveness, social_atmosphere, training_intensity_score, performance_focus, inclusiveness, family_friendly, group_size, coach_involvement, event_frequency)
values ('00000000-0000-0000-0000-000000000018', 3, 2, 4, 2, 2, 4, 3, 'medium', 2, 2);

-- ============================================================================
-- 19. Xplora Training Team — trail running (con running general) — Miraflores
-- Source: xploratrainingteam.wixsite.com/website, facebook.com/Xplorateam
-- ============================================================================
insert into organizations (id, name, slug, organization_type, description, short_description, whatsapp_number, website_url, profile_status)
values (
  '00000000-0000-0000-0000-000000000019',
  'Xplora Training Team',
  'xplora-training-team',
  'trail_team',
  'Uno de los primeros grupos de trail running de Lima, con entrenamiento gratuito abierto a todos los niveles; sesiones de running entre semana y trail los domingos.',
  'Trail running pionero en Lima, gratuito, todos los niveles',
  '51987202059',
  'https://xploratrainingteam.wixsite.com/website',
  'preloaded'
);

insert into organization_sports (organization_id, sport_id, is_primary)
values
  ('00000000-0000-0000-0000-000000000019', (select id from sports where slug = 'trail-running'), true),
  ('00000000-0000-0000-0000-000000000019', (select id from sports where slug = 'running'), false);

insert into venues (id, organization_id, name, district_id, is_primary)
values (
  '00000000-0000-0000-0000-0000000000b9',
  '00000000-0000-0000-0000-000000000019',
  'Malecón de la Reserva',
  (select id from districts where name = 'Miraflores' and province = 'Lima'),
  true
);

insert into schedules (organization_id, venue_id, sport_id, day_of_week, start_time, session_name, level_min, level_max)
values
  ('00000000-0000-0000-0000-000000000019', '00000000-0000-0000-0000-0000000000b9', (select id from sports where slug = 'trail-running'), 7, '07:00:00', 'Trail dominical', 'never_practiced', 'advanced'),
  ('00000000-0000-0000-0000-000000000019', '00000000-0000-0000-0000-0000000000b9', (select id from sports where slug = 'running'), 2, '05:40:00', 'Entrenamiento entre semana (mar/jue/sáb)', 'never_practiced', 'advanced'),
  ('00000000-0000-0000-0000-000000000019', '00000000-0000-0000-0000-0000000000b9', (select id from sports where slug = 'running'), 4, '05:40:00', 'Entrenamiento entre semana (mar/jue/sáb)', 'never_practiced', 'advanced'),
  ('00000000-0000-0000-0000-000000000019', '00000000-0000-0000-0000-0000000000b9', (select id from sports where slug = 'running'), 6, '05:40:00', 'Entrenamiento entre semana (mar/jue/sáb)', 'never_practiced', 'advanced');

insert into organization_adn (organization_id, beginner_friendly, competitiveness, social_atmosphere, training_intensity_score, performance_focus, inclusiveness, family_friendly, group_size, coach_involvement, event_frequency)
values ('00000000-0000-0000-0000-000000000019', 4, 3, 4, 3, 3, 4, 2, 'medium', 3, 4);

-- ============================================================================
-- 20. Natación Es Vida — natación — Surco
-- Source: instagram.com/nevperu, natacionesvida.com
-- ============================================================================
insert into organizations (id, name, slug, organization_type, description, short_description, instagram_url, website_url, profile_status)
values (
  '00000000-0000-0000-0000-000000000020',
  'Natación Es Vida',
  'natacion-es-vida',
  'swimming_academy',
  'Club y academia de natación afiliada a la FDNDA en Surco, con clases desde mamá-bebé hasta adultos.',
  'Academia de natación afiliada a la federación, Surco',
  'https://instagram.com/nevperu',
  'https://natacionesvida.com',
  'preloaded'
);

insert into organization_sports (organization_id, sport_id, is_primary)
values ('00000000-0000-0000-0000-000000000020', (select id from sports where slug = 'natacion'), true);

insert into venues (id, organization_id, name, district_id, address, is_primary)
values (
  '00000000-0000-0000-0000-0000000000ba',
  '00000000-0000-0000-0000-000000000020',
  'Natación Es Vida',
  (select id from districts where name = 'Santiago de Surco' and province = 'Lima'),
  'Cañón del Pato 176, Surco',
  true
);

-- No confirmed class schedule found (only that classes are offered across age groups) — no
-- schedule row fabricated (research.md R8).

insert into organization_adn (organization_id, beginner_friendly, competitiveness, social_atmosphere, training_intensity_score, performance_focus, inclusiveness, family_friendly, group_size, coach_involvement, event_frequency)
values ('00000000-0000-0000-0000-000000000020', 5, 1, 3, 2, 1, 5, 5, 'medium', 4, 2);
