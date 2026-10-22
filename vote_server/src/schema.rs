// @generated automatically by Diesel CLI.

diesel::table! {
    choices (uuid) {
        uuid -> Uuid,
        name -> Varchar,
        poll_uuid -> Uuid,
        created_at -> Timestamp,
    }
}

diesel::table! {
    polls (uuid) {
        uuid -> Uuid,
        name -> Varchar,
        start_date -> Varchar,
        close_date -> Varchar,
        status -> Varchar,
        winning_choice -> Nullable<Uuid>,
    }
}

diesel::table! {
    replay_nonces (nonce) {
        nonce -> Varchar,
        public_key -> Varchar,
        timestamp -> Int8,
        created_at -> Timestamp,
    }
}

diesel::table! {
    vote_ledger (sequence_number) {
        sequence_number -> Int8,
        poll_uuid -> Uuid,
        choice_uuid -> Uuid,
        voter_signature -> Varchar,
        tracker_hash -> Varchar,
        record_payload -> Text,
        prev_hash -> Varchar,
        entry_hash -> Varchar,
        created_at -> Timestamp,
    }
}

diesel::table! {
    votes (uuid) {
        uuid -> Uuid,
        signature -> Varchar,
        choice_uuid -> Uuid,
        created_at -> Timestamp,
        tracker_hash -> Nullable<Varchar>,
    }
}

diesel::joinable!(vote_ledger -> choices (choice_uuid));
diesel::joinable!(vote_ledger -> polls (poll_uuid));
diesel::joinable!(votes -> choices (choice_uuid));

diesel::allow_tables_to_appear_in_same_query!(
    choices,
    polls,
    replay_nonces,
    vote_ledger,
    votes,
);
