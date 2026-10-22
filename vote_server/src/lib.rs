#[macro_use]
extern crate rocket;

use std::collections::HashMap;
use std::env;
use std::string::String;

use chrono::{DateTime, NaiveDate, NaiveDateTime, Utc};
use diesel::insert_into;
use diesel::pg::PgConnection;
use diesel::prelude::*;
use rocket::http::Status;
use rocket::response::status::Custom;
use rocket::serde::json::Json;
use uuid::Uuid;

use crate::models::{
    Choice, ChoiceCreationDetails, LedgerAuditResponse, NewChoice, NewPoll, NewVote,
    NewVoteLedgerEntry, Poll, PollCreationDetails, PollResultsResponse, Vote, VoteCreationDetails,
    VoteHistoryItem, VoteHistoryQuery, VoteLedgerEntry,
};
use crate::schema::choices::dsl::choices;
use crate::schema::polls::dsl::polls;
use crate::schema::replay_nonces::dsl::replay_nonces;
use crate::schema::vote_ledger::dsl::vote_ledger;
use crate::schema::votes::dsl::votes;

pub mod schema;
pub mod models;

pub fn is_poll_closed(poll: &Poll) -> bool {
    if poll.status == "closed" {
        return true;
    }

    if let Ok(parsed_utc) = poll.close_date.parse::<DateTime<Utc>>() {
        return Utc::now() >= parsed_utc;
    }

    if let Ok(naive_dt) = NaiveDateTime::parse_from_str(&poll.close_date, "%Y-%m-%d %H:%M:%S") {
        return Utc::now().naive_utc() >= naive_dt;
    }

    if let Ok(naive_date) = NaiveDate::parse_from_str(&poll.close_date, "%Y-%m-%d") {
        if let Some(end_of_day) = naive_date.and_hms_opt(23, 59, 59) {
            return Utc::now().naive_utc() >= end_of_day;
        }
    }

    if let Ok(naive_date) = NaiveDate::parse_from_str(&poll.close_date, "%d/%m/%Y") {
        if let Some(end_of_day) = naive_date.and_hms_opt(23, 59, 59) {
            return Utc::now().naive_utc() >= end_of_day;
        }
    }

    false
}

#[post("/polls", format = "json", data = "<poll_details>")]
pub async fn create_poll_plural(poll_details: Json<PollCreationDetails>) -> String {
    create_poll_handler(poll_details).await
}

#[post("/poll", format = "json", data = "<poll_details>")]
pub async fn create_poll(poll_details: Json<PollCreationDetails>) -> String {
    create_poll_handler(poll_details).await
}

async fn create_poll_handler(poll_details: Json<PollCreationDetails>) -> String {
    let new_poll = NewPoll {
        name: poll_details.name.clone(),
        uuid: Uuid::new_v4(),
        start_date: Utc::now().to_string(),
        close_date: poll_details.close_date.to_string(),
    };

    let mut conn = get_connection();
    insert_into(polls).values(&new_poll).execute(&mut conn).unwrap();

    if let Some(choice_names) = &poll_details.choices {
        for choice_name in choice_names {
            let choice = NewChoice {
                uuid: Uuid::new_v4(),
                name: choice_name.clone(),
                poll_uuid: new_poll.uuid,
            };
            insert_into(choices).values(&choice).execute(&mut conn).unwrap();
        }
    }

    format!("Creating a poll named {}, closing at {}", &new_poll.name, &new_poll.close_date)
}

#[post("/choices", format = "json", data = "<choice_details>")]
pub async fn create_choice_plural(choice_details: Json<ChoiceCreationDetails>) -> String {
    create_choice_handler(choice_details).await
}

#[post("/choice", format = "json", data = "<choice_details>")]
pub async fn create_choice(choice_details: Json<ChoiceCreationDetails>) -> String {
    create_choice_handler(choice_details).await
}

