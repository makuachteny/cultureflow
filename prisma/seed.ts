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

const prisma = new PrismaClient();

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
  // We create the admin (no reference needed elsewhere; side-effect only).
  await upsertUser({
    email: em("admin"), name: "Deng Akol", password: "admin1234",
    role: "ADMIN", city: "Minneapolis", country: "United States",
    bio: "Platform admin.",
    tribe: "dinka", onboardedAt: new Date()
  });

  const alek = await upsertUser({
    email: em("alek"), name: "Alek Deng", password: "password123",
    role: "ORGANIZER", city: "Minneapolis", country: "United States",
    bio: "Organizer of community events in the Twin Cities.",
    tribe: "dinka", interests: ["CULTURAL", "MUSIC", "BUSINESS", "FUNDRAISER"],
    onboardedAt: new Date()
  });

  const mary = await upsertUser({
    email: em("mary"), name: "Mary Nyandeng", password: "password123",
    role: "ORGANIZER", city: "Juba", country: "South Sudan",
    bio: "Community organizer — youth, music, culture.",
    tribe: "nuer", interests: ["CULTURAL", "MUSIC", "FAMILY", "COMMUNITY"],
    onboardedAt: new Date()
  });

  const james = await upsertUser({
    email: em("james"), name: "James Kur", password: "password123",
    role: "ATTENDEE", city: "Calgary", country: "Canada",
    bio: "Community member based in Calgary.",
    tribe: "dinka", interests: ["SPORTS", "MUSIC", "COMMUNITY"],
    onboardedAt: new Date()
  });

  const ayen = await upsertUser({
    email: em("ayen"), name: "Ayen Nhial", password: "password123",
    role: "ATTENDEE", city: "London", country: "United Kingdom",
    tribe: "shilluk", interests: ["CULTURAL", "FUNDRAISER", "FAITH"],
    onboardedAt: new Date()
  });

  // Additional organizers so the catalog isn't run by two people.
  const peter = await upsertUser({
    email: em("peter"), name: "Peter Chol", password: "password123",
    role: "ORGANIZER", city: "Nashville", country: "United States",
    bio: "Nashville-based organizer. Basketball, worship, youth development.",
    tribe: "dinka", interests: ["SPORTS", "FAITH", "COMMUNITY", "FAMILY"],
    onboardedAt: new Date()
  });

  const grace = await upsertUser({
    email: em("grace"), name: "Grace Ajah", password: "password123",
    role: "ORGANIZER", city: "Omaha", country: "United States",
    bio: "Omaha community educator. Language preservation, women's events.",
    tribe: "nuer", interests: ["EDUCATION", "CULTURAL", "FAMILY", "FUNDRAISER"],
    onboardedAt: new Date()
  });

  // Extra attendees for realistic follower counts.
  const daniel = await upsertUser({
    email: em("daniel"), name: "Daniel Machar", password: "password123",
    role: "ATTENDEE", city: "Minneapolis", country: "United States",
    tribe: "dinka", interests: ["MUSIC", "SPORTS", "COMMUNITY"],
    onboardedAt: new Date()
  });
  const rebecca = await upsertUser({
    email: em("rebecca"), name: "Rebecca Nyakueth", password: "password123",
    role: "ATTENDEE", city: "Nashville", country: "United States",
    tribe: "nuer", interests: ["FAITH", "FAMILY", "EDUCATION"],
    onboardedAt: new Date()
  });

  // East-Africa organizers — South Sudanese diaspora hubs in Kenya + Uganda.
  const nyawal = await upsertUser({
    email: em("nyawal"), name: "Nyawal Riek", password: "password123",
    role: "ORGANIZER", city: "Nairobi", country: "Kenya",
    bio: "South Sudanese-Nairobi organizer. Cultural nights, women's gatherings, scholarship drives.",
    tribe: "nuer", interests: ["CULTURAL", "FUNDRAISER", "FAMILY", "EDUCATION"],
    onboardedAt: new Date()
  });

  const lado = await upsertUser({
    email: em("lado"), name: "Lado Kenyi", password: "password123",
    role: "ORGANIZER", city: "Juba", country: "South Sudan",
    bio: "Juba-based organizer. Bari cultural events, business mixers, faith gatherings on the Nile.",
    tribe: "bari", interests: ["BUSINESS", "CULTURAL", "FAITH", "NETWORKING"],
    onboardedAt: new Date()
  });

  const taban = await upsertUser({
    email: em("taban"), name: "Taban Lokule", password: "password123",
    role: "ORGANIZER", city: "Kampala", country: "Uganda",
    bio: "Kampala-based organizer for the South Sudanese diaspora. Faith events, community forums, cultural showcases.",
    tribe: "kakwa", interests: ["FAITH", "COMMUNITY", "CULTURAL", "NETWORKING"],
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

  // Events
  const events = [
    {
      title: "South Sudanese Cultural Night",
      summary: "An evening of music, dance, and stories celebrating our culture.",
      description:
        "Join the Twin Cities community for our annual Cultural Night. Live performances, traditional food, storytelling from elders, and a youth showcase. Doors open at 5 PM. Dress code: cultural attire encouraged.",
      organizerId: alek.id,
      category: "CULTURAL" as EventCategory,
      type: "IN_PERSON" as EventType,
      venueName: "Earle Brown Heritage Center",
      venueAddress: "6155 Earle Brown Dr, Brooklyn Center, MN",
      city: "Minneapolis",
      country: "United States",
      startsAt: dateIn(18),
      endsAt: dateIn(18, 23),
      bannerUrl: "/community/cultural-celebration.jpg",
      featured: true,
      highlights: ["Cultural attire encouraged", "Traditional food included", "Kids' zone"],
      refundPolicy: "Full refund up to 7 days before the event. No refunds after.",
      tiers: [
        { name: "General Admission", priceCents: 2500, quantity: 500 },
        { name: "VIP (Reserved Seating)", priceCents: 7500, quantity: 50 },
        { name: "Youth (Under 18)", priceCents: 0, quantity: 100 }
      ]
    },
    {
      title: "Music Festival — Rising Voices",
      summary: "A night of rising South Sudanese artists on a single stage.",
      description:
        "Nyakuron Cultural Center hosts 10 rising artists across hip-hop, afrobeats, and traditional fusion. Food vendors on site. Mobile money accepted at the door.",
      organizerId: mary.id,
      category: "MUSIC" as EventCategory,
      type: "IN_PERSON" as EventType,
      venueName: "Nyakuron Cultural Center",
      venueAddress: "Nyakuron, Juba",
      city: "Juba",
      country: "South Sudan",
      startsAt: dateIn(32, 19),
      endsAt: dateIn(32, 23),
      bannerUrl: "/community/sports-pitch.jpg",
      featured: true,
      highlights: ["10 rising artists", "Food vendors on site", "Mobile money accepted"],
      refundPolicy: "No refunds — tickets may be transferred from My tickets.",
      tiers: [
        { name: "Regular", priceCents: 1500, quantity: 800 },
        { name: "Front Stage", priceCents: 5000, quantity: 100 }
      ]
    },
    {
      title: "Diaspora Women in Business — Virtual Panel",
      summary: "Four South Sudanese women entrepreneurs share their stories.",
      description:
        "An online panel featuring founders from Minneapolis, Calgary, London, and Melbourne. Q&A at the end. Free to attend — registration required.",
      organizerId: alek.id,
      category: "BUSINESS" as EventCategory,
      type: "ONLINE" as EventType,
      onlineUrl: "https://meet.example/tribe-women-business",
      city: "Online",
      country: "Global",
      startsAt: dateIn(12, 14),
      endsAt: dateIn(12, 16),
      bannerUrl: "/community/business-mixer.jpg",
      tiers: [{ name: "Free Registration", priceCents: 0, quantity: 1000 }]
    },
    {
      title: "Calgary Youth Soccer Tournament",
      summary: "A weekend tournament bringing together SS youth in Calgary.",
      description:
        "Six teams, two divisions, one weekend. Volunteers welcome. Family-friendly event with food and community booths.",
      organizerId: alek.id,
      category: "SPORTS" as EventCategory,
      type: "IN_PERSON" as EventType,
      venueName: "McMahon Stadium",
      venueAddress: "1817 Crowchild Trail NW, Calgary, AB",
      city: "Calgary",
      country: "Canada",
      startsAt: dateIn(45, 9),
      endsAt: dateIn(46, 17),
      bannerUrl: "/event-banners/calgary-youth-soccer.jpg",
      tiers: [{ name: "Spectator", priceCents: 0, quantity: 800 }]
    },
    {
      title: "Community Fundraiser — Scholarship Fund",
      summary: "A gala dinner raising funds for 20 student scholarships.",
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

    /* ──────────────── US-diaspora catalog ────────────────
       Modeled on real South Sudanese community event patterns: July 9
       Independence Day celebrations, church conventions, language/cultural
       preservation workshops, youth sports leagues, wedding receptions, and
       flood/drought relief fundraisers. Dates are relative to seed time. */

    {
      title: "Independence Day Picnic (July 9)",
      summary: "Annual celebration of South Sudan's Independence Day at Minnehaha Park.",
      description:
        "Join thousands of community members for our largest gathering of the year. Dinka, Nuer, Shilluk, and every tribe represented. Live drumming, flag ceremony at noon, food stalls, kids' zone, and dancing until sunset. Bring a chair — tables are first-come.",
      organizerId: alek.id,
      category: "CULTURAL" as EventCategory,
      type: "IN_PERSON" as EventType,
      venueName: "Minnehaha Regional Park",
      venueAddress: "4801 S Minnehaha Park Dr, Minneapolis, MN",
      city: "Minneapolis",
      country: "United States",
      startsAt: dateIn(25, 11),
      endsAt: dateIn(25, 20),
      bannerUrl: "/community/events-new-hero.jpg",
      featured: true,
      highlights: ["Flag ceremony at noon", "Live drumming & cultural dance", "Food stalls from every state"],
      refundPolicy: "Free entry. Food tickets are non-refundable.",
      tiers: [
        { name: "Entry (Free)",             priceCents: 0,    quantity: 3000 },
        { name: "Food Voucher Pack ($15)",  priceCents: 1500, quantity: 800 }
      ]
    },

    {
      title: "Rising Voices: South Sudanese Music Showcase",
      summary: "Six artists, one night. Afrobeats, gospel, and traditional fusion.",
      description:
        "Nashville's first dedicated showcase for South Sudanese artists in the USA. Curated by Peter Chol with support from the Tennessee African Diaspora Arts Council. Doors 6:30 PM, first set 7:30 PM. Open bar for 21+.",
      organizerId: peter.id,
      category: "MUSIC" as EventCategory,
      type: "IN_PERSON" as EventType,
      venueName: "3rd & Lindsley",
      venueAddress: "818 3rd Ave S, Nashville, TN",
      city: "Nashville",
      country: "United States",
      startsAt: dateIn(21, 18),
      endsAt: dateIn(21, 23),
      bannerUrl: "/community/music-live-stage.jpg",
      featured: true,
      highlights: ["6 South Sudanese artists", "21+ event", "Dance floor open after 10 PM"],
      refundPolicy: "Full refund up to 48 hours before the event.",
      tiers: [
        { name: "General Admission", priceCents: 2500, quantity: 350 },
        { name: "VIP (Front Tables)", priceCents: 6500, quantity: 40  }
      ]
    },

    {
      title: "Mother Tongue Workshop: Dinka for Kids",
      summary: "Six-week Saturday morning class for children ages 6–12.",
      description:
        "Keep the language alive. A beginner-friendly Dinka reading, writing, and conversation workshop taught in rotating pairs — Grace Ajah (lead) with community elders. Includes workbook, weekly snacks, and a graduation certificate. Registration covers all six sessions.",
      organizerId: grace.id,
      category: "EDUCATION" as EventCategory,
      type: "IN_PERSON" as EventType,
      venueName: "Omaha Public Library — Millard Branch",
      venueAddress: "13214 Westwood Ln, Omaha, NE",
      city: "Omaha",
      country: "United States",
      startsAt: dateIn(14, 10),
      endsAt: dateIn(14, 12),
      bannerUrl: "/community/education-books.jpg",
      highlights: ["Ages 6–12", "6-week program", "Workbook + snacks included"],
      refundPolicy: "Full refund if cancelled before the first session.",
      tiers: [
        { name: "Single Child",    priceCents: 4000, quantity: 25 },
        { name: "Sibling Pair",    priceCents: 7000, quantity: 10 },
        { name: "Scholarship Seat (Free)", priceCents: 0, quantity: 8 }
      ]
    },

    {
      title: "Wedding Reception — Mayen & Nyibol",
      summary: "Traditional reception following the church ceremony at 2 PM.",
      description:
        "Public reception open to the community. Traditional dance circle, dinner, and speeches. Dinka attire encouraged. Bring your own blessings — no gift registry.",
      organizerId: alek.id,
      category: "WEDDING" as EventCategory,
      type: "IN_PERSON" as EventType,
      venueName: "The Depot Minneapolis",
      venueAddress: "225 3rd Ave S, Minneapolis, MN",
      city: "Minneapolis",
      country: "United States",
      startsAt: dateIn(38, 17),
      endsAt: dateIn(38, 23),
      bannerUrl: "/community/wedding-celebration.jpg",
      highlights: ["Dinka attire encouraged", "Dinner included", "Open to community"],
      refundPolicy: "No refunds — transferable through the Tickets page.",
      tiers: [
        { name: "Adult",        priceCents: 5000, quantity: 250 },
        { name: "Child (under 12)", priceCents: 0, quantity: 100 }
      ]
    },

    {
      title: "Youth Basketball League — Championship Weekend",
      summary: "8 teams, two days of ball, one trophy. Free for spectators.",
      description:
        "The culmination of our 12-week youth league. 12-and-under on Saturday, 17-and-under on Sunday. Concessions on site. All proceeds from the concessions fund next season's uniforms.",
      organizerId: grace.id,
      category: "SPORTS" as EventCategory,
      type: "IN_PERSON" as EventType,
      venueName: "Kroc Center Omaha",
      venueAddress: "2825 Y St, Omaha, NE",
      city: "Omaha",
      country: "United States",
      startsAt: dateIn(40, 9),
      endsAt: dateIn(41, 18),
      bannerUrl: "/community/diaspora-hero-1.jpg",
      highlights: ["12U & 17U divisions", "Concessions on site", "Championship trophies"],
      tiers: [
        { name: "Spectator (Free)",    priceCents: 0,    quantity: 800 },
        { name: "Supporter + T-shirt", priceCents: 2000, quantity: 100 }
      ]
    },

    {
      title: "South Sudanese Pentecostal Youth Convention",
      summary: "Three days of worship, teaching, and fellowship for youth 16–30.",
      description:
        "Our annual convention brings together South Sudanese Pentecostal churches from across the Midwest. Keynote by Rev. John Mabior. Workshops on identity, faith in the diaspora, and mental health. Lodging not included — partner hotels listed on confirmation.",
      organizerId: peter.id,
      category: "FAITH" as EventCategory,
      type: "IN_PERSON" as EventType,
      venueName: "Omaha Marriott Regency",
      venueAddress: "10220 Regency Cir, Omaha, NE",
      city: "Omaha",
      country: "United States",
      startsAt: dateIn(55, 18),
      endsAt: dateIn(57, 22),
      bannerUrl: "/community/faith-sanctuary.jpg",
      featured: true,
      highlights: ["Keynote speakers", "Mental health workshops", "Worship nights"],
      refundPolicy: "Full refund up to 30 days before. 50% up to 7 days before.",
      tiers: [
        { name: "Full Weekend Pass",     priceCents: 7500, quantity: 400 },
        { name: "Single Day",            priceCents: 3000, quantity: 200 },
        { name: "Student (with ID)",     priceCents: 4500, quantity: 150 }
      ]
    },

    {
      title: "Community Town Hall — Fall Update",
      summary: "Quarterly update from the SS Community Council. Free, all welcome.",
      description:
        "Agenda: public safety updates, fall programming, housing & employment resources, and open Q&A. Spanish and Arabic interpreters on request — email at least 48 hours ahead.",
      organizerId: alek.id,
      category: "COMMUNITY" as EventCategory,
      type: "HYBRID" as EventType,
      venueName: "Brian Coyle Community Center",
      venueAddress: "420 15th Ave S, Minneapolis, MN",
      onlineUrl: "https://meet.example/tribe-twin-cities-townhall",
      city: "Minneapolis",
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
      title: "Flood Relief — Unity State Fundraiser",
      summary: "Emergency fundraiser for flood-displaced families in Unity State.",
      description:
        "100% of ticket revenue goes directly to verified partner NGOs operating in Unity State. A short program of speakers, a live auction of community-donated items, and a shared meal. Match challenge: first $10,000 matched by the Diaspora Response Fund.",
      organizerId: alek.id,
      category: "FUNDRAISER" as EventCategory,
      type: "IN_PERSON" as EventType,
      venueName: "Sabathani Community Center",
      venueAddress: "310 E 38th St, Minneapolis, MN",
      city: "Minneapolis",
      country: "United States",
      startsAt: dateIn(16, 18),
      endsAt: dateIn(16, 22),
      bannerUrl: "/community/cultural-performance.jpg",
      featured: true,
      highlights: ["100% to flood-response NGOs", "Live auction", "Match challenge on first $10K"],
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
        "Families from the Nashville South Sudanese community can pick up a backpack loaded with age-appropriate school supplies. Registration helps us plan quantities, but walk-ups are welcome while supplies last. Volunteers needed — see the link in your confirmation.",
      organizerId: peter.id,
      category: "FAMILY" as EventCategory,
      type: "IN_PERSON" as EventType,
      venueName: "Casey Jenkins Community Center",
      venueAddress: "802 Hamilton Ave, Nashville, TN",
      city: "Nashville",
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
      title: "Community Day — South Sudanese BBQ",
      summary: "An all-afternoon BBQ in Bonnyrigg Park. Bring family, friends, all welcome.",
      description:
        "Our end-of-winter gathering. Community-cooked BBQ, soccer in the afternoon, and music until the park closes. A small registration fee covers food; kids eat free.",
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
      summary: "Monthly meetup, this month spotlighting South Sudanese women engineers.",
      description:
        "A short talk + panel + open networking at the University of Juba. Open to students, working engineers, and anyone curious. Snacks and tea provided. Free — registration helps us plan.",
      organizerId: mary.id,
      category: "NETWORKING" as EventCategory,
      type: "IN_PERSON" as EventType,
      venueName: "University of Juba — IT Building",
      venueAddress: "University Rd, Juba",
      city: "Juba",
      country: "South Sudan",
      startsAt: dateIn(19, 17),
      endsAt: dateIn(19, 20),
      bannerUrl: "/community/business-mixer.jpg",
      highlights: ["Panel + open networking", "Students welcome", "Snacks provided"],
      tiers: [
        { name: "Free Registration", priceCents: 0, quantity: 150 }
      ]
    },

    {
      title: "Global Prayer Night",
      summary: "A monthly online prayer gathering for South Sudan and the diaspora.",
      description:
        "One hour of guided prayer, led by pastors from Juba, Minneapolis, and London. Open to all denominations. Zoom link sent on registration. Recorded; sent to registrants the next day if you can't attend live.",
      organizerId: mary.id,
      category: "FAITH" as EventCategory,
      type: "ONLINE" as EventType,
      onlineUrl: "https://meet.example/tribe-global-prayer",
      city: "Online",
      country: "Global",
      startsAt: dateIn(5, 20),
      endsAt: dateIn(5, 21),
      bannerUrl: "/community/faith-sanctuary.jpg",
      highlights: ["1 hour", "All denominations welcome", "Recording provided"],
      tiers: [
        { name: "Free Registration", priceCents: 0, quantity: 1000 }
      ]
    },

    /* ──────── Additional community events ──────── */

    {
      title: "Gospel Night — Songs of Zion",
      summary: "A night of worship bringing together South Sudanese gospel artists from across the Midwest.",
      description: "Doors open at 6:30 PM. Worship begins at 7. Light refreshments served. Love offering.",
      organizerId: alek.id,
      category: "FAITH" as EventCategory,
      type: "IN_PERSON" as EventType,
      venueName: "Mount Olivet Lutheran Church",
      venueAddress: "5025 Knox Ave S, Minneapolis, MN",
      city: "Minneapolis",
      country: "United States",
      startsAt: dateIn(23, 19),
      endsAt: dateIn(23, 22),
      bannerUrl: "/community/faith-sanctuary.jpg",
      highlights: ["Midwest worship teams", "Love offering", "Refreshments"],
      refundPolicy: "Free event — no refunds needed.",
      tiers: [{ name: "Entry (Free)", priceCents: 0, quantity: 400 }]
    },

    {
      title: "Scholarship Gala — Omaha",
      summary: "Black-tie fundraiser supporting 12 South Sudanese students pursuing higher education.",
      description: "Silent auction, keynote from a scholarship alum, and a shared dinner. Every ticket funds ~5% of a scholarship.",
      organizerId: grace.id,
      category: "FUNDRAISER" as EventCategory,
      type: "IN_PERSON" as EventType,
      venueName: "Embassy Suites by Hilton — La Vista",
      venueAddress: "12520 Westport Pkwy, La Vista, NE",
      city: "Omaha",
      country: "United States",
      startsAt: dateIn(46, 18),
      endsAt: dateIn(46, 23),
      bannerUrl: "/community/cultural-confetti.jpg",
      featured: true,
      highlights: ["Black-tie", "Silent auction", "100% of revenue to scholarships"],
      refundPolicy: "50% refund up to 10 days before. No refunds after.",
      tiers: [
        { name: "Individual", priceCents: 10000, quantity: 200 },
        { name: "Table of 8", priceCents: 70000, quantity: 20 }
      ]
    },

    {
      title: "Dinka Language Class — Level 1",
      summary: "Six-week beginner Dinka course over Zoom. Live instruction + recordings + workbook.",
      description: "Mondays 7–8 PM Central. Class size capped at 18 so everyone gets speaking time. Workbook mailed to US addresses.",
      organizerId: grace.id,
      category: "EDUCATION" as EventCategory,
      type: "ONLINE" as EventType,
      onlineUrl: "https://meet.example/tribe-dinka-l1",
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
      title: "Independence Day Celebration — London",
      summary: "Annual July 9 gathering for the UK South Sudanese community.",
      description: "Flag ceremony at 2 PM, cultural performances 3–6 PM, shared dinner after. Family-friendly.",
      organizerId: ayen.id,
      category: "CULTURAL" as EventCategory,
      type: "IN_PERSON" as EventType,
      venueName: "Westminster Community Hall",
      venueAddress: "1 Rochester Row, London SW1P 1LJ",
      city: "London",
      country: "United Kingdom",
      startsAt: dateIn(32, 14),
      endsAt: dateIn(32, 21),
      bannerUrl: "/community/events-new-hero.jpg",
      featured: true,
      highlights: ["Flag ceremony", "Live performances", "Dinner included"],
      refundPolicy: "Full refund up to 3 days before the event.",
      tiers: [
        { name: "Adult",           priceCents: 1500, quantity: 350 },
        { name: "Child (under 12)", priceCents: 0,    quantity: 150 }
      ]
    },

    {
      title: "Kids Cultural Workshop — Sydney",
      summary: "A Saturday morning workshop for kids 6–12 — traditional dance, crafts, and storytelling.",
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
      title: "Nashville Elders Forum — Stories & Advice",
      summary: "Moderated conversation with community elders about identity, family, and faith in the diaspora.",
      description: "Part of the Nashville monthly speaker series. Tea and coffee from 6:30 PM; talk 7–8:30 PM; Q&A until 9.",
      organizerId: peter.id,
      category: "COMMUNITY" as EventCategory,
      type: "IN_PERSON" as EventType,
      venueName: "Nashville Public Library — Main Branch",
      venueAddress: "615 Church St, Nashville, TN",
      city: "Nashville",
      country: "United States",
      startsAt: dateIn(10, 18),
      endsAt: dateIn(10, 21),
      bannerUrl: "/community/faith-congregation.jpg",
      highlights: ["Community elders", "Q&A", "Light refreshments"],
      tiers: [{ name: "Free Registration", priceCents: 0, quantity: 120 }]
    },

    /* ──────────────── East Africa catalog (Nairobi, Juba, Wau, Kampala) ──────────────── */

    {
      title: "South Sudanese Women's Tea — Nairobi",
      summary: "Monthly gathering for South Sudanese women in Nairobi. Tea, conversation, and quiet support.",
      description:
        "An evening for South Sudanese women living in Nairobi to come together — tea, mandazi, and the kind of conversation you can only have with people who get it. Two short sharings then open floor. Free; donations welcome for the scholarship pot.",
      organizerId: nyawal.id,
      category: "COMMUNITY" as EventCategory,
      type: "IN_PERSON" as EventType,
      venueName: "Pawa254",
      venueAddress: "State House Crescent, Nairobi",
      city: "Nairobi",
      country: "Kenya",
      startsAt: dateIn(7, 18),
      endsAt: dateIn(7, 21),
      bannerUrl: "/community/business-mixer.jpg",
      featured: true,
      highlights: ["Women's space", "Tea + mandazi", "Scholarship donations welcome"],
      tiers: [{ name: "Free Registration", priceCents: 0, quantity: 180 }]
    },

    {
      title: "Karibu Nairobi — South Sudan Cultural Night",
      summary: "A celebration of South Sudan's tribes through music, dance, and shared plates — in the heart of Nairobi.",
      description:
        "An evening of Dinka, Nuer, Bari and Shilluk dance and song from the South Sudanese diaspora in Nairobi — plus shared plates of kisra and asida. Dress: your tribe's colours if you have them, smart-casual otherwise.",
      organizerId: nyawal.id,
      category: "CULTURAL" as EventCategory,
      type: "IN_PERSON" as EventType,
      venueName: "Bomas of Kenya",
      venueAddress: "Lang'ata Rd, Nairobi",
      city: "Nairobi",
      country: "Kenya",
      startsAt: dateIn(24, 17),
      endsAt: dateIn(24, 23),
      bannerUrl: "/community/cultural-dancers-flags.jpg",
      featured: true,
      highlights: ["All tribes welcome", "Live music + dance", "Shared plates"],
      refundPolicy: "Full refund up to 5 days before the event.",
      tiers: [
        { name: "Adult",           priceCents: 2500, quantity: 400 },
        { name: "Family (up to 5)", priceCents: 9000, quantity: 50  },
        { name: "Child (under 12)", priceCents: 0,    quantity: 150 }
      ]
    },

    {
      title: "Juba Riverside Wedding Reception — Akol & Adut",
      summary: "A Nile-side celebration in Juba — traditional dowry program, live band, and dinner under the stars.",
      description:
        "Public reception following the church ceremony. Dress code: white + gold, or your tribal attire. Traditional dowry program from 5 PM, live band from 7, dance floor opens at 9. Transport from Hai Cinema arranged on request.",
      organizerId: lado.id,
      category: "WEDDING" as EventCategory,
      type: "IN_PERSON" as EventType,
      venueName: "Pyramid Continental Hotel",
      venueAddress: "Ministries Rd, Juba",
      city: "Juba",
      country: "South Sudan",
      startsAt: dateIn(42, 17),
      endsAt: dateIn(42, 23),
      bannerUrl: "/community/wedding-celebration.jpg",
      highlights: ["Riverside venue", "Live band", "Dowry program included"],
      refundPolicy: "No refunds — tickets may be transferred.",
      tiers: [
        { name: "Adult",           priceCents: 4000, quantity: 180 },
        { name: "Child (under 12)", priceCents: 0,    quantity: 60  }
      ]
    },

    {
      title: "Wau Heritage Weekend",
      summary: "Three days of South Sudanese music, food, and storytelling in one of South Sudan's oldest cities.",
      description:
        "A rolling weekend across central Wau. Live music each evening (Dinka, Luo, Fertit, Balanda traditions), shared food at midday, elders' storytelling after sunset. Friday & Saturday family-friendly until 9; Sunday 18+.",
      organizerId: lado.id,
      category: "CULTURAL" as EventCategory,
      type: "IN_PERSON" as EventType,
      venueName: "Wau Civic Centre + Freedom Square",
      venueAddress: "Hai Salaam, Wau",
      city: "Wau",
      country: "South Sudan",
      startsAt: dateIn(30, 17),
      endsAt: dateIn(32, 23),
      bannerUrl: "/community/cultural-celebration.jpg",
      featured: true,
      highlights: ["3-day weekend", "Multi-tribe program", "Elders' storytelling"],
      tiers: [
        { name: "Single-day pass", priceCents: 1500, quantity: 500 },
        { name: "Weekend pass",    priceCents: 3500, quantity: 250 }
      ]
    },

    {
      title: "Kampala Gospel Night — South Sudanese Diaspora",
      summary: "An evening of worship led by South Sudanese churches across Kampala.",
      description:
        "Six worship teams from South Sudanese congregations in Kampala — one stage, one night. Doors open 6 PM; worship starts 7. Light refreshments after. Love-offering for the speaker ministry.",
      organizerId: taban.id,
      category: "FAITH" as EventCategory,
      type: "IN_PERSON" as EventType,
      venueName: "Watoto Church Central",
      venueAddress: "Bombo Rd, Kampala",
      city: "Kampala",
      country: "Uganda",
      startsAt: dateIn(13, 18),
      endsAt: dateIn(13, 22),
      bannerUrl: "/community/faith-sanctuary.jpg",
      featured: true,
      highlights: ["6 worship teams", "Light refreshments", "Love offering"],
      refundPolicy: "Free event — no refunds needed.",
      tiers: [{ name: "Free Registration", priceCents: 0, quantity: 600 }]
    },

    {
      title: "South Sudan Cultural Day — Kampala",
      summary: "A daytime showcase of South Sudanese heritage: traditional dance, drum, and shared community dishes.",
      description:
        "All-ages event on the lawns of the National Theatre. Dinka and Nuer drum ensembles open at noon, dance troupes from across the tribes at 2 PM, community cook-off at 4 PM, closing program at sunset. Traditional attire encouraged.",
      organizerId: taban.id,
      category: "CULTURAL" as EventCategory,
      type: "IN_PERSON" as EventType,
      venueName: "Uganda National Cultural Centre",
      venueAddress: "Siad Barre Ave, Kampala",
      city: "Kampala",
      country: "Uganda",
      startsAt: dateIn(27, 12),
      endsAt: dateIn(27, 19),
      bannerUrl: "/community/cultural-dancers-flags.jpg",
      highlights: ["All tribes", "Community cook-off", "Traditional attire encouraged"],
      tiers: [
        { name: "Adult",            priceCents: 1500, quantity: 500 },
        { name: "Family (up to 4)", priceCents: 5000, quantity: 60  },
        { name: "Child (under 12)", priceCents: 0,    quantity: 200 }
      ]
    },

    {
      title: "Juba Startup Pitch Night",
      summary: "Eight South Sudanese founders pitch to diaspora investors and local angels. Networking + drinks after.",
      description:
        "Each founder gets 4 minutes + 2 minutes Q&A. Judged by three South Sudanese investors based between Juba and the diaspora. Winner gets free legal + accounting support for 6 months. Open networking from 8:30 PM.",
      organizerId: lado.id,
      category: "BUSINESS" as EventCategory,
      type: "IN_PERSON" as EventType,
      venueName: "iceaddis Juba",
      venueAddress: "Tongping, Juba",
      city: "Juba",
      country: "South Sudan",
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
  console.log(`  ${em("alek").padEnd(32)} / password123   (ORGANIZER — Minneapolis)`);
  console.log(`  ${em("peter").padEnd(32)} / password123   (ORGANIZER — Nashville)`);
  console.log(`  ${em("grace").padEnd(32)} / password123   (ORGANIZER — Omaha)`);
  console.log(`  ${em("mary").padEnd(32)} / password123   (ORGANIZER — Juba)`);
  console.log(`  ${em("nyawal").padEnd(32)} / password123   (ORGANIZER — Nairobi)`);
  console.log(`  ${em("lado").padEnd(32)} / password123   (ORGANIZER — Juba)`);
  console.log(`  ${em("taban").padEnd(32)} / password123   (ORGANIZER — Kampala)`);
  console.log(`  ${em("daniel").padEnd(32)} / password123   (ATTENDEE  — Minneapolis)`);
  console.log(`  ${em("rebecca").padEnd(32)} / password123   (ATTENDEE  — Nashville)`);
  console.log(`  ${em("james").padEnd(32)} / password123   (ATTENDEE  — Calgary)`);
  console.log(`  ${em("ayen").padEnd(32)} / password123   (ATTENDEE  — London)`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
