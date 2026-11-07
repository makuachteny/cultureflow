// Seed sample users, events, ticket tiers, and a demo order so the app is
// meaningful on first run. Run with: `npm run db:seed`.
//
// Email addresses are derived from `brand.config.json` so rebranding the
// app (e.g. changing the email domain) automatically moves the seeded
// logins too. `upsertUser` keys by email, so a re-seed after a brand
// change will insert new rows for the new domain — you can clean up the
// old ones manually or via `npm run db:push --force-reset`.

import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import brandConfig from "../brand.config.json";

const emailDomain = brandConfig.emailDomain;
const em = (inbox: string) => `${inbox}@${emailDomain}`;

// String-literal enum types — avoid depending on generated enums at compile
// time so the seed can be typechecked before `prisma generate` runs.
type Role          = "ATTENDEE" | "ORGANIZER" | "ADMIN";
type EventCategory = "CULTURAL" | "MUSIC" | "SPORTS" | "EDUCATION" | "FAITH" | "NETWORKING"
                   | "WEDDING" | "COMMUNITY" | "BUSINESS" | "FUNDRAISER" | "FAMILY" | "OTHER";
type EventType     = "IN_PERSON" | "ONLINE" | "HYBRID";
type EventStatus   = "DRAFT" | "PUBLISHED" | "PAST" | "CANCELLED";

// scripts/build-demo-db.ts injects a PGlite-backed client here so the
// same seed produces the bundled demo snapshot.
const injected = (globalThis as { __seedPrisma?: PrismaClient }).__seedPrisma;
const prisma = injected ?? new PrismaClient();

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

function dateIn(days: number, hours = 18) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hours, 0, 0, 0);
  return d;
}

async function upsertUser(opts: {
  email: string; name: string; password: string; role: Role; city: string; country: string;
  bio?: string;
  /** Onboarding extras — make the logged-in home render personalized content. */
  tribe?: string;
  interests?: EventCategory[];
  onboardedAt?: Date | null;
}) {
  const passwordHash = await bcrypt.hash(opts.password, 10);
  // Cast extras so the seed compiles before `prisma generate` picks up the
  // new fields; the underlying DB accepts them as of the latest migration.
  const extras = {
    ...(opts.tribe       !== undefined ? { tribe: opts.tribe } : {}),
    ...(opts.interests   !== undefined ? { interests: opts.interests } : {}),
    ...(opts.onboardedAt !== undefined ? { onboardedAt: opts.onboardedAt } : {})
  } as object;
  return prisma.user.upsert({
    where: { email: opts.email },
    // Reset passwordHash on every run so the sample-login table in the
    // docs always matches what's in the DB. Without this, re-seeding
    // against a DB that already has the user preserves whatever hash
    // was there first and the documented password stops working.
    update: {
      role: opts.role, city: opts.city, country: opts.country,
      name: opts.name, passwordHash, ...extras
    },
    create: {
      email: opts.email,
      passwordHash,
      name: opts.name,
      role: opts.role,
      city: opts.city,
      country: opts.country,
      bio: opts.bio,
      emailVerified: new Date(),
      ...extras
    }
  });
}

