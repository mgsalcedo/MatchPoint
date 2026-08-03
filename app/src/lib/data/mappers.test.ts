import { describe, it, expect } from "vitest";
import type { Organization } from "../../types";
import type { DbOrganizationRow } from "./types";
import {
  mapDayOfWeek,
  mapOrganizationRow,
  mapOrganizationType,
  mapProfileStatus,
  mapSportSlug,
  mapUserLevel,
} from "./mappers";

// A complete fixture row (as the discovery query returns it) for a running team in San Isidro.
function fixtureRow(overrides: Partial<DbOrganizationRow> = {}): DbOrganizationRow {
  return {
    id: "org-1",
    name: "Lima Runners Club",
    slug: "lima-runners-club",
    organization_type: "running_team",
    description: "Comunidad de running para todos los niveles.",
    short_description: "Running en San Isidro",
    instagram_url: "https://instagram.com/limarunners",
    whatsapp_number: "51999111222",
    booking_url: null,
    website_url: null,
    profile_status: "verified",
    logo_url: null,
    cover_image_url: null,
    organization_sports: [{ sport: { id: "s1", name: "Running", slug: "running" } }],
    venues: [
      {
        id: "v1",
        name: "Malecón",
        district: { id: "d1", name: "San Isidro" },
      },
    ],
    schedules: [
      {
        id: "sc1",
        day_of_week: 2,
        start_time: "06:00:00",
        end_time: "07:00:00",
        session_name: "Grupal",
        level_min: "beginner",
        level_max: "intermediate",
        venue_id: "v1",
        sport_id: "s1",
      },
    ],
    organization_adn: {
      beginner_friendly: 5,
      competitiveness: 2,
      social_atmosphere: 5,
      training_intensity_score: 3,
      performance_focus: 1,
      inclusiveness: 4,
      family_friendly: 1,
      group_size: "medium",
      coach_involvement: 3,
      event_frequency: 2,
      culture_tags: null,
    },
    ...overrides,
  };
}

describe("enum translation tables", () => {
  it("maps organization_type (incl. many-to-one and the new 'other')", () => {
    expect(mapOrganizationType("running_team")).toBe("team");
    expect(mapOrganizationType("trail_team")).toBe("team");
    expect(mapOrganizationType("cycling_club")).toBe("club");
    expect(mapOrganizationType("triathlon_club")).toBe("club");
    expect(mapOrganizationType("swimming_academy")).toBe("academy");
    expect(mapOrganizationType("coach_independent")).toBe("coach");
    expect(mapOrganizationType("sports_community")).toBe("community");
    expect(mapOrganizationType("gym")).toBe("gym");
    expect(mapOrganizationType("federation")).toBe("federation");
    expect(mapOrganizationType("other")).toBe("other");
  });

  it("maps sport slugs, dropping unknowns", () => {
    expect(mapSportSlug("running")).toBe("running");
    expect(mapSportSlug("trail-running")).toBe("trail");
    expect(mapSportSlug("centro-entrenamiento")).toBe("centro_entrenamiento");
    expect(mapSportSlug("padel")).toBeNull();
  });

  it("maps user levels", () => {
    expect(mapUserLevel("never_practiced")).toBe("nunca_practique");
    expect(mapUserLevel("beginner")).toBe("principiante");
    expect(mapUserLevel("advanced")).toBe("avanzado");
  });

  it("maps day_of_week as ISO Monday=1", () => {
    expect(mapDayOfWeek(1)).toBe("lun");
    expect(mapDayOfWeek(7)).toBe("dom");
    expect(() => mapDayOfWeek(0)).toThrow();
    expect(() => mapDayOfWeek(8)).toThrow();
  });

  it("maps profile_status, folding filtered states to a safe fallback", () => {
    expect(mapProfileStatus("preloaded")).toBe("preloaded");
    expect(mapProfileStatus("verified")).toBe("verified");
    expect(mapProfileStatus("rejected")).toBe("suspended");
    expect(mapProfileStatus("archived")).toBe("suspended");
  });
});