async fn create_choice_handler(choice_details: Json<ChoiceCreationDetails>) -> String {
    let new_choice = NewChoice {
        name: choice_details.name.clone(),
        uuid: Uuid::new_v4(),
        poll_uuid: choice_details.poll_uuid.parse().unwrap(),
    };

    let mut conn = get_connection();
    let choice_query_result = insert_into(choices).values(&new_choice).execute(&mut conn);

    match choice_query_result {
        Ok(_) => format!("Creating a choice named {}, for poll {}", &new_choice.name, &new_choice.poll_uuid),
        Err(error) => panic!("{}", error),
    }
}

#[post("/votes", format = "json", data = "<vote_details>")]
pub async fn cast_vote_plural(vote_details: Json<VoteCreationDetails>) -> Result<String, Custom<String>> {
    cast_vote_handler(vote_details).await
}

#[post("/vote", format = "json", data = "<vote_details>")]
pub async fn cast_vote(vote_details: Json<VoteCreationDetails>) -> Result<String, Custom<String>> {
    cast_vote_handler(vote_details).await
}

#[post("/polls/<_poll_id>/votes", format = "json", data = "<vote_details>")]
pub async fn cast_vote_nested(_poll_id: &str, vote_details: Json<VoteCreationDetails>) -> Result<String, Custom<String>> {
    cast_vote_handler(vote_details).await
}

pub fn canonical_vote_payload(
    poll_id: &Uuid,
    choice_id: &Uuid,
    timestamp: i64,
    nonce: &str,
) -> String {
    format!(
        "{{\"choice_id\":\"{}\",\"nonce\":\"{}\",\"poll_id\":\"{}\",\"timestamp\":{}}}",
        choice_id, nonce, poll_id, timestamp
    )
}

pub fn verify_ed25519_signature(
    public_key_hex: &str,
    signature_hex: &str,
    canonical_payload: &str,
) -> Result<(), String> {
    use ed25519_dalek::{Signature, Verifier, VerifyingKey};

    let pk_bytes = hex::decode(public_key_hex)
        .map_err(|e| format!("Invalid public key hex encoding: {}", e))?;
    let pk_array: [u8; 32] = pk_bytes
        .try_into()
        .map_err(|_| "Public key must be exactly 32 bytes".to_string())?;

    let verifying_key = VerifyingKey::from_bytes(&pk_array)
        .map_err(|e| format!("Invalid Ed25519 public key: {}", e))?;

    let sig_bytes = hex::decode(signature_hex)
        .map_err(|e| format!("Invalid signature hex encoding: {}", e))?;
    let sig_array: [u8; 64] = sig_bytes
        .try_into()
        .map_err(|_| "Signature must be exactly 64 bytes".to_string())?;

    let sig = Signature::from_bytes(&sig_array);

    verifying_key
        .verify(canonical_payload.as_bytes(), &sig)
        .map_err(|e| format!("Signature verification failed: {}", e))
}

pub const NONCE_EXPIRATION_WINDOW_SECS: i64 = 300;

pub fn verify_and_record_nonce(
    conn: &mut PgConnection,
    public_key_hex: &str,
    nonce: &str,
    timestamp: i64,
) -> Result<(), Custom<String>> {
    let current_time = Utc::now().timestamp();
    if (current_time - timestamp).abs() > NONCE_EXPIRATION_WINDOW_SECS {
        return Err(Custom(
            Status::BadRequest,
            format!(
                "Timestamp {} is outside the allowed anti-replay window of {} seconds (current: {})",
                timestamp, NONCE_EXPIRATION_WINDOW_SECS, current_time
            ),
        ));
    }

    let new_nonce = crate::models::NewReplayNonce {
        nonce: nonce.to_string(),
        public_key: public_key_hex.to_string(),
        timestamp,
    };

    diesel::insert_into(replay_nonces)
        .values(&new_nonce)
        .execute(conn)
        .map_err(|e| match e {
            diesel::result::Error::DatabaseError(
                diesel::result::DatabaseErrorKind::UniqueViolation,
                _,
            ) => Custom(
                Status::BadRequest,
                "Nonce has already been used (replay detected)".to_string(),
            ),
            other => Custom(Status::InternalServerError, other.to_string()),
        })?;

    Ok(())
}