async function main() {
  console.log("Seeding database…");

  // Users — all pre-onboarded so the logged-in home skips /welcome.
  // A deliberately mixed cast: organizers and attendees from many
  // cultures and cities, so the demo reads as a platform for anyone.
  // `tribe` holds a free-text heritage / community label.
  // We create the admin (no reference needed elsewhere; side-effect only).
  await upsertUser({
    email: em("admin"), name: "Sam Rivera", password: "admin1234",
    role: "ADMIN", city: "New York", country: "United States",
    bio: "Platform admin.",
    tribe: "Puerto Rican", onboardedAt: new Date()
  });

  const alek = await upsertUser({
    email: em("alek"), name: "Alek Deng", password: "password123",
    role: "ORGANIZER", city: "New York", country: "United States",
    bio: "New York organizer — cultural nights, cookouts, and neighbourhood forums.",
    tribe: "Dinka", interests: ["CULTURAL", "MUSIC", "BUSINESS", "FUNDRAISER"],
    onboardedAt: new Date()
  });

  const mary = await upsertUser({
    email: em("mary"), name: "Mary Okafor", password: "password123",
    role: "ORGANIZER", city: "Lagos", country: "Nigeria",
    bio: "Lagos organizer — live music, gospel nights, and founder events.",
    tribe: "Igbo", interests: ["CULTURAL", "MUSIC", "FAMILY", "COMMUNITY"],
    onboardedAt: new Date()
  });

  const james = await upsertUser({
    email: em("james"), name: "James O'Connell", password: "password123",
    role: "ATTENDEE", city: "Toronto", country: "Canada",
    bio: "Community member based in Toronto.",
    tribe: "Irish", interests: ["SPORTS", "MUSIC", "COMMUNITY"],
    onboardedAt: new Date()
  });

  const ayen = await upsertUser({
    email: em("ayen"), name: "Ayen Nhial", password: "password123",
    role: "ATTENDEE", city: "London", country: "United Kingdom",
    tribe: "Shilluk", interests: ["CULTURAL", "FUNDRAISER", "FAITH"],
    onboardedAt: new Date()
  });

  // Additional organizers so the catalog isn't run by two people.
  const peter = await upsertUser({
    email: em("peter"), name: "Peter Kim", password: "password123",
    role: "ORGANIZER", city: "Seoul", country: "South Korea",
    bio: "Seoul and Toronto organizer — music showcases, language classes, Lunar New Year.",
    tribe: "Korean", interests: ["SPORTS", "FAITH", "COMMUNITY", "FAMILY"],
    onboardedAt: new Date()
  });

  const grace = await upsertUser({
    email: em("grace"), name: "Grace Mendoza", password: "password123",
    role: "ORGANIZER", city: "Mexico City", country: "Mexico",
    bio: "Educator and organizer — heritage-language classes, Día de los Muertos, youth sports.",
    tribe: "Mexican", interests: ["EDUCATION", "CULTURAL", "FAMILY", "FUNDRAISER"],
    onboardedAt: new Date()
  });

  // Extra attendees for realistic follower counts.
  const daniel = await upsertUser({
    email: em("daniel"), name: "Daniel Silva", password: "password123",
    role: "ATTENDEE", city: "São Paulo", country: "Brazil",
    tribe: "Brazilian", interests: ["MUSIC", "SPORTS", "COMMUNITY"],
    onboardedAt: new Date()
  });
  const rebecca = await upsertUser({
    email: em("rebecca"), name: "Rebecca Dubois", password: "password123",
    role: "ATTENDEE", city: "Paris", country: "France",
    tribe: "Haitian", interests: ["FAITH", "FAMILY", "EDUCATION"],
    onboardedAt: new Date()
  });

  // Organizers in Nairobi, Juba and Mumbai.
  const nyawal = await upsertUser({
    email: em("nyawal"), name: "Nyawira Kamau", password: "password123",
    role: "ORGANIZER", city: "Nairobi", country: "Kenya",
    bio: "Nairobi organizer — women in tech, Eid dinners, community gatherings.",
    tribe: "Kikuyu", interests: ["CULTURAL", "FUNDRAISER", "FAMILY", "EDUCATION"],
    onboardedAt: new Date()
  });

  const lado = await upsertUser({
    email: em("lado"), name: "Lado Kenyi", password: "password123",
    role: "ORGANIZER", city: "Juba", country: "South Sudan",
    bio: "Juba organizer — cultural nights and heritage events on the Nile.",
    tribe: "Bari", interests: ["BUSINESS", "CULTURAL", "FAITH", "NETWORKING"],
    onboardedAt: new Date()
  });

  const taban = await upsertUser({
    email: em("taban"), name: "Tanvi Bhatt", password: "password123",
    role: "ORGANIZER", city: "Mumbai", country: "India",
    bio: "Mumbai organizer — weddings, Holi, and relief benefits.",
    tribe: "Gujarati", interests: ["FAITH", "COMMUNITY", "CULTURAL", "NETWORKING"],
    onboardedAt: new Date()
  });

  // Follow graph — seed enough that recommendations have signal.
  const follows: Array<[string, string]> = [
    [james.id, alek.id],
    [ayen.id,  mary.id],
    [daniel.id, alek.id],
    [daniel.id, peter.id],
    [rebecca.id, peter.id],
    [rebecca.id, grace.id],
    [james.id, grace.id],
    [ayen.id,  nyawal.id],
    [daniel.id, lado.id],
    [rebecca.id, taban.id],
    [james.id,  taban.id]
  ];
  for (const [followerId, followingId] of follows) {
    await prisma.follow.upsert({
      where: { followerId_followingId: { followerId, followingId } },
      update: {}, create: { followerId, followingId }
    });
  }

  // Events — a multicultural catalog across the featured cities
  // (New York, London, Toronto, Lagos, Nairobi, Mumbai, São Paulo,
  // Mexico City, Paris, Seoul, Sydney, Juba) plus a few online events.
  // Dates are relative to seed time.
  const events = [
    {
      title: "Diwali Festival of Lights",
      summary: "Lamps, sweets, music and dance to celebrate Diwali together.",
      description:
        "Join London's biggest community Diwali night. Diya-lighting at sunset, a Bollywood and classical dance showcase, rangoli for the kids, and a street-food hall of sweets and chaat. Everyone welcome — traditional dress encouraged.",
      organizerId: ayen.id,
      category: "CULTURAL" as EventCategory,
      type: "IN_PERSON" as EventType,
      venueName: "Southbank Centre",
      venueAddress: "Belvedere Rd, London SE1 8XX",
      city: "London",
      country: "United Kingdom",
      startsAt: dateIn(18),
      endsAt: dateIn(18, 23),
      bannerUrl: "/community/cultural-celebration.jpg",
      featured: true,
      highlights: ["Traditional dress encouraged", "Street-food hall", "Kids' rangoli corner"],
      refundPolicy: "Full refund up to 7 days before the event. No refunds after.",
      tiers: [
        { name: "General Admission", priceCents: 2500, quantity: 500 },
        { name: "VIP (Reserved Seating)", priceCents: 7500, quantity: 50 },
        { name: "Youth (Under 18)", priceCents: 0, quantity: 100 }
      ]
    },
    {
      title: "Afrobeats Live — Lagos",
      summary: "Ten rising Afrobeats and Afro-fusion artists on one stage.",
      description:
        "Ten rising artists across Afrobeats, Amapiano and highlife fusion. Food vendors on site. Mobile money and cards accepted at the door.",
      organizerId: mary.id,
      category: "MUSIC" as EventCategory,
      type: "IN_PERSON" as EventType,
      venueName: "Muri Okunola Park",
      venueAddress: "Victoria Island, Lagos",
      city: "Lagos",
      country: "Nigeria",
      startsAt: dateIn(32, 19),
      endsAt: dateIn(32, 23),
      bannerUrl: "/community/music-live-stage.jpg",
      featured: true,
      highlights: ["10 rising artists", "Food vendors on site", "Mobile money accepted"],
      refundPolicy: "No refunds — tickets may be transferred from My tickets.",
      tiers: [
        { name: "Regular", priceCents: 1500, quantity: 800 },
        { name: "Front Stage", priceCents: 5000, quantity: 100 }
      ]
    },
    {
      title: "Women Founders Around the World — Virtual Panel",
      summary: "Four women entrepreneurs from four continents share their stories.",
      description:
        "An online panel featuring founders from Lagos, Mumbai, São Paulo and Seoul. Q&A at the end. Free to attend — registration required.",
      organizerId: alek.id,
      category: "BUSINESS" as EventCategory,
      type: "ONLINE" as EventType,
      onlineUrl: "https://meet.example/women-founders-panel",
      city: "Online",
      country: "Global",
      startsAt: dateIn(12, 14),
      endsAt: dateIn(12, 16),
      bannerUrl: "/community/business-mixer.jpg",
      tiers: [{ name: "Free Registration", priceCents: 0, quantity: 1000 }]
    },
    {
      title: "Toronto Youth Soccer Tournament",
      summary: "A weekend tournament bringing together youth teams from across the city.",
      description:
        "Six teams, two divisions, one weekend — teams from Toronto's many communities. Volunteers welcome. Family-friendly event with food and community booths.",
      organizerId: alek.id,
      category: "SPORTS" as EventCategory,
      type: "IN_PERSON" as EventType,
      venueName: "Lamport Stadium",
      venueAddress: "1155 King St W, Toronto, ON",
      city: "Toronto",
      country: "Canada",
      startsAt: dateIn(45, 9),
      endsAt: dateIn(46, 17),
      bannerUrl: "/event-banners/calgary-youth-soccer.jpg",
      tiers: [{ name: "Spectator", priceCents: 0, quantity: 800 }]
    },
    {
      title: "Community Fundraiser — Scholarship Fund",
      summary: "A gala dinner raising funds for 20 first-generation student scholarships.",
      description:
        "Black-tie optional. Silent auction, live music, and stories from previous scholarship recipients. Every ticket funds 10% of a scholarship.",
      organizerId: mary.id,
      category: "FUNDRAISER" as EventCategory,
      type: "IN_PERSON" as EventType,
      venueName: "The Grand Ballroom",
      venueAddress: "123 Main St, London",
      city: "London",
      country: "United Kingdom",
      startsAt: dateIn(60, 18),
      endsAt: dateIn(60, 23),
      bannerUrl: "/community/cultural-confetti.jpg",
      featured: true,
      highlights: ["Black-tie optional", "Silent auction", "100% of ticket value funds scholarships"],
      refundPolicy: "50% refund up to 14 days before the event.",
      tiers: [
        { name: "Single Seat",       priceCents: 7500,  quantity: 200 },
        { name: "Table of 8",        priceCents: 55000, quantity: 25  },
        { name: "Student / Under-25", priceCents: 2500, quantity: 50  }
      ]
    },

    {
      title: "Juneteenth Community Cookout",
      summary: "Harlem's Juneteenth celebration — food, music, history and family.",
      description:
        "Our largest gathering of the year. Live jazz and gospel, a short history program at noon, Black-owned food trucks, a kids' zone, and dancing until sunset. Bring a chair — tables are first-come.",
      organizerId: alek.id,
      category: "CULTURAL" as EventCategory,
      type: "IN_PERSON" as EventType,
      venueName: "Marcus Garvey Park",
      venueAddress: "18 Mt Morris Park W, New York, NY",
      city: "New York",
      country: "United States",
      startsAt: dateIn(25, 11),
      endsAt: dateIn(25, 20),
      bannerUrl: "/community/events-new-hero.jpg",
      featured: true,
      highlights: ["History program at noon", "Live jazz & gospel", "Black-owned food trucks"],
      refundPolicy: "Free entry. Food tickets are non-refundable.",
      tiers: [
        { name: "Entry (Free)",             priceCents: 0,    quantity: 3000 },
        { name: "Food Voucher Pack ($15)",  priceCents: 1500, quantity: 800 }
      ]
    },

    {
      title: "Seoul Indie Music Showcase",
      summary: "Six artists, one night. K-indie, R&B and traditional gugak fusion.",
      description:
        "A showcase of independent Korean artists in Hongdae, curated by Peter Kim. Doors 6:30 PM, first set 7:30 PM. Open bar for 19+.",
      organizerId: peter.id,
      category: "MUSIC" as EventCategory,
      type: "IN_PERSON" as EventType,
      venueName: "Rolling Hall",
      venueAddress: "Hongdae, Mapo-gu, Seoul",
      city: "Seoul",
      country: "South Korea",
      startsAt: dateIn(21, 18),
      endsAt: dateIn(21, 23),
      bannerUrl: "/community/music-concert-crowd.jpg",
      featured: true,
      highlights: ["6 independent artists", "19+ event", "Dance floor open after 10 PM"],
      refundPolicy: "Full refund up to 48 hours before the event.",
      tiers: [
        { name: "General Admission", priceCents: 2500, quantity: 350 },
        { name: "VIP (Front Tables)", priceCents: 6500, quantity: 40  }
      ]
    },

    {
      title: "Heritage Language Class: Spanish for Kids",
      summary: "Six-week Saturday morning class for children ages 6–12, online.",
      description:
        "Keep the language alive at home. A beginner-friendly Spanish reading, writing, and conversation class for heritage speakers, taught by Grace Mendoza with guest storytellers. Includes a workbook and a graduation certificate. Registration covers all six sessions.",
      organizerId: grace.id,
      category: "EDUCATION" as EventCategory,
      type: "ONLINE" as EventType,
      onlineUrl: "https://meet.example/spanish-for-kids",
      city: "Online",
      country: "Global",
      startsAt: dateIn(14, 10),
      endsAt: dateIn(14, 12),
      bannerUrl: "/community/education-books.jpg",
      highlights: ["Ages 6–12", "6-week program", "Workbook included"],
      refundPolicy: "Full refund if cancelled before the first session.",
      tiers: [
        { name: "Single Child",    priceCents: 4000, quantity: 25 },
        { name: "Sibling Pair",    priceCents: 7000, quantity: 10 },
        { name: "Scholarship Seat (Free)", priceCents: 0, quantity: 8 }
      ]
    },

    {
      title: "Wedding Reception — Priya & Arjun",
      summary: "Sangeet and reception following the morning ceremony.",
      description:
        "Public reception open to friends and the wider community. Sangeet performances, dinner, and a baraat-style dance floor. Traditional attire encouraged. Your blessings are the only gift we need.",
      organizerId: taban.id,
      category: "WEDDING" as EventCategory,
      type: "IN_PERSON" as EventType,
      venueName: "The Taj Mahal Palace — Crystal Room",
      venueAddress: "Apollo Bandar, Colaba, Mumbai",
      city: "Mumbai",
      country: "India",
      startsAt: dateIn(38, 17),
      endsAt: dateIn(38, 23),
      bannerUrl: "/community/wedding-celebration.jpg",
      highlights: ["Traditional attire encouraged", "Dinner included", "Open to community"],
      refundPolicy: "No refunds — transferable through the Tickets page.",
      tiers: [
        { name: "Adult",        priceCents: 5000, quantity: 250 },
        { name: "Child (under 12)", priceCents: 0, quantity: 100 }
      ]
    },

    {
      title: "Youth Futsal League — Championship Weekend",
      summary: "8 teams, two days of futsal, one trophy. Free for spectators.",
      description:
        "The culmination of our 12-week youth league. 12-and-under on Saturday, 17-and-under on Sunday. Concessions on site. All proceeds from the concessions fund next season's uniforms.",
      organizerId: grace.id,
      category: "SPORTS" as EventCategory,
      type: "IN_PERSON" as EventType,
      venueName: "Ginásio do Ibirapuera",
      venueAddress: "R. Manoel da Nóbrega, 1361, São Paulo",
      city: "São Paulo",
      country: "Brazil",
      startsAt: dateIn(40, 9),
      endsAt: dateIn(41, 18),
      bannerUrl: "/community/sports-tournament.jpg",
      highlights: ["12U & 17U divisions", "Concessions on site", "Championship trophies"],
      tiers: [
        { name: "Spectator (Free)",    priceCents: 0,    quantity: 800 },
        { name: "Supporter + T-shirt", priceCents: 2000, quantity: 100 }
      ]
    },

    {
      title: "Interfaith Youth Convention",
      summary: "Three days of dialogue, service, and fellowship for youth 16–30.",
      description:
        "Young people from Christian, Muslim, Jewish, Hindu, Sikh and Buddhist communities come together for workshops on identity, faith in a new country, and mental health — plus a day of shared community service. Lodging not included — partner hotels listed on confirmation.",
      organizerId: peter.id,
      category: "FAITH" as EventCategory,
      type: "IN_PERSON" as EventType,
      venueName: "Metro Toronto Convention Centre",
      venueAddress: "255 Front St W, Toronto, ON",
      city: "Toronto",
      country: "Canada",
      startsAt: dateIn(55, 18),
      endsAt: dateIn(57, 22),
      bannerUrl: "/community/faith-sanctuary.jpg",
      featured: true,
      highlights: ["Speakers from six faiths", "Mental health workshops", "Community service day"],
      refundPolicy: "Full refund up to 30 days before. 50% up to 7 days before.",
      tiers: [
        { name: "Full Weekend Pass",     priceCents: 7500, quantity: 400 },
        { name: "Single Day",            priceCents: 3000, quantity: 200 },
        { name: "Student (with ID)",     priceCents: 4500, quantity: 150 }
      ]
    },

    {
      title: "Community Town Hall — Fall Update",
      summary: "Quarterly neighbourhood update. Free, all welcome.",
      description:
        "Agenda: public safety updates, fall programming, housing & employment resources, and open Q&A. Spanish, Mandarin and Arabic interpreters on request — email at least 48 hours ahead.",
      organizerId: alek.id,
      category: "COMMUNITY" as EventCategory,
      type: "HYBRID" as EventType,
      venueName: "Queens Public Library — Flushing",
      venueAddress: "41-17 Main St, Flushing, NY",
      onlineUrl: "https://meet.example/nyc-townhall",
      city: "New York",
      country: "United States",
      startsAt: dateIn(8, 18),
      endsAt: dateIn(8, 20),
      bannerUrl: "/community/faith-congregation.jpg",
      highlights: ["Hybrid — join in person or online", "Q&A", "Interpreters on request"],
      tiers: [
        { name: "In-person (Free)", priceCents: 0, quantity: 200 },
        { name: "Virtual (Free)",   priceCents: 0, quantity: 500 }
      ]
    },

    {
      title: "Monsoon Relief Benefit Dinner",
      summary: "A benefit dinner for families displaced by this year's monsoon floods.",
      description:
        "100% of ticket revenue goes directly to verified partner NGOs running flood relief. A short program of speakers, a live auction of community-donated items, and a shared thali dinner. Match challenge: the first $10,000 is matched by a community foundation.",
      organizerId: taban.id,
      category: "FUNDRAISER" as EventCategory,
      type: "IN_PERSON" as EventType,
      venueName: "NCPA — Experimental Theatre Foyer",
      venueAddress: "Nariman Point, Mumbai",
      city: "Mumbai",
      country: "India",
      startsAt: dateIn(16, 18),
      endsAt: dateIn(16, 22),
      bannerUrl: "/community/diaspora-hero-2.jpg",
      featured: true,
      highlights: ["100% to flood-relief NGOs", "Live auction", "Match challenge on first $10K"],
      refundPolicy: "Non-refundable — all proceeds go to relief efforts.",
      tiers: [
        { name: "Community Ticket",  priceCents: 2500,  quantity: 300 },
        { name: "Supporter",         priceCents: 10000, quantity: 80  },
        { name: "Sponsor",           priceCents: 50000, quantity: 20  }
      ]
    },

    {
      title: "Back-to-School Backpack Drive",
      summary: "Free backpacks + school supplies for K-12 students. Walk-ups welcome.",
      description:
        "Families can pick up a backpack loaded with age-appropriate school supplies. Registration helps us plan quantities, but walk-ups are welcome while supplies last. Volunteers needed — see the link in your confirmation.",
      organizerId: alek.id,
      category: "FAMILY" as EventCategory,
      type: "IN_PERSON" as EventType,
      venueName: "Bronx Community Center",
      venueAddress: "1527 Jesup Ave, Bronx, NY",
      city: "New York",
      country: "United States",
      startsAt: dateIn(11, 10),
      endsAt: dateIn(11, 14),
      bannerUrl: "/community/education-books.jpg",
      highlights: ["K-12 supplies", "Walk-ups welcome", "Volunteer opportunities"],
      tiers: [
        { name: "Register (Free)", priceCents: 0, quantity: 300 }
      ]
    },

    {
      title: "Harmony Day Community BBQ",
      summary: "An all-afternoon BBQ celebrating Sydney's many cultures. Everyone welcome.",
      description:
        "Our Harmony Day gathering. Dishes from a dozen community kitchens, soccer in the afternoon, and music until the park closes. A small registration fee covers food; kids eat free.",
      organizerId: ayen.id,
      category: "COMMUNITY" as EventCategory,
      type: "IN_PERSON" as EventType,
      venueName: "Bonnyrigg Park",
      venueAddress: "Edensor Rd, Bonnyrigg NSW",
      city: "Sydney",
      country: "Australia",
      startsAt: dateIn(28, 12),
      endsAt: dateIn(28, 18),
      bannerUrl: "/community/community-outdoors.jpg",
      highlights: ["All-ages", "BBQ + soccer", "Kids eat free"],
      tiers: [
        { name: "Adult", priceCents: 1500, quantity: 300 },
        { name: "Kid (under 12)", priceCents: 0, quantity: 200 }
      ]
    },

    {
      title: "Tech Meetup — Women in Engineering",
      summary: "Monthly meetup, this month spotlighting women engineers building in Africa.",
      description:
        "A short talk + panel + open networking at iHub. Open to students, working engineers, and anyone curious. Snacks and chai provided. Free — registration helps us plan.",
      organizerId: nyawal.id,
      category: "NETWORKING" as EventCategory,
      type: "IN_PERSON" as EventType,
      venueName: "iHub Nairobi",
      venueAddress: "Senteu Plaza, Lenana Rd, Nairobi",
      city: "Nairobi",
      country: "Kenya",
      startsAt: dateIn(19, 17),
      endsAt: dateIn(19, 20),
      bannerUrl: "/community/networking-hands.jpg",
      highlights: ["Panel + open networking", "Students welcome", "Snacks provided"],
      tiers: [
        { name: "Free Registration", priceCents: 0, quantity: 150 }
      ]
    },

    {
      title: "Global Prayer & Meditation Night",
      summary: "A monthly online gathering for prayer, meditation, and reflection — all traditions welcome.",
      description:
        "One hour of guided prayer and meditation led by faith leaders from Lagos, Toronto, and Mumbai. Open to all traditions and to anyone simply seeking quiet. Link sent on registration. Recorded and sent to registrants the next day.",
      organizerId: mary.id,
      category: "FAITH" as EventCategory,
      type: "ONLINE" as EventType,
      onlineUrl: "https://meet.example/global-prayer",
      city: "Online",
      country: "Global",
      startsAt: dateIn(5, 20),
      endsAt: dateIn(5, 21),
      bannerUrl: "/community/faith-sanctuary.jpg",
      highlights: ["1 hour", "All traditions welcome", "Recording provided"],
      tiers: [
        { name: "Free Registration", priceCents: 0, quantity: 1000 }
      ]
    },

    /* ──────── Additional community events ──────── */

    {
      title: "Gospel Night — Songs of Praise",
      summary: "A night of worship with choirs from across Lagos.",
      description: "Doors open at 6:30 PM. Worship begins at 7. Light refreshments served. Love offering.",
      organizerId: mary.id,
      category: "FAITH" as EventCategory,
      type: "IN_PERSON" as EventType,
      venueName: "Muson Centre",
      venueAddress: "8/9 Marina, Onikan, Lagos",
      city: "Lagos",
      country: "Nigeria",
      startsAt: dateIn(23, 19),
      endsAt: dateIn(23, 22),
      bannerUrl: "/community/faith-congregation.jpg",
      highlights: ["Five choirs", "Love offering", "Refreshments"],
      refundPolicy: "Free event — no refunds needed.",
      tiers: [{ name: "Entry (Free)", priceCents: 0, quantity: 400 }]
    },

    {
      title: "Lunar New Year Night Market",
      summary: "Dumplings, lion dancing, lanterns and red envelopes in Chinatown.",
      description: "A night market for the Year's first full moon: food stalls from Chinese, Korean and Vietnamese kitchens, a lion dance at 8 PM, calligraphy and lantern-making for kids.",
      organizerId: peter.id,
      category: "CULTURAL" as EventCategory,
      type: "IN_PERSON" as EventType,
      venueName: "Nathan Phillips Square",
      venueAddress: "100 Queen St W, Toronto, ON",
      city: "Toronto",
      country: "Canada",
      startsAt: dateIn(46, 17),
      endsAt: dateIn(46, 23),
      bannerUrl: "/community/cultural-performance.jpg",
      featured: true,
      highlights: ["Lion dance at 8 PM", "Food from three cuisines", "Lantern-making for kids"],
      refundPolicy: "50% refund up to 10 days before. No refunds after.",
      tiers: [
        { name: "Entry", priceCents: 1000, quantity: 2000 },
        { name: "Tasting Pass (10 dishes)", priceCents: 4000, quantity: 300 }
      ]
    },

    {
      title: "Korean Language Class — Level 1",
      summary: "Six-week beginner Korean course over Zoom. Live instruction + recordings + workbook.",
      description: "Mondays 7–8 PM KST. Class size capped at 18 so everyone gets speaking time. Hangul, greetings, and everyday conversation.",
      organizerId: peter.id,
      category: "EDUCATION" as EventCategory,
      type: "ONLINE" as EventType,
      onlineUrl: "https://meet.example/korean-l1",
      city: "Online",
      country: "Global",
      startsAt: dateIn(15, 19),
      endsAt: dateIn(15, 20),
      bannerUrl: "/community/education-books.jpg",
      highlights: ["6 weeks", "Live + recorded", "Small class size"],
      refundPolicy: "Full refund before the first class. No refunds after.",
      tiers: [
        { name: "Full course",         priceCents: 6000, quantity: 18 },
        { name: "Audit (no workbook)", priceCents: 2000, quantity: 10 }
      ]
    },

    {
      title: "Día de los Muertos Celebration",
      summary: "Ofrendas, marigolds, music and remembrance in Coyoacán.",
      description: "A community altar you can add a photo to, a procession at dusk, mariachi and son jarocho sets, and pan de muerto for everyone. Face painting from 4 PM. Family-friendly.",
      organizerId: grace.id,
      category: "CULTURAL" as EventCategory,
      type: "IN_PERSON" as EventType,
      venueName: "Jardín Centenario",
      venueAddress: "Coyoacán, Mexico City",
      city: "Mexico City",
      country: "Mexico",
      startsAt: dateIn(32, 14),
      endsAt: dateIn(32, 21),
      bannerUrl: "/community/diaspora-hero-1.jpg",
      featured: true,
      highlights: ["Community ofrenda", "Procession at dusk", "Live mariachi"],
      refundPolicy: "Full refund up to 3 days before the event.",
      tiers: [
        { name: "Adult",           priceCents: 1500, quantity: 350 },
        { name: "Child (under 12)", priceCents: 0,    quantity: 150 }
      ]
    },

    {
      title: "Kids World Cultures Workshop",
      summary: "A Saturday morning workshop for kids 6–12 — dances, crafts, and stories from around the world.",
      description: "Parents welcome to stay. Snacks provided. Walk away with a hand-made craft keepsake.",
      organizerId: ayen.id,
      category: "FAMILY" as EventCategory,
      type: "IN_PERSON" as EventType,
      venueName: "Bonnyrigg Community Centre",
      venueAddress: "93 Bonnyrigg Ave, Bonnyrigg NSW",
      city: "Sydney",
      country: "Australia",
      startsAt: dateIn(36, 10),
      endsAt: dateIn(36, 12),
      bannerUrl: "/community/family-together.jpg",
      highlights: ["Ages 6–12", "Snacks provided", "Take-home craft"],
      tiers: [{ name: "Free", priceCents: 0, quantity: 40 }]
    },

    {
      title: "Elders Story Circle — Across Generations",
      summary: "A moderated conversation with elders about migration, family, and keeping traditions alive.",
      description: "Part of our monthly speaker series. Tea and coffee from 6:30 PM; talk 7–8:30 PM; Q&A until 9.",
      organizerId: alek.id,
      category: "COMMUNITY" as EventCategory,
      type: "IN_PERSON" as EventType,
      venueName: "New York Public Library — Schomburg Center",
      venueAddress: "515 Malcolm X Blvd, New York, NY",
      city: "New York",
      country: "United States",
      startsAt: dateIn(10, 18),
      endsAt: dateIn(10, 21),
      bannerUrl: "/community/faith-congregation.jpg",
      highlights: ["Community elders", "Q&A", "Light refreshments"],
      tiers: [{ name: "Free Registration", priceCents: 0, quantity: 120 }]
    },

    /* ──────────────── Nairobi, Paris, London, Juba, Mumbai, Lagos ──────────────── */

    {
      title: "Eid al-Fitr Community Dinner",
      summary: "Celebrate the end of Ramadan with a shared meal. Neighbours of every faith welcome.",
      description:
        "A community iftar-style dinner to mark Eid: biryani, pilau, samosas and sweets, a short program, and henna for the kids. Free; donations welcome for the community food bank.",
      organizerId: nyawal.id,
      category: "COMMUNITY" as EventCategory,
      type: "IN_PERSON" as EventType,
      venueName: "Kenyatta International Convention Centre",
      venueAddress: "Harambee Ave, Nairobi",
      city: "Nairobi",
      country: "Kenya",
      startsAt: dateIn(7, 18),
      endsAt: dateIn(7, 21),
      bannerUrl: "/community/family-together.jpg",
      featured: true,
      highlights: ["Everyone welcome", "Shared dinner", "Food-bank donations welcome"],
      tiers: [{ name: "Free Registration", priceCents: 0, quantity: 180 }]
    },

    {
      title: "Fête de la Musique Block Party",
      summary: "Street music on every corner — open mic, DJ sets and a brass band in the Marais.",
      description:
        "Our block's take on the music festival: an open-mic stage for neighbours, kora and accordion sets, a brass band parade at 9 PM, and DJs until midnight. Food from the street's own restaurants.",
      organizerId: ayen.id,
      category: "MUSIC" as EventCategory,
      type: "IN_PERSON" as EventType,
      venueName: "Place des Vosges",
      venueAddress: "Place des Vosges, 75004 Paris",
      city: "Paris",
      country: "France",
      startsAt: dateIn(24, 17),
      endsAt: dateIn(24, 23),
      bannerUrl: "/community/music-concert-crowd.jpg",
      featured: true,
      highlights: ["Open-mic stage", "Brass band parade", "Street food"],
      refundPolicy: "Full refund up to 5 days before the event.",
      tiers: [
        { name: "Adult",           priceCents: 2500, quantity: 400 },
        { name: "Family (up to 5)", priceCents: 9000, quantity: 50  },
        { name: "Child (under 12)", priceCents: 0,    quantity: 150 }
      ]
    },

    {
      title: "Nowruz Spring Celebration",
      summary: "Welcome the Persian New Year with a haft-sin table, music and dance.",
      description:
        "Celebrate Nowruz with Iranian, Afghan, Kurdish and Central Asian communities. A shared haft-sin table, live tar and daf music, traditional dance, and a dinner of sabzi polo. Dress: spring colours.",
      organizerId: ayen.id,
      category: "CULTURAL" as EventCategory,
      type: "IN_PERSON" as EventType,
      venueName: "Kensington Town Hall",
      venueAddress: "Hornton St, London W8 7NX",
      city: "London",
      country: "United Kingdom",
      startsAt: dateIn(42, 17),
      endsAt: dateIn(42, 23),
      bannerUrl: "/community/cultural-celebration.jpg",
      highlights: ["Haft-sin table", "Live music", "Dinner included"],
      refundPolicy: "No refunds — tickets may be transferred.",
      tiers: [
        { name: "Adult",           priceCents: 4000, quantity: 180 },
        { name: "Child (under 12)", priceCents: 0,    quantity: 60  }
      ]
    },

    {
      title: "South Sudanese Cultural Night — Juba",
      summary: "An evening of Dinka, Nuer, Bari and Shilluk music, dance, and shared plates on the Nile.",
      description:
        "Live drumming and dance from across South Sudan's communities, shared food at sunset, and elders' storytelling after dark. Family-friendly until 9; then the dance floor opens.",
      organizerId: lado.id,
      category: "CULTURAL" as EventCategory,
      type: "IN_PERSON" as EventType,
      venueName: "Nyakuron Cultural Centre",
      venueAddress: "Nyakuron, Juba",
      city: "Juba",
      country: "South Sudan",
      startsAt: dateIn(30, 17),
      endsAt: dateIn(30, 23),
      bannerUrl: "/community/cultural-dancers-flags.jpg",
      featured: true,
      highlights: ["Live drumming & dance", "Shared plates", "Elders' storytelling"],
      tiers: [
        { name: "Single-day pass", priceCents: 1500, quantity: 500 },
        { name: "VIP table",       priceCents: 3500, quantity: 250 }
      ]
    },

    {
      title: "Holi Festival of Colours",
      summary: "Colour, music and street food to welcome spring.",
      description:
        "Organic colours provided, dhol drummers from noon, a Bollywood DJ, and thandai and gujiya stalls. Wear white and clothes you don't mind keeping colourful. All ages.",
      organizerId: taban.id,
      category: "CULTURAL" as EventCategory,
      type: "IN_PERSON" as EventType,
      venueName: "Shivaji Park",
      venueAddress: "Dadar West, Mumbai",
      city: "Mumbai",
      country: "India",
      startsAt: dateIn(13, 11),
      endsAt: dateIn(13, 17),
      bannerUrl: "/community/community-outdoors.jpg",
      featured: true,
      highlights: ["Organic colours provided", "Dhol drummers", "Street food"],
      refundPolicy: "Full refund up to 2 days before the event.",
      tiers: [
        { name: "Entry",           priceCents: 800,  quantity: 1500 },
        { name: "Colour Kit + Entry", priceCents: 1500, quantity: 500 }
      ]
    },

    {
      title: "Irish Céilí Dance Night",
      summary: "Live trad music and a called céilí — no experience needed.",
      description:
        "A caller walks everyone through the dances, so beginners are welcome. Live fiddle, flute and bodhrán from a local trad session band. Soda bread and tea at the interval.",
      organizerId: alek.id,
      category: "CULTURAL" as EventCategory,
      type: "IN_PERSON" as EventType,
      venueName: "The Irish Centre",
      venueAddress: "2390 Eglinton Ave E, Toronto, ON",
      city: "Toronto",
      country: "Canada",
      startsAt: dateIn(27, 19),
      endsAt: dateIn(27, 23),
      bannerUrl: "/community/music-live-stage.jpg",
      highlights: ["Beginners welcome", "Live trad band", "Dances called"],
      tiers: [
        { name: "Adult",            priceCents: 1500, quantity: 200 },
        { name: "Family (up to 4)", priceCents: 5000, quantity: 30  },
        { name: "Child (under 12)", priceCents: 0,    quantity: 60  }
      ]
    },

    {
      title: "Lagos Startup Pitch Night",
      summary: "Eight founders pitch to local angels and diaspora investors. Networking + drinks after.",
      description:
        "Each founder gets 4 minutes + 2 minutes Q&A. Judged by three investors based between Lagos and the diaspora. Winner gets free legal + accounting support for 6 months. Open networking from 8:30 PM.",
      organizerId: mary.id,
      category: "BUSINESS" as EventCategory,
      type: "IN_PERSON" as EventType,
      venueName: "Co-Creation Hub",
      venueAddress: "294 Herbert Macaulay Way, Yaba, Lagos",
      city: "Lagos",
      country: "Nigeria",
      startsAt: dateIn(20, 18),
      endsAt: dateIn(20, 22),
      bannerUrl: "/community/business-speaker.jpg",
      highlights: ["8 pitches", "3 investor judges", "Open networking"],
      tiers: [
        { name: "General",                priceCents: 2000, quantity: 120 },
        { name: "Student",                priceCents: 500,  quantity: 40  },
        { name: "Investor (complimentary)", priceCents: 0,  quantity: 20  }
      ]
    }
  ];

  for (const e of events) {
    const { tiers, ...data } = e;
    const slug = `${slugify(e.title)}-${randomBytes(3).toString("hex")}`;
    const created = await prisma.event.create({
      data: {
        ...data,
        slug,
        status: "PUBLISHED" as EventStatus,
        ticketTiers: { create: tiers.map((t) => ({ ...t, currency: "USD" })) }
      }
    });
    console.log("  event:", created.title);
  }

  console.log("\nDone. Sample logins:");
  console.log(`  ${em("admin").padEnd(32)} / admin1234     (ADMIN)`);
  console.log(`  ${em("alek").padEnd(32)} / password123   (ORGANIZER — New York)`);
  console.log(`  ${em("peter").padEnd(32)} / password123   (ORGANIZER — Seoul)`);
  console.log(`  ${em("grace").padEnd(32)} / password123   (ORGANIZER — Mexico City)`);
  console.log(`  ${em("mary").padEnd(32)} / password123   (ORGANIZER — Lagos)`);
  console.log(`  ${em("nyawal").padEnd(32)} / password123   (ORGANIZER — Nairobi)`);
  console.log(`  ${em("lado").padEnd(32)} / password123   (ORGANIZER — Juba)`);
  console.log(`  ${em("taban").padEnd(32)} / password123   (ORGANIZER — Mumbai)`);
  console.log(`  ${em("daniel").padEnd(32)} / password123   (ATTENDEE  — São Paulo)`);
  console.log(`  ${em("rebecca").padEnd(32)} / password123   (ATTENDEE  — Paris)`);
  console.log(`  ${em("james").padEnd(32)} / password123   (ATTENDEE  — Toronto)`);
  console.log(`  ${em("ayen").padEnd(32)} / password123   (ATTENDEE  — London)`);
}

export const seeded = main();

if (!injected) {
  seeded
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });
}
