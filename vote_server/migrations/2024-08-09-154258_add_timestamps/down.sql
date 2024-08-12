ALTER TABLE polls
    DROP COLUMN created_at;
ALTER TABLE choices
    DROP COLUMN created_at;
ALTER TABLE votes
    DROP COLUMN created_at;