async fn cast_vote_handler(vote_details: Json<VoteCreationDetails>) -> Result<String, Custom<String>> {
    let choice_id: Uuid = match vote_details.choice_uuid.parse() {
        Ok(id) => id,
        Err(_) => return Err(Custom(Status::BadRequest, "Invalid choice UUID".to_string())),
    };

    let mut conn = get_connection();

    let target_choice: Option<Choice> = choices
        .filter(crate::schema::choices::uuid.eq(choice_id))
        .first::<Choice>(&mut conn)
        .optional()
        .map_err(|e| Custom(Status::InternalServerError, e.to_string()))?;

    let choice = match target_choice {
        Some(c) => c,
        None => return Err(Custom(Status::NotFound, "Choice not found".to_string())),
    };

    let target_poll: Option<Poll> = polls
        .filter(crate::schema::polls::uuid.eq(choice.poll_uuid))
        .first::<Poll>(&mut conn)
        .optional()
        .map_err(|e| Custom(Status::InternalServerError, e.to_string()))?;

    let poll = match target_poll {
        Some(p) => p,
        None => return Err(Custom(Status::NotFound, "Associated poll not found".to_string())),
    };

    if is_poll_closed(&poll) {
        return Err(Custom(Status::Forbidden, "Poll is closed. Votes are no longer accepted.".to_string()));
    }

    let voter_pk: String = match &vote_details.public_key {
        Some(pk) => pk.clone(),
        None => {
            return Err(Custom(
                Status::BadRequest,
                "Unsigned vote submission: public_key, timestamp, and nonce are required".to_string(),
            ))
        }
    };
    let vote_timestamp: i64 = match vote_details.timestamp {
        Some(ts) => ts,
        None => {
            return Err(Custom(
                Status::BadRequest,
                "Unsigned vote submission: public_key, timestamp, and nonce are required".to_string(),
            ))
        }
    };
    let vote_nonce: String = match &vote_details.nonce {
        Some(n) => n.clone(),
        None => {
            return Err(Custom(
                Status::BadRequest,
                "Unsigned vote submission: public_key, timestamp, and nonce are required".to_string(),
            ))
        }
    };

    let canonical_payload = canonical_vote_payload(&poll.uuid, &choice_id, vote_timestamp, &vote_nonce);

    verify_ed25519_signature(&voter_pk, &vote_details.signature, &canonical_payload)
        .map_err(|e| Custom(Status::BadRequest, format!("Invalid cryptographic signature: {}", e)))?;

    verify_and_record_nonce(&mut conn, &voter_pk, &vote_nonce, vote_timestamp)?;

    let tracker_hash = vote_details.tracker_hash.clone().unwrap_or_else(|| {
        compute_tracker_hash(&choice_id.to_string(), &Uuid::new_v4().to_string())
    });

    let new_vote = NewVote {
        uuid: Uuid::new_v4(),
        signature: voter_pk.clone(),
        choice_uuid: choice_id,
        tracker_hash: Some(tracker_hash.clone()),
    };

    insert_into(votes)
        .values(&new_vote)
        .execute(&mut conn)
        .map_err(|e| Custom(Status::InternalServerError, e.to_string()))?;

    let latest_entry: Option<(i64, String)> = vote_ledger
        .filter(crate::schema::vote_ledger::poll_uuid.eq(choice.poll_uuid))
        .order(crate::schema::vote_ledger::sequence_number.desc())
        .select((crate::schema::vote_ledger::sequence_number, crate::schema::vote_ledger::entry_hash))
        .first::<(i64, String)>(&mut conn)
        .optional()
        .map_err(|e| Custom(Status::InternalServerError, e.to_string()))?;

    let prev_hash = match latest_entry {
        Some((_, h)) => h,
        None => "0".repeat(64),
    };

    let record_payload = format!(
        "{}:{}:{}:{}:{}",
        choice.poll_uuid, choice_id, voter_pk, vote_nonce, tracker_hash
    );

    use sha2::{Digest, Sha256};
    let mut hasher = Sha256::new();
    hasher.update(prev_hash.as_bytes());
    hasher.update(record_payload.as_bytes());
    let entry_hash = hex::encode(hasher.finalize());

    let new_ledger_entry = NewVoteLedgerEntry {
        poll_uuid: choice.poll_uuid,
        choice_uuid: choice_id,
        voter_signature: voter_pk.clone(),
        tracker_hash,
        record_payload,
        prev_hash,
        entry_hash,
    };

    insert_into(vote_ledger)
        .values(&new_ledger_entry)
        .execute(&mut conn)
        .map_err(|e| Custom(Status::InternalServerError, e.to_string()))?;

    Ok(format!("Casting a vote with the signature {}, for choice {}", &new_vote.signature, &new_vote.choice_uuid))
}

