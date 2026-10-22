CREATE TABLE vote_ledger (
    sequence_number BIGSERIAL PRIMARY KEY,
    poll_uuid UUID NOT NULL REFERENCES polls(uuid),
    choice_uuid UUID NOT NULL REFERENCES choices(uuid),
    voter_signature VARCHAR(200) NOT NULL,
    tracker_hash VARCHAR(256) NOT NULL,
    record_payload TEXT NOT NULL,
    prev_hash VARCHAR(64) NOT NULL,
    entry_hash VARCHAR(64) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vote_ledger_poll ON vote_ledger (poll_uuid);
CREATE INDEX idx_vote_ledger_seq ON vote_ledger (sequence_number);

CREATE OR REPLACE FUNCTION prevent_vote_ledger_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'vote_ledger is immutable: UPDATE and DELETE operations are forbidden.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_vote_ledger_prevent_update
BEFORE UPDATE ON vote_ledger
FOR EACH ROW
EXECUTE FUNCTION prevent_vote_ledger_modification();

CREATE TRIGGER trg_vote_ledger_prevent_delete
BEFORE DELETE ON vote_ledger
FOR EACH ROW
EXECUTE FUNCTION prevent_vote_ledger_modification();
