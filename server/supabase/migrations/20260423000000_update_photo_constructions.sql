-- Migration to change construction to constructions (array)
ALTER TABLE "Photos" RENAME COLUMN construction TO construction_old;
ALTER TABLE "Photos" ADD COLUMN constructions TEXT[] DEFAULT '{}';

-- Migration existing data (optional, depends on if we want to keep it)
UPDATE "Photos" SET constructions = ARRAY[construction_old] WHERE construction_old IS NOT NULL;

ALTER TABLE "Photos" DROP COLUMN construction_old;