pub fn compute_poll_results(
    poll: &Poll,
    conn: &mut PgConnection,
) -> Result<PollResultsResponse, diesel::result::Error> {
    let poll_choices: Vec<Choice> = choices
        .filter(crate::schema::choices::poll_uuid.eq(poll.uuid))
        .load::<Choice>(conn)?;

    let poll_votes: Vec<Vote> = votes
        .inner_join(choices)
        .filter(crate::schema::choices::poll_uuid.eq(poll.uuid))
        .select(votes::all_columns())
        .order_by((crate::schema::votes::signature.asc(), crate::schema::votes::created_at.desc()))
        .load::<Vote>(conn)?;

    let mut distribution: HashMap<Uuid, i64> = HashMap::new();
    for c in &poll_choices {
        distribution.insert(c.uuid, 0);
    }

    let mut counted_signatures = std::collections::HashSet::new();
    for v in poll_votes {
        if counted_signatures.insert(v.signature) {
            *distribution.entry(v.choice_uuid).or_insert(0) += 1;
        }
    }

    let winning_choice = distribution
        .iter()
        .max_by_key(|(_, &count)| count)
        .and_then(|(uuid, &count)| if count > 0 { Some(*uuid) } else { None });

    let current_status = if is_poll_closed(poll) {
        "closed".to_string()
    } else {
        "open".to_string()
    };

    Ok(PollResultsResponse {
        status: current_status,
        winning_choice,
        vote_distribution: distribution,
    })
}

#[get("/polls/<poll_id>/votes")]
pub async fn count_votes(poll_id: String) -> Result<Json<PollResultsResponse>, Custom<String>> {
    let target_poll_uuid = match Uuid::parse_str(&poll_id) {
        Ok(u) => u,
        Err(_) => return Err(Custom(Status::BadRequest, "Invalid poll UUID".to_string())),
    };

    let mut conn = get_connection();

    let poll_exists: Option<Poll> = polls
        .filter(crate::schema::polls::uuid.eq(target_poll_uuid))
        .first::<Poll>(&mut conn)
        .optional()
        .map_err(|e| Custom(Status::InternalServerError, e.to_string()))?;

    let poll = match poll_exists {
        Some(p) => p,
        None => return Err(Custom(Status::NotFound, "Poll not found".to_string())),
    };

    let results = compute_poll_results(&poll, &mut conn)
        .map_err(|e| Custom(Status::InternalServerError, e.to_string()))?;

    Ok(Json(results))
}

#[get("/polls")]
pub async fn get_polls() -> Result<Json<Vec<crate::models::PollDetailsResponse>>, Status> {
    let mut conn = get_connection();
    let all_polls = polls
        .order_by(crate::schema::polls::start_date.desc())
        .load::<Poll>(&mut conn)
        .map_err(|_| Status::InternalServerError)?;

    let mut poll_responses = Vec::with_capacity(all_polls.len());
    for p in all_polls {
        let poll_choices = choices
            .filter(crate::schema::choices::poll_uuid.eq(p.uuid))
            .load::<Choice>(&mut conn)
            .map_err(|_| Status::InternalServerError)?;

        let choice_responses = poll_choices
            .into_iter()
            .map(|c| crate::models::ChoiceResponse {
                uuid: c.uuid,
                name: c.name,
                poll_uuid: c.poll_uuid,
            })
            .collect();

        let current_status = if is_poll_closed(&p) {
            "closed".to_string()
        } else {
            p.status.clone()
        };

        poll_responses.push(crate::models::PollDetailsResponse {
            uuid: p.uuid,
            name: p.name,
            start_date: p.start_date,
            close_date: p.close_date,
            status: current_status,
            choices: choice_responses,
        });
    }

    Ok(Json(poll_responses))
}

