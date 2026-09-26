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
    votes (uuid) {
        uuid -> Uuid,
        signature -> Varchar,
        choice_uuid -> Uuid,
        created_at -> Timestamp,
    }
}

diesel::joinable!(votes -> choices (choice_uuid));

diesel::allow_tables_to_appear_in_same_query!(
    choices,
    polls,
    votes,
);
