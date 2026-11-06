/**
 * Event templates — pre-filled drafts the organizer can pick to skip
 * the blank-page problem. Each template provides copy that maps onto
 * the EventForm's initial state; the form still asks for dates + venue
 * since those are unique per event.
 *
 * Categories here must match the EventCategory enum in prisma/schema.prisma.
 */

import type { EventCategory } from "@prisma/client";

export type EventTemplate = {
  slug: string;
  name: string;                 // card title
  tagline: string;              // card blurb
  emoji: string;                // decorative marker on the card
  tone: "nile" | "gold" | "acacia" | "clay" | "hibiscus" | "ink";
  category: EventCategory;
  type: "IN_PERSON" | "ONLINE" | "HYBRID";
  preset: {
    title: string;              // suggested event title
    summary: string;            // ≤200 chars — for listings
    description: string;        // long body
    tiers: Array<{ name: string; priceCents: number; quantity: number }>;
  };
};

export const TEMPLATES: EventTemplate[] = [
  {
    slug: "wedding",
    name: "Wedding",
    tagline: "Traditional or modern — RSVPs, family tiers, meal counts.",
    emoji: "💍",
    tone: "gold",
    category: "WEDDING",
    type: "IN_PERSON",
    preset: {
      title: "The [Family Name] Wedding",
      summary: "Join us as we celebrate the union of two families. Traditional ceremony followed by dinner and dancing.",
      description:
`We're honored to invite you to celebrate with us.

Schedule
• 2:00 PM — Ceremony
• 4:00 PM — Reception cocktail
• 6:00 PM — Dinner + traditional program
• 9:00 PM — Dance floor opens

Dress code: Traditional attire or formal
Meals: Seating is assigned; please RSVP by the deadline so we can set the table correctly.
Children are welcome — family tickets include up to 4 seats.`,
      tiers: [
        { name: "Adult guest",    priceCents: 0, quantity: 200 },
        { name: "Family (up to 4)", priceCents: 0, quantity: 50  }
      ]
    }
  },
  {
    slug: "concert",
    name: "Concert",
    tagline: "General admission, VIP, early-bird — ready to sell out.",
    emoji: "🎤",
    tone: "hibiscus",
    category: "MUSIC",
    type: "IN_PERSON",
    preset: {
      title: "[Artist] Live in [City]",
      summary: "An unforgettable night of live music. Doors open one hour before showtime.",
      description:
`Live music from [Artist], with opening sets by local performers.

What to expect
• All-ages, general admission
• Full bar and food available on site
• Merchandise stand open all night

Please arrive early — lines at the door tend to build in the 30 minutes before showtime.`,
      tiers: [
        { name: "Early bird",       priceCents: 2500, quantity: 100 },
        { name: "General admission", priceCents: 4000, quantity: 300 },
        { name: "VIP + meet & greet", priceCents: 9000, quantity: 30  }
      ]
    }
  },
  {
    slug: "church-service",
    name: "Church service",
    tagline: "Sunday service, prayer night, or choir concert.",
    emoji: "⛪",
    tone: "nile",
    category: "FAITH",
    type: "IN_PERSON",
    preset: {
      title: "Sunday Service",
      summary: "Worship, prayer, and fellowship. All are welcome — bring a friend.",
      description:
`We gather each week for worship, scripture, and shared prayer.

Program
• Opening songs (20 min)
• Scripture + sermon (40 min)
• Prayer + blessing
• Fellowship hour with tea + snacks

Children's program runs in parallel for ages 4–12.`,
      tiers: [
        { name: "Open seating", priceCents: 0, quantity: 400 }
      ]
    }
  },
  {
    slug: "cultural-dance",
    name: "Cultural dance",
    tagline: "Traditional performance nights with themed tiers.",
    emoji: "🥁",
    tone: "clay",
    category: "CULTURAL",
    type: "IN_PERSON",
    preset: {
      title: "A Night of Our Cultures — [City]",
      summary: "A showcase of dance, drum, and song from across our tribes.",
      description:
`A celebration of the cultures that make up our community.

On the program
• Opening dance troupe
• Traditional drum ensemble
• Vocal group performance
• Guest performers from sister communities
• Open floor dance after the last set

Traditional attire is encouraged but not required.`,
      tiers: [
        { name: "Standard",        priceCents: 2000, quantity: 250 },
        { name: "Family of four",  priceCents: 7000, quantity: 40  },
        { name: "Front-row table", priceCents: 15000, quantity: 8  }
      ]
    }
  },
  {
    slug: "fundraiser",
    name: "Fundraiser / Gala",
    tagline: "Tiered donations with matched giving options.",
    emoji: "🤝",
    tone: "acacia",
    category: "FUNDRAISER",
    type: "IN_PERSON",
    preset: {
      title: "[Cause] Fundraiser Gala",
      summary: "A night to raise funds and awareness for [cause]. Dinner + silent auction + keynote.",
      description:
`Every ticket directly supports [cause]. 100% of proceeds after venue costs go to the programs below.

What your ticket supports
• Education bursaries
• Community medical supplies
• Emergency response fund

The evening includes dinner, a silent auction, and a keynote from [speaker]. Matched giving from our corporate sponsors doubles every donation up to $10,000.`,
      tiers: [
        { name: "Individual ticket", priceCents: 7500,   quantity: 150 },
        { name: "Supporter",         priceCents: 15000,  quantity: 80  },
        { name: "Table of 8",        priceCents: 100000, quantity: 10  },
        { name: "Benefactor",        priceCents: 50000,  quantity: 20  }
      ]
    }
  },
  {
    slug: "sports-match",
    name: "Sports match",
    tagline: "Friendly match, tournament day, or league finals.",
    emoji: "⚽",
    tone: "nile",
    category: "SPORTS",
    type: "IN_PERSON",
    preset: {
      title: "[Team A] vs [Team B]",
      summary: "A friendly match between two of our community's favorite sides. Food trucks on site.",
      description:
`Gates open one hour before kick-off. Bring water, sunscreen, and your team scarves.

Kick-off: 3:00 PM
Half-time: 4:00 PM — halftime show by [group]
Final whistle: ~5:00 PM

Kids under 10 get free entry with an adult.`,
      tiers: [
        { name: "Standing",        priceCents: 1000, quantity: 500 },
        { name: "Seated (covered)", priceCents: 2500, quantity: 200 },
        { name: "Kids under 10",   priceCents: 0,    quantity: 100 }
      ]
    }
  },
  {
    slug: "networking",
    name: "Networking mixer",
    tagline: "Professional meetup with a speaker and open bar.",
    emoji: "🤵",
    tone: "ink",
    category: "NETWORKING",
    type: "IN_PERSON",
    preset: {
      title: "Community Professionals Mixer",
      summary: "An evening for professionals in our community to connect, learn, and grow. Guest speaker at 7pm.",
      description:
`Bring your business cards and your curiosity.

Evening flow
• 6:00 PM — Doors + first drink on the house
• 7:00 PM — Guest speaker: [speaker name]
• 7:45 PM — Q&A
• 8:00 PM — Open networking

Light canapés will be served throughout.`,
      tiers: [
        { name: "General",       priceCents: 2000, quantity: 120 },
        { name: "Student",       priceCents: 1000, quantity: 30  },
        { name: "Host / speaker", priceCents: 0,    quantity: 10  }
      ]
    }
  },
  {
    slug: "conference",
    name: "Conference",
    tagline: "Multi-session day with speakers and workshops.",
    emoji: "🎯",
    tone: "gold",
    category: "BUSINESS",
    type: "IN_PERSON",
    preset: {
      title: "[Topic] Conference [Year]",
      summary: "A full-day conference with speakers, workshops, and community sessions.",
      description:
`A full-day conference gathering the community to share ideas on [topic].

Programme highlights
• Opening keynote
• Three tracks of breakout sessions
• Hands-on workshops (limited seats)
• Networking lunch
• Closing panel + reception

A detailed schedule will be sent to every ticket-holder the week before.`,
      tiers: [
        { name: "General",        priceCents: 5000,  quantity: 300 },
        { name: "Student",        priceCents: 2500,  quantity: 80  },
        { name: "Workshop add-on", priceCents: 2000,  quantity: 120 },
        { name: "Sponsor table",   priceCents: 50000, quantity: 10  }
      ]
    }
  },
  {
    slug: "online-workshop",
    name: "Online workshop",
    tagline: "Zoom / livestream — single recorded session.",
    emoji: "💻",
    tone: "nile",
    category: "EDUCATION",
    type: "ONLINE",
    preset: {
      title: "[Topic] — Live Online Workshop",
      summary: "A hands-on online workshop. Link delivered with your ticket; replay sent within 48h.",
      description:
`A live online session you can join from anywhere.

What you'll get
• 90-minute interactive session
• Q&A with the instructor
• Recording emailed within 48 hours
• Downloadable worksheet

We use Zoom — the link arrives with your ticket confirmation.`,
      tiers: [
        { name: "Individual",     priceCents: 1500, quantity: 500 },
        { name: "Team (up to 5)", priceCents: 6000, quantity: 30  }
      ]
    }
  }
];

export function findTemplate(slug: string | undefined | null): EventTemplate | undefined {
  if (!slug) return undefined;
  return TEMPLATES.find((t) => t.slug === slug);
}