#[get("/polls/<poll_id>")]
pub async fn get_poll(poll_id: &str) -> Result<Json<crate::models::PollDetailsResponse>, Status> {
    let parsed_poll_uuid = Uuid::parse_str(poll_id).map_err(|_| Status::BadRequest)?;
    let mut conn = get_connection();

    let found_poll = polls
        .filter(crate::schema::polls::uuid.eq(parsed_poll_uuid))
        .first::<Poll>(&mut conn)
        .optional()
        .map_err(|_| Status::InternalServerError)?
        .ok_or(Status::NotFound)?;

    let poll_choices = choices
        .filter(crate::schema::choices::poll_uuid.eq(parsed_poll_uuid))
        .load::<Choice>(&mut conn)
        .map_err(|_| Status::InternalServerError)?;

    let choice_responses = poll_choices
        .into_iter()
        .map(|c| crate::models::ChoiceResponse {
            uuid: c.uuid,
            name: c.name,
            poll_uuid: c.poll_uuid,
        })
        .collect();

    let current_status = if is_poll_closed(&found_poll) {
        "closed".to_string()
    } else {
        found_poll.status
    };

    Ok(Json(crate::models::PollDetailsResponse {
        uuid: found_poll.uuid,
        name: found_poll.name,
        start_date: found_poll.start_date,
        close_date: found_poll.close_date,
        status: current_status,
        choices: choice_responses,
    }))
}

#[get("/polls/<poll_id>/votes/<voter_signature>")]
pub async fn get_poll_user_vote(
    poll_id: &str,
    voter_signature: &str,
) -> Result<Json<crate::models::VoteResponse>, Status> {
    let parsed_poll_uuid = Uuid::parse_str(poll_id).map_err(|_| Status::BadRequest)?;
    let mut conn = get_connection();

    let _poll_exists = polls
        .filter(crate::schema::polls::uuid.eq(parsed_poll_uuid))
        .first::<Poll>(&mut conn)
        .optional()
        .map_err(|_| Status::InternalServerError)?
        .ok_or(Status::NotFound)?;

    // Join votes with choices to bound query to this poll and resolve the voter's latest ballot revision
    let latest_vote = votes
        .inner_join(choices)
        .filter(crate::schema::choices::poll_uuid.eq(parsed_poll_uuid))
        .filter(crate::schema::votes::signature.eq(voter_signature))
        .order_by(crate::schema::votes::created_at.desc())
        .select(votes::all_columns())
        .first::<Vote>(&mut conn)
        .optional()
        .map_err(|_| Status::InternalServerError)?
        .ok_or(Status::NotFound)?;

    Ok(Json(crate::models::VoteResponse {
        uuid: latest_vote.uuid,
        signature: latest_vote.signature,
        choice_uuid: latest_vote.choice_uuid,
        poll_uuid: parsed_poll_uuid,
        timestamp: latest_vote.created_at.to_string(),
    }))
}

