CREATE TABLE replay_nonces (
    nonce VARCHAR(128) PRIMARY KEY,
    public_key VARCHAR(128) NOT NULL,
    timestamp BIGINT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_replay_nonces_timestamp ON replay_nonces(timestamp);
