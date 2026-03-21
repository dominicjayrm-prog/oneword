-- Fix: moderation_log foreign keys to daily_words and profiles lack ON DELETE CASCADE.
-- This blocks deletion of daily_words rows that have moderation_log entries
-- (e.g. when rescheduling words).

ALTER TABLE moderation_log
  DROP CONSTRAINT moderation_log_word_id_fkey,
  ADD CONSTRAINT moderation_log_word_id_fkey
    FOREIGN KEY (word_id) REFERENCES daily_words(id) ON DELETE CASCADE;

ALTER TABLE moderation_log
  DROP CONSTRAINT moderation_log_user_id_fkey,
  ADD CONSTRAINT moderation_log_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
