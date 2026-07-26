-- Physical vs digital product flag. Digital products skip shipping/ongkir at checkout.
ALTER TABLE "products" ADD COLUMN "is_digital" BOOLEAN NOT NULL DEFAULT false;
