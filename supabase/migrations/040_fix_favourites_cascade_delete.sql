-- =============================================
-- Fix favourites foreign keys to cascade on delete
-- Without ON DELETE CASCADE, deleting a description
-- or profile that is referenced by favourites fails
-- with a foreign key constraint violation.
-- =============================================

-- Fix description_id foreign key
ALTER TABLE favourites
  DROP CONSTRAINT favourites_description_id_fkey,
  ADD CONSTRAINT favourites_description_id_fkey
    FOREIGN KEY (description_id) REFERENCES descriptions(id) ON DELETE CASCADE;

-- Fix user_id foreign key
ALTER TABLE favourites
  DROP CONSTRAINT favourites_user_id_fkey,
  ADD CONSTRAINT favourites_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
