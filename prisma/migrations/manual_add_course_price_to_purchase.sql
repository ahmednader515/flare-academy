-- Add coursePrice column to Purchase table
ALTER TABLE "Purchase" ADD COLUMN IF NOT EXISTS "coursePrice" DOUBLE PRECISION;

-- Backfill existing purchases with the course price
UPDATE "Purchase" p
SET "coursePrice" = c.price
FROM "Course" c
WHERE p."courseId" = c.id AND p."coursePrice" IS NULL;

