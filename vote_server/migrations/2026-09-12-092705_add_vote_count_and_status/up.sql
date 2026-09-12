ALTER TABLE polls
    ADD COLUMN status VARCHAR(50) NOT NULL DEFAULT 'open',
    ADD COLUMN winning_choice uuid,
    ADD CONSTRAINT polls_winning_choice_fkey FOREIGN KEY (winning_choice) REFERENCES choices(uuid);

ALTER TABLE choices
    ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT NOW();

ALTER TABLE votes
    ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT NOW();