#[get("/votes/<voter_signature>?<query..>")]
pub async fn get_user_vote_history(
    voter_signature: &str,
    query: Option<VoteHistoryQuery>,
) -> Result<Json<Vec<VoteHistoryItem>>, Status> {
    let mut conn = get_connection();

    let mut filter_poll_uuids = Vec::new();
    if let Some(ref q) = query {
        for poll_id_str in &q.poll_id {
            let parsed_id = Uuid::parse_str(poll_id_str).map_err(|_| Status::BadRequest)?;
            filter_poll_uuids.push(parsed_id);
        }
    }

    let user_votes_query = votes
        .inner_join(choices)
        .filter(crate::schema::votes::signature.eq(voter_signature));

    let user_votes_with_choices: Vec<(Vote, Choice)> = if !filter_poll_uuids.is_empty() {
        user_votes_query
            .filter(crate::schema::choices::poll_uuid.eq_any(&filter_poll_uuids))
            .order_by(crate::schema::votes::created_at.desc())
            .select((votes::all_columns(), choices::all_columns()))
            .load::<(Vote, Choice)>(&mut conn)
            .map_err(|_| Status::InternalServerError)?
    } else {
        user_votes_query
            .order_by(crate::schema::votes::created_at.desc())
            .select((votes::all_columns(), choices::all_columns()))
            .load::<(Vote, Choice)>(&mut conn)
            .map_err(|_| Status::InternalServerError)?
    };

    let mut poll_cache: HashMap<Uuid, (Poll, PollResultsResponse)> = HashMap::new();
    let mut history_items = Vec::new();

    for (vote, choice) in user_votes_with_choices {
        let poll_uuid = choice.poll_uuid;

        let (poll, results) = match poll_cache.get(&poll_uuid) {
            Some(cached) => cached.clone(),
            None => {
                let poll = polls
                    .filter(crate::schema::polls::uuid.eq(poll_uuid))
                    .first::<Poll>(&mut conn)
                    .map_err(|_| Status::InternalServerError)?;

                let results = compute_poll_results(&poll, &mut conn)
                    .map_err(|_| Status::InternalServerError)?;

                poll_cache.insert(poll_uuid, (poll.clone(), results.clone()));
                (poll, results)
            }
        };

        let is_closed = is_poll_closed(&poll);
        let poll_status = if is_closed {
            "closed".to_string()
        } else {
            "open".to_string()
        };

        let is_winning_choice = if is_closed {
            match results.winning_choice {
                Some(winner_uuid) => Some(vote.choice_uuid == winner_uuid),
                None => Some(false),
            }
        } else {
            None
        };

        history_items.push(VoteHistoryItem {
            uuid: vote.uuid,
            signature: vote.signature,
            choice_uuid: vote.choice_uuid,
            poll_uuid,
            poll_name: poll.name.clone(),
            choice_name: choice.name.clone(),
            timestamp: vote.created_at.to_string(),
            poll_status,
            is_winning_choice,
        });
    }

    Ok(Json(history_items))
}

pub fn compute_tracker_hash(ballot_choice_id: &str, salt: &str) -> String {
    use sha2::{Digest, Sha256};
    let mut hasher = Sha256::new();
    hasher.update(ballot_choice_id.as_bytes());
    hasher.update(salt.as_bytes());
    hex::encode(hasher.finalize())
}

pub fn compute_merkle_root(trackers: &[String]) -> String {
    use sha2::{Digest, Sha256};
    if trackers.is_empty() {
        return hex::encode(Sha256::digest(b""));
    }
    let mut current_level: Vec<Vec<u8>> = trackers
        .iter()
        .map(|t| hex::decode(t).unwrap_or_else(|_| Sha256::digest(t.as_bytes()).to_vec()))
        .collect();
    while current_level.len() > 1 {
        let mut next_level = Vec::new();
        for chunk in current_level.chunks(2) {
            let mut hasher = Sha256::new();
            hasher.update(&chunk[0]);
            if chunk.len() > 1 {
                hasher.update(&chunk[1]);
            } else {
                hasher.update(&chunk[0]);
            }
            next_level.push(hasher.finalize().to_vec());
        }
        current_level = next_level;
    }
    hex::encode(&current_level[0])
}

