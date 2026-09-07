-- Additive: remember whether the user's last search asked for businesses with
-- no website of their own. Existing rows default to 0 (search everything).
ALTER TABLE pitch_profiles ADD COLUMN last_without_website INTEGER NOT NULL DEFAULT 0;
