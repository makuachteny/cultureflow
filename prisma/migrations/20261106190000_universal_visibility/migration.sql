-- CultureFlow is now for every culture and community, not one country.
-- The "open to everyone" visibility value was named ALL_SOUTH_SUDANESE;
-- rename it in place (existing rows keep their value, now called EVERYONE).
ALTER TYPE "TribeVisibility" RENAME VALUE 'ALL_SOUTH_SUDANESE' TO 'EVERYONE';
