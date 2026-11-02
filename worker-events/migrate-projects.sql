-- ============================================================
-- Expo projects — what /projects shows, one row per exhibit.
--   wrangler d1 execute anvesha --local  --persist-to ../worker/.wrangler/state --file=./migrate-projects.sql
--   wrangler d1 execute anvesha --remote --file=./migrate-projects.sql
--
-- Same D1 as everything else. Additive: it creates one table and touches nothing
-- that already exists, so it is safe to run against a live database.
-- ============================================================

CREATE TABLE IF NOT EXISTS projects (
  project_id  INTEGER PRIMARY KEY AUTOINCREMENT,
  -- Three-letter subject code: BIO, PHY, CHE, MAT, DAT, EES. Validated by the Worker,
  -- not a CHECK here, so adding a subject is a code change and not a table rebuild.
  subject     TEXT NOT NULL,
  -- 1, 2, 3 … within the subject; shown as BIO-01. Assigned by the Worker as the
  -- subject's highest number plus one, so a deleted project leaves a gap rather than
  -- renumbering every exhibit after it.
  project_no  INTEGER NOT NULL CHECK (project_no > 0),
  title       TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  -- JSON array of names, in the order they were typed: ["Asha R", "Vivek M"].
  team        TEXT NOT NULL DEFAULT '[]',
  -- R2 key in the merch bucket: projects/BIO_01.jpg. NULL until a photo is uploaded.
  image_path  TEXT,

  -- Copied off the admin's session rather than joined to admin_login, same as every
  -- other audit column in this database: the shared password means admin_login rows
  -- get their token cleared on logout, and a join would go blank exactly when needed.
  created_by_name  TEXT NOT NULL,
  created_by_roll  TEXT NOT NULL,
  created_by_email TEXT NOT NULL,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_by_name  TEXT,
  updated_by_roll  TEXT,
  updated_at       TEXT,

  -- Two projects can never both be BIO-03: the code is the exhibit's name on the
  -- floor and the name of its photo in R2.
  UNIQUE (subject, project_no)
);
