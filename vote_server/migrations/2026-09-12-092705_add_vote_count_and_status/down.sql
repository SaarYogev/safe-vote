ALTER TABLE votes
    DROP COLUMN created_at;

ALTER TABLE choices
    DROP COLUMN created_at;

ALTER TABLE polls
    DROP CONSTRAINT polls_winning_choice_fkey,
    DROP COLUMN winning_choice,
    DROP COLUMN status;