#[get("/audit/trackers/<poll_id>")]
pub async fn get_poll_trackers(
    poll_id: &str,
) -> Result<Json<crate::models::PollTrackersResponse>, Status> {
    let parsed_poll_uuid = Uuid::parse_str(poll_id).map_err(|_| Status::BadRequest)?;
    let mut conn = get_connection();

    let target_poll: Option<Poll> = schema::polls::table
        .filter(schema::polls::uuid.eq(parsed_poll_uuid))
        .first::<Poll>(&mut conn)
        .optional()
        .map_err(|_| Status::InternalServerError)?;

    if target_poll.is_none() {
        return Err(Status::NotFound);
    }

    let choice_ids: Vec<Uuid> = schema::choices::table
        .filter(schema::choices::poll_uuid.eq(parsed_poll_uuid))
        .select(schema::choices::uuid)
        .load::<Uuid>(&mut conn)
        .map_err(|_| Status::InternalServerError)?;

    let tracker_hashes: Vec<Option<String>> = schema::votes::table
        .filter(schema::votes::choice_uuid.eq_any(&choice_ids))
        .order(schema::votes::created_at.asc())
        .select(schema::votes::tracker_hash)
        .load::<Option<String>>(&mut conn)
        .map_err(|_| Status::InternalServerError)?;

    let trackers: Vec<String> = tracker_hashes.into_iter().flatten().collect();
    let merkle_root = compute_merkle_root(&trackers);
    let total_votes = trackers.len();

    Ok(Json(crate::models::PollTrackersResponse {
        poll_id: parsed_poll_uuid,
        merkle_root,
        trackers,
        total_votes,
    }))
}

pub fn verify_ledger_chain(entries: &[VoteLedgerEntry], expected_genesis: &str) -> bool {
    use sha2::{Digest, Sha256};
    let mut expected_prev = expected_genesis.to_string();
    for entry in entries {
        if entry.prev_hash != expected_prev {
            return false;
        }
        let mut hasher = Sha256::new();
        hasher.update(entry.prev_hash.as_bytes());
        hasher.update(entry.record_payload.as_bytes());
        let computed_hash = hex::encode(hasher.finalize());
        if entry.entry_hash != computed_hash {
            return false;
        }
        expected_prev = entry.entry_hash.clone();
    }
    true
}

#[get("/audit/ledger/<poll_id>")]
pub async fn get_ledger_audit(
    poll_id: &str,
) -> Result<Json<LedgerAuditResponse>, Status> {
    let parsed_poll_uuid = Uuid::parse_str(poll_id).map_err(|_| Status::BadRequest)?;
    let mut conn = get_connection();

    let target_poll: Option<Poll> = schema::polls::table
        .filter(schema::polls::uuid.eq(parsed_poll_uuid))
        .first::<Poll>(&mut conn)
        .optional()
        .map_err(|_| Status::InternalServerError)?;

    if target_poll.is_none() {
        return Err(Status::NotFound);
    }

    let entries: Vec<VoteLedgerEntry> = schema::vote_ledger::table
        .filter(schema::vote_ledger::poll_uuid.eq(parsed_poll_uuid))
        .order(schema::vote_ledger::sequence_number.asc())
        .load::<VoteLedgerEntry>(&mut conn)
        .map_err(|_| Status::InternalServerError)?;

    let entries_count = entries.len();
    let head_entry = entries.last();
    let head_sequence = head_entry.map(|e| e.sequence_number);
    let head_hash = head_entry.map(|e| e.entry_hash.clone());
    let prev_hash = head_entry.map(|e| e.prev_hash.clone());

    let genesis = "0".repeat(64);
    let chain_valid = verify_ledger_chain(&entries, &genesis);

    Ok(Json(LedgerAuditResponse {
        poll_id: parsed_poll_uuid,
        head_sequence,
        head_hash,
        prev_hash,
        entries_count,
        chain_valid,
        entries,
    }))
}

pub fn get_connection() -> PgConnection {
    let database_url = env::var("DATABASE_URL").unwrap();
    PgConnection::establish(&database_url)
        .unwrap_or_else(|_| panic!("Error connecting to {}", database_url))
}

pub fn rocket_app() -> rocket::Rocket<rocket::Build> {
    rocket::build().mount(
        "/",
        routes![
            create_poll,
            create_poll_plural,
            get_polls,
            get_poll,
            create_choice,
            create_choice_plural,
            cast_vote,
            cast_vote_plural,
            cast_vote_nested,
            count_votes,
            get_poll_user_vote,
            get_user_vote_history,
            get_poll_trackers,
            get_ledger_audit,
        ],
    )
}

