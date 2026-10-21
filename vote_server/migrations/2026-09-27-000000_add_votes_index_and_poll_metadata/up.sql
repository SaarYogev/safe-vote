CREATE INDEX IF NOT EXISTS idx_votes_signature_created_at ON votes (signature, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_votes_created_at ON votes (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_choices_poll_uuid ON choices (poll_uuid);