describe("mapOrganizationRow — shape parity (SC-006)", () => {
  it("produces an Organization assignable object with all expected keys", () => {
    const org: Organization = mapOrganizationRow(fixtureRow());
    expect(Object.keys(org).sort()).toEqual(
      [
        "adnDeportivo",
        "bookingLink",
        "coach",
        "coverImageUrl", // added by 007-visual-identity-system
        "description",
        "districts",
        "id",
        "instagram",
        "logoUrl", // added by 007-visual-identity-system
        "name",
        "priceRange",
        "profileStatus",
        "schedules",
        "services",
        "sports",
        "trialClassAvailable",
        "type",
        "website",
        "whatsapp",
      ].sort()
    );
  });

  it("maps core fields", () => {
    const org = mapOrganizationRow(fixtureRow());
    expect(org.id).toBe("org-1");
    expect(org.name).toBe("Lima Runners Club");
    expect(org.type).toBe("team");
    expect(org.sports).toEqual(["running"]);
    expect(org.districts).toEqual(["San Isidro"]);
    expect(org.whatsapp).toBe("51999111222");
    expect(org.instagram).toBe("https://instagram.com/limarunners");
    expect(org.bookingLink).toBeUndefined();
    expect(org.profileStatus).toBe("verified");
  });

  it("maps schedules with HH:MM times and level", () => {
    const org = mapOrganizationRow(fixtureRow());
    expect(org.schedules).toEqual([
      { day: "mar", startTime: "06:00", endTime: "07:00", sessionType: "Grupal", level: "principiante" },
    ]);
  });

  it("leaves endTime/level undefined rather than fabricating a default when unconfirmed (BR-016)", () => {
    const org = mapOrganizationRow(
      fixtureRow({
        schedules: [
          {
            id: "sc2",
            day_of_week: 1,
            start_time: "05:00:00",
            end_time: null,
            session_name: "Entrenamiento matutino",
            level_min: null,
            level_max: null,
            venue_id: "v1",
            sport_id: "s1",
          },
        ],
      })
    );
    expect(org.schedules).toEqual([
      { day: "lun", startTime: "05:00", endTime: undefined, sessionType: "Entrenamiento matutino", level: undefined },
    ]);
  });

  it("uses safe defaults for fields with no DB column (research.md R5, BR-016)", () => {
    const org = mapOrganizationRow(fixtureRow());
    expect(org.priceRange).toBe("no_confirmado");
    expect(org.trialClassAvailable).toBe(false);
    expect(org.services).toEqual([]);
    expect(org.coach).toBeUndefined();
  });

  it("normalizes ADN 1-5 scores to 0-1 and derives environments from thresholds", () => {
    const org = mapOrganizationRow(fixtureRow());
    // beginner_friendly 5 → 1, competitiveness 2 → 0.25, social 5 → 1, intensity 3 → 0.5,
    // performance_focus 1 → 0, inclusiveness 4 → 0.75
    expect(org.adnDeportivo.beginnerFriendliness).toBe(1);
    expect(org.adnDeportivo.competitiveness).toBe(0.25);
    expect(org.adnDeportivo.socialAtmosphere).toBe(1);
    expect(org.adnDeportivo.trainingIntensity).toBe(0.5);
    expect(org.adnDeportivo.performanceFocus).toBe(0);
    expect(org.adnDeportivo.inclusiveness).toBe(0.75);
    // social_atmosphere 5 (>=4) → "social"; inclusiveness 4 (>=4) → "inclusivo"; others below 4
    expect(org.adnDeportivo.environments).toEqual(["social", "inclusivo"]);
  });

  it("handles an organization offering multiple sports", () => {
    const org = mapOrganizationRow(
      fixtureRow({
        organization_sports: [
          { sport: { id: "s1", name: "Triatlón", slug: "triatlon" } },
          { sport: { id: "s2", name: "Natación", slug: "natacion" } },
          { sport: { id: "s3", name: "Ciclismo", slug: "ciclismo" } },
        ],
      })
    );
    expect(org.sports).toEqual(["triatlon", "natacion", "ciclismo"]);
  });

  it("dedupes districts across venues and handles zero venues", () => {
    const multiVenue = mapOrganizationRow(
      fixtureRow({
        venues: [
          { id: "v1", name: "A", district: { id: "d1", name: "Miraflores" } },
          { id: "v2", name: "B", district: { id: "d1", name: "Miraflores" } },
          { id: "v3", name: "C", district: { id: "d2", name: "Barranco" } },
        ],
      })
    );
    expect(multiVenue.districts).toEqual(["Miraflores", "Barranco"]);

    const noVenue = mapOrganizationRow(fixtureRow({ venues: [] }));
    expect(noVenue.districts).toEqual([]);
  });

  it("falls back gracefully when ADN is missing", () => {
    const org = mapOrganizationRow(fixtureRow({ organization_adn: null }));
    expect(org.adnDeportivo.environments).toEqual(["recreativo"]);
    expect(org.adnDeportivo.beginnerFriendliness).toBe(0);
  });

  it("maps website_url (org with only a website as contact channel, e.g. Club Regatas Unión)", () => {
    const org = mapOrganizationRow(
      fixtureRow({
        whatsapp_number: null,
        instagram_url: null,
        booking_url: null,
        website_url: "https://cru.pe",
      })
    );
    expect(org.website).toBe("https://cru.pe");
    expect(org.whatsapp).toBeUndefined();
    expect(org.instagram).toBeUndefined();
  });
});
