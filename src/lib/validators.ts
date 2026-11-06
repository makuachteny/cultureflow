// Zod validators — keep input shape enforcement at the boundary.

import { z } from "zod";

export const signUpSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(128),
  city: z.string().trim().max(80).optional(),
  country: z.string().trim().max(80).optional()
});
export type SignUpInput = z.infer<typeof signUpSchema>;

// Banner image may be a full `https://` URL (external) or a server-local
// `/uploads/<hash>.<ext>` path produced by POST /api/uploads. Blank strings
// collapse to null so the DB column stays nullable-only.
const bannerUrlSchema = z
  .union([
    z.string().url(),
    z.string().regex(/^\/uploads\/[A-Za-z0-9._-]+$/)
  ])
  .nullable()
  .optional()
  .or(z.literal("").transform(() => null));

export const ticketTierSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(500).optional().nullable(),
  priceCents: z.coerce.number().int().min(0).max(100_000_00),
  currency: z.string().length(3).default("USD"),
  quantity: z.coerce.number().int().min(1).max(100_000)
});

// Update variant carries an optional tier id so the server can reconcile
// existing tiers (update by id) vs. new ones (create).
export const ticketTierUpdateSchema = ticketTierSchema.extend({
  id: z.string().min(1).optional()
});

export const eventCreateSchema = z.object({
  title: z.string().min(3).max(160),
  summary: z.string().min(10).max(400),
  description: z.string().min(10).max(20_000),
  category: z.enum([
    "CULTURAL","MUSIC","SPORTS","EDUCATION","FAITH","NETWORKING",
    "WEDDING","COMMUNITY","BUSINESS","FUNDRAISER","FAMILY","OTHER"
  ]),
  type: z.enum(["IN_PERSON","ONLINE","HYBRID"]),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  timezone: z.string().default("UTC"),
  venueName: z.string().max(160).optional().nullable(),
  venueAddress: z.string().max(400).optional().nullable(),
  city: z.string().max(80).optional().nullable(),
  country: z.string().max(80).optional().nullable(),
  onlineUrl: z.string().url().optional().nullable().or(z.literal("").transform(() => null)),
  bannerUrl: bannerUrlSchema,
  capacity: z.coerce.number().int().min(1).max(1_000_000).optional().nullable(),
  ticketTiers: z.array(ticketTierSchema).min(1).max(10),
  // Tribe visibility controls — default "open to everyone"
  tribeVisibility: z
    .enum(["ALL_SOUTH_SUDANESE", "SELECTED_TRIBES", "OWN_TRIBE"])
    .default("ALL_SOUTH_SUDANESE"),
  visibleTribes: z.array(z.string().trim().min(1).max(40)).max(25).default([]),
  publish: z.boolean().default(false)
}).refine((d) => d.endsAt > d.startsAt, {
  message: "End time must be after start time",
  path: ["endsAt"]
}).refine(
  (d) => d.tribeVisibility !== "SELECTED_TRIBES" || d.visibleTribes.length > 0,
  {
    message: "Pick at least one tribe when visibility is 'Selected tribes'.",
    path: ["visibleTribes"]
  }
);
export type EventCreateInput = z.infer<typeof eventCreateSchema>;

// Edit-event payload. Same shape as create, but ticket tiers carry an
// optional id (for reconcile) and `publish` drives a DRAFT/PUBLISHED
// transition instead of initial status.
export const eventUpdateSchema = z.object({
  title: z.string().min(3).max(160),
  summary: z.string().min(10).max(400),
  description: z.string().min(10).max(20_000),
  category: z.enum([
    "CULTURAL","MUSIC","SPORTS","EDUCATION","FAITH","NETWORKING",
    "WEDDING","COMMUNITY","BUSINESS","FUNDRAISER","FAMILY","OTHER"
  ]),
  type: z.enum(["IN_PERSON","ONLINE","HYBRID"]),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  timezone: z.string().default("UTC"),
  venueName: z.string().max(160).optional().nullable(),
  venueAddress: z.string().max(400).optional().nullable(),
  city: z.string().max(80).optional().nullable(),
  country: z.string().max(80).optional().nullable(),
  onlineUrl: z.string().url().optional().nullable().or(z.literal("").transform(() => null)),
  bannerUrl: bannerUrlSchema,
  capacity: z.coerce.number().int().min(1).max(1_000_000).optional().nullable(),
  ticketTiers: z.array(ticketTierUpdateSchema).min(1).max(10),
  tribeVisibility: z
    .enum(["ALL_SOUTH_SUDANESE", "SELECTED_TRIBES", "OWN_TRIBE"])
    .default("ALL_SOUTH_SUDANESE"),
  visibleTribes: z.array(z.string().trim().min(1).max(40)).max(25).default([]),
  publish: z.boolean().optional()
}).refine((d) => d.endsAt > d.startsAt, {
  message: "End time must be after start time",
  path: ["endsAt"]
}).refine(
  (d) => d.tribeVisibility !== "SELECTED_TRIBES" || d.visibleTribes.length > 0,
  {
    message: "Pick at least one tribe when visibility is 'Selected tribes'.",
    path: ["visibleTribes"]
  }
);
export type EventUpdateInput = z.infer<typeof eventUpdateSchema>;

export const commentSchema = z.object({
  body: z.string().trim().min(1).max(2000)
});

export const checkoutSchema = z.object({
  eventId: z.string().min(1),
  items: z.array(z.object({
    tierId: z.string().min(1),
    quantity: z.coerce.number().int().min(1).max(10)
  })).min(1),
  attendeeName: z.string().trim().min(2).max(120),
  attendeeEmail: z.string().trim().toLowerCase().email(),
  /** Optional promo code string, case-insensitive. */
  promoCode: z.string().trim().min(1).max(40).optional(),
  /** Optional override of the provider router's choice. The router still
   *  validates that the provider can handle the order's currency. */
  provider: z.enum(["STRIPE", "MPESA", "MOMO", "MGURUSH", "DEMO"]).optional(),
  /** Mobile-money rails need the buyer's phone number — collected when
   *  the rail's `charge()` returns kind:"needs-input". */
  msisdn: z.string().trim().min(6).max(20).optional(),
  /** Currency the buyer wants to be billed in. Defaults to the detected
   *  geo currency if omitted. The server FX-converts the tier price into
   *  this currency before charging the rail. */
  buyerCurrency: z.enum([
    "USD","GBP","CAD","AUD","EUR","KES","UGX","RWF","TZS","EGP","SSP","SDG"
  ]).optional()
});
export type CheckoutInput = z.infer<typeof checkoutSchema>;
