-- Payments revamp: multi-rail support, reservations, promo codes, connected accounts.
-- Generated for the schema changes in src/lib/payments/, src/lib/reservations.ts, src/lib/promo.ts.

-- New enums
CREATE TYPE "PaymentProvider" AS ENUM ('STRIPE', 'MPESA', 'MOMO', 'MGURUSH', 'DEMO');
CREATE TYPE "PayoutProvider" AS ENUM ('STRIPE_CONNECT', 'MPESA_TILL', 'MOMO_MERCHANT', 'MGURUSH_MERCHANT');
CREATE TYPE "DiscountType"   AS ENUM ('PERCENT', 'FIXED_CENTS');

-- TicketTier — sales window + per-tier order limits
ALTER TABLE "TicketTier"
  ADD COLUMN "salesStartAt" TIMESTAMP(3),
  ADD COLUMN "salesEndAt"   TIMESTAMP(3),
  ADD COLUMN "minPerOrder"  INTEGER,
  ADD COLUMN "maxPerOrder"  INTEGER;

-- Order — fee breakdown + promo link
ALTER TABLE "Order"
  ADD COLUMN "subtotalCents"      INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "discountCents"      INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "processingFeeCents" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "platformFeeCents"   INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "organizerNetCents"  INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "promoCodeId"        TEXT;

-- Backfill subtotalCents from the legacy totalCents so historical orders
-- still report sensibly. (totalCents stayed = subtotal because there was
-- no discount before this migration.)
UPDATE "Order" SET "subtotalCents" = "totalCents";

-- Payment — switch `provider` to enum, add mobile-money + refund tracking columns
ALTER TABLE "Payment"
  ALTER COLUMN "provider" DROP DEFAULT;
ALTER TABLE "Payment"
  ALTER COLUMN "provider" TYPE "PaymentProvider" USING (
    CASE "provider"
      WHEN 'stripe'  THEN 'STRIPE'::"PaymentProvider"
      WHEN 'demo'    THEN 'DEMO'::"PaymentProvider"
      WHEN 'mpesa'   THEN 'MPESA'::"PaymentProvider"
      WHEN 'momo'    THEN 'MOMO'::"PaymentProvider"
      WHEN 'mgurush' THEN 'MGURUSH'::"PaymentProvider"
      ELSE 'STRIPE'::"PaymentProvider"
    END
  );
ALTER TABLE "Payment" ALTER COLUMN "provider" SET DEFAULT 'STRIPE'::"PaymentProvider";
ALTER TABLE "Payment"
  ADD COLUMN "mobileMoneyMsisdn"   TEXT,
  ADD COLUMN "providerFeeCents"    INTEGER,
  ADD COLUMN "refundedAt"          TIMESTAMP(3),
  ADD COLUMN "refundedAmountCents" INTEGER;

CREATE INDEX "Payment_provider_idx" ON "Payment"("provider");
CREATE INDEX "Payment_status_idx"   ON "Payment"("status");

-- Reservation
CREATE TABLE "Reservation" (
  "id"        TEXT NOT NULL,
  "tierId"    TEXT NOT NULL,
  "userId"    TEXT,
  "quantity"  INTEGER NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "orderId"   TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Reservation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Reservation_orderId_key" ON "Reservation"("orderId");
CREATE INDEX "Reservation_tierId_idx"     ON "Reservation"("tierId");
CREATE INDEX "Reservation_userId_idx"     ON "Reservation"("userId");
CREATE INDEX "Reservation_expiresAt_idx"  ON "Reservation"("expiresAt");
ALTER TABLE "Reservation"
  ADD CONSTRAINT "Reservation_tierId_fkey"
  FOREIGN KEY ("tierId") REFERENCES "TicketTier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- PromoCode
CREATE TABLE "PromoCode" (
  "id"            TEXT NOT NULL,
  "code"          TEXT NOT NULL,
  "description"   TEXT,
  "discountType"  "DiscountType" NOT NULL,
  "discountValue" INTEGER NOT NULL,
  "eventId"       TEXT,
  "tierId"        TEXT,
  "startsAt"      TIMESTAMP(3),
  "endsAt"        TIMESTAMP(3),
  "maxUses"       INTEGER,
  "usedCount"     INTEGER NOT NULL DEFAULT 0,
  "maxPerUser"    INTEGER,
  "active"        BOOLEAN NOT NULL DEFAULT true,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PromoCode_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PromoCode_code_key" ON "PromoCode"("code");
CREATE INDEX "PromoCode_eventId_idx"     ON "PromoCode"("eventId");
CREATE INDEX "PromoCode_active_idx"      ON "PromoCode"("active");
ALTER TABLE "PromoCode"
  ADD CONSTRAINT "PromoCode_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Order"
  ADD CONSTRAINT "Order_promoCodeId_fkey"
  FOREIGN KEY ("promoCodeId") REFERENCES "PromoCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Order_promoCodeId_idx" ON "Order"("promoCodeId");

-- ConnectedAccount
CREATE TABLE "ConnectedAccount" (
  "id"          TEXT NOT NULL,
  "userId"      TEXT NOT NULL,
  "provider"    "PayoutProvider" NOT NULL,
  "externalId"  TEXT NOT NULL,
  "payeeMsisdn" TEXT,
  "label"       TEXT,
  "verifiedAt"  TIMESTAMP(3),
  "isDefault"   BOOLEAN NOT NULL DEFAULT false,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ConnectedAccount_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ConnectedAccount_userId_provider_externalId_key"
  ON "ConnectedAccount"("userId", "provider", "externalId");
CREATE INDEX "ConnectedAccount_userId_idx"   ON "ConnectedAccount"("userId");
CREATE INDEX "ConnectedAccount_provider_idx" ON "ConnectedAccount"("provider");
ALTER TABLE "ConnectedAccount"
  ADD CONSTRAINT "ConnectedAccount_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ProviderEvent (generalises StripeEvent)
CREATE TABLE "ProviderEvent" (
  "id"         TEXT NOT NULL,
  "provider"   "PaymentProvider" NOT NULL,
  "type"       TEXT NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProviderEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ProviderEvent_provider_receivedAt_idx" ON "ProviderEvent"("provider", "receivedAt");
