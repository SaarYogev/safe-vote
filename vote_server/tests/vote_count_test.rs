use chrono::Utc;
use diesel::insert_into;
use diesel::prelude::*;
use rocket::http::{ContentType, Status};
use rocket::local::blocking::Client;
use rocket::serde::json::serde_json;
use uuid::Uuid;
use vote_server::{
    canonical_vote_payload, compute_tracker_hash, get_connection, rocket_app, verify_ledger_chain,
};
use vote_server::models::{
    LedgerAuditResponse, NewChoice, NewPoll, NewVote, Poll, PollDetailsResponse,
    PollResultsResponse, PollTrackersResponse, VoteCreationDetails, VoteHistoryItem,
};
use vote_server::schema::choices::dsl::choices;
use vote_server::schema::polls::dsl::polls;
use vote_server::schema::votes::dsl::votes;

fn create_test_signed_vote(
    poll_id: Uuid,
    choice_id: Uuid,
    tracker_hash: Option<String>,
) -> (VoteCreationDetails, String, ed25519_dalek::SigningKey) {
    use ed25519_dalek::Signer;
    let seed = Uuid::new_v4();
    let mut seed_bytes = [0u8; 32];
    seed_bytes[..16].copy_from_slice(seed.as_bytes());
    seed_bytes[16..].copy_from_slice(seed.as_bytes());
    let signing_key = ed25519_dalek::SigningKey::from_bytes(&seed_bytes);
    let public_key = hex::encode(signing_key.verifying_key().to_bytes());
    let timestamp = Utc::now().timestamp();
    let nonce = Uuid::new_v4().to_string();

    let canonical = canonical_vote_payload(&poll_id, &choice_id, timestamp, &nonce);
    let sig = signing_key.sign(canonical.as_bytes());
    let signature = hex::encode(sig.to_bytes());

    (
        VoteCreationDetails {
            choice_uuid: choice_id.to_string(),
            signature,
            tracker_hash,
            public_key: Some(public_key.clone()),
            timestamp: Some(timestamp),
            nonce: Some(nonce),
        },
        public_key,
        signing_key,
    )
}

fn create_test_signed_vote_with_key(
    poll_id: Uuid,
    choice_id: Uuid,
    signing_key: &ed25519_dalek::SigningKey,
    tracker_hash: Option<String>,
) -> VoteCreationDetails {
    use ed25519_dalek::Signer;
    let public_key = hex::encode(signing_key.verifying_key().to_bytes());
    let timestamp = Utc::now().timestamp();
    let nonce = Uuid::new_v4().to_string();

    let canonical = canonical_vote_payload(&poll_id, &choice_id, timestamp, &nonce);
    let sig = signing_key.sign(canonical.as_bytes());
    let signature = hex::encode(sig.to_bytes());

    VoteCreationDetails {
        choice_uuid: choice_id.to_string(),
        signature,
        tracker_hash,
        public_key: Some(public_key),
        timestamp: Some(timestamp),
        nonce: Some(nonce),
    }
}

#[test]
fn test_count_votes_empty_poll() {
    let mut conn = get_connection();
    let poll_uuid = Uuid::new_v4();
    let new_poll = NewPoll {
        uuid: poll_uuid,
        name: "Empty Poll".to_string(),
        start_date: Utc::now().to_string(),
        close_date: "2099-12-31".to_string(),
    };
    insert_into(polls).values(&new_poll).execute(&mut conn).unwrap();

    let client = Client::tracked(rocket_app()).expect("valid rocket instance");
    let res = client.get(format!("/polls/{}/votes", poll_uuid)).dispatch();
    assert_eq!(res.status(), Status::Ok);

    let body: PollResultsResponse = res.into_json().expect("valid json response");
    assert_eq!(body.status, "open");
    assert_eq!(body.winning_choice, None);
    assert!(body.vote_distribution.is_empty());

    let unchanged_poll: Poll = polls
        .filter(vote_server::schema::polls::uuid.eq(poll_uuid))
        .first::<Poll>(&mut conn)
        .unwrap();
    assert_eq!(unchanged_poll.status, "open");
}

#[test]
fn test_count_votes_latest_unique_vote_and_distribution() {
    let mut conn = get_connection();
    let poll_uuid = Uuid::new_v4();
    let new_poll = NewPoll {
        uuid: poll_uuid,
        name: "Favorite Language".to_string(),
        start_date: Utc::now().to_string(),
        close_date: "2099-12-31".to_string(),
    };
    insert_into(polls).values(&new_poll).execute(&mut conn).unwrap();

    let choice_rust = Uuid::new_v4();
    let choice_python = Uuid::new_v4();

    insert_into(choices)
        .values(&vec![
            NewChoice {
                uuid: choice_rust,
                name: "Rust".to_string(),
                poll_uuid,
            },
            NewChoice {
                uuid: choice_python,
                name: "Python".to_string(),
                poll_uuid,
            },
        ])
        .execute(&mut conn)
        .unwrap();

    insert_into(votes)
        .values(&NewVote {
            uuid: Uuid::new_v4(),
            signature: "voter_1_signature".to_string(),
            choice_uuid: choice_python,
            tracker_hash: None,
        })
        .execute(&mut conn)
        .unwrap();

    std::thread::sleep(std::time::Duration::from_millis(10));

    insert_into(votes)
        .values(&NewVote {
            uuid: Uuid::new_v4(),
            signature: "voter_1_signature".to_string(),
            choice_uuid: choice_rust,
            tracker_hash: None,
        })
        .execute(&mut conn)
        .unwrap();

    insert_into(votes)
        .values(&NewVote {
            uuid: Uuid::new_v4(),
            signature: "voter_2_signature".to_string(),
            choice_uuid: choice_rust,
            tracker_hash: None,
        })
        .execute(&mut conn)
        .unwrap();

    insert_into(votes)
        .values(&NewVote {
            uuid: Uuid::new_v4(),
            signature: "voter_3_signature".to_string(),
            choice_uuid: choice_python,
            tracker_hash: None,
        })
        .execute(&mut conn)
        .unwrap();

    let client = Client::tracked(rocket_app()).expect("valid rocket instance");
    let res = client.get(format!("/polls/{}/votes", poll_uuid)).dispatch();
    assert_eq!(res.status(), Status::Ok);

    let body: PollResultsResponse = res.into_json().expect("valid json response");
    assert_eq!(body.status, "open");
    assert_eq!(body.winning_choice, Some(choice_rust));
    assert_eq!(body.vote_distribution.get(&choice_rust), Some(&2));
    assert_eq!(body.vote_distribution.get(&choice_python), Some(&1));

    let db_poll: Poll = polls
        .filter(vote_server::schema::polls::uuid.eq(poll_uuid))
        .first::<Poll>(&mut conn)
        .unwrap();
    assert_eq!(db_poll.status, "open");
}

#[test]
fn test_closed_poll_status_and_rejects_votes() {
    let mut conn = get_connection();
    let poll_uuid = Uuid::new_v4();
    let new_poll = NewPoll {
        uuid: poll_uuid,
        name: "Expired Poll".to_string(),
        start_date: "2020-01-01".to_string(),
        close_date: "2020-01-02".to_string(),
    };
    insert_into(polls).values(&new_poll).execute(&mut conn).unwrap();

    let choice_uuid = Uuid::new_v4();
    insert_into(choices)
        .values(&NewChoice {
            uuid: choice_uuid,
            name: "Expired Choice".to_string(),
            poll_uuid,
        })
        .execute(&mut conn)
        .unwrap();

    let client = Client::tracked(rocket_app()).expect("valid rocket instance");

    let count_res = client.get(format!("/polls/{}/votes", poll_uuid)).dispatch();
    assert_eq!(count_res.status(), Status::Ok);
    let count_body: PollResultsResponse = count_res.into_json().expect("valid json response");
    assert_eq!(count_body.status, "closed");

    let vote_payload = serde_json::json!({
        "signature": "late_voter",
        "choice_uuid": choice_uuid.to_string(),
    });
    let vote_res = client.post("/vote")
        .header(ContentType::JSON)
        .body(vote_payload.to_string())
        .dispatch();
    assert_eq!(vote_res.status(), Status::Forbidden);
}

#[test]
fn test_count_votes_non_existent_poll() {
    let client = Client::tracked(rocket_app()).expect("valid rocket instance");
    let random_uuid = Uuid::new_v4();
    let res = client.get(format!("/polls/{}/votes", random_uuid)).dispatch();
    assert_eq!(res.status(), Status::NotFound);
}

#[test]
fn test_count_votes_invalid_uuid() {
    let client = Client::tracked(rocket_app()).expect("valid rocket instance");
    let res = client.get("/polls/invalid-uuid-string/votes").dispatch();
    assert_eq!(res.status(), Status::BadRequest);
}

#[test]
fn test_create_poll_and_get_details() {
    let client = Client::tracked(rocket_app()).expect("valid rocket instance");
    let response = client
        .post("/polls")
        .header(ContentType::JSON)
        .body(r#"{"name":"Test Election","close_date":"2026-12-31T00:00:00Z","choices":["Alice","Bob"]}"#)
        .dispatch();

    assert_eq!(response.status(), Status::Ok);

    let mut conn = get_connection();
    let poll: Poll = polls
        .filter(vote_server::schema::polls::name.eq("Test Election"))
        .first::<Poll>(&mut conn)
        .unwrap();

    let get_response = client
        .get(format!("/polls/{}", poll.uuid))
        .dispatch();
    assert_eq!(get_response.status(), Status::Ok);
    let fetched_poll: vote_server::models::PollDetailsResponse =
        get_response.into_json().expect("valid json response");
    assert_eq!(fetched_poll.uuid, poll.uuid);
    assert_eq!(fetched_poll.choices.len(), 2);
}

#[test]
fn test_embedded_choices_in_poll() {
    let client = Client::tracked(rocket_app()).expect("valid rocket instance");
    let poll_res = client
        .post("/polls")
        .header(ContentType::JSON)
        .body(r#"{"name":"Embedded Choices Poll","close_date":"2099-12-31","choices":["Option 1","Option 2"]}"#)
        .dispatch();
    assert_eq!(poll_res.status(), Status::Ok);

    let mut conn = get_connection();
    let poll: Poll = polls
        .filter(vote_server::schema::polls::name.eq("Embedded Choices Poll"))
        .first::<Poll>(&mut conn)
        .unwrap();

    let get_res = client
        .get(format!("/polls/{}", poll.uuid))
        .dispatch();
    assert_eq!(get_res.status(), Status::Ok);
    let poll_details: vote_server::models::PollDetailsResponse =
        get_res.into_json().expect("valid json response");
    assert_eq!(poll_details.choices.len(), 2);
    assert_eq!(poll_details.choices[0].name, "Option 1");
    assert_eq!(poll_details.choices[1].name, "Option 2");
}

#[test]
fn test_get_latest_user_vote_for_poll() {
    let client = Client::tracked(rocket_app()).expect("valid rocket instance");
    let poll_uuid = Uuid::new_v4();
    let mut conn = get_connection();

    insert_into(polls)
        .values(&NewPoll {
            uuid: poll_uuid,
            name: "Candidate Race".to_string(),
            start_date: Utc::now().to_string(),
            close_date: "2099-12-31".to_string(),
        })
        .execute(&mut conn)
        .unwrap();

    let choice_1 = Uuid::new_v4();
    let choice_2 = Uuid::new_v4();
    insert_into(choices)
        .values(&vec![
            NewChoice {
                uuid: choice_1,
                name: "Candidate 1".to_string(),
                poll_uuid,
            },
            NewChoice {
                uuid: choice_2,
                name: "Candidate 2".to_string(),
                poll_uuid,
            },
        ])
        .execute(&mut conn)
        .unwrap();

    let (payload_1, voter_pubkey, signing_key) = create_test_signed_vote(poll_uuid, choice_1, None);

    // Vote for Choice 1
    let vote_1_res = client
        .post("/vote")
        .header(ContentType::JSON)
        .body(serde_json::to_string(&payload_1).unwrap())
        .dispatch();
    assert_eq!(vote_1_res.status(), Status::Ok);

    // Initial check: voter's vote is Choice 1
    let query_1 = client
        .get(format!("/polls/{}/votes/{}", poll_uuid, voter_pubkey))
        .dispatch();
    assert_eq!(query_1.status(), Status::Ok);
    let vote_data_1: vote_server::models::VoteResponse =
        query_1.into_json().expect("valid json response");
    assert_eq!(vote_data_1.choice_uuid, choice_1);
    assert_eq!(vote_data_1.signature, voter_pubkey);
    assert!(!vote_data_1.timestamp.is_empty());

    std::thread::sleep(std::time::Duration::from_millis(15));

    let payload_2 = create_test_signed_vote_with_key(poll_uuid, choice_2, &signing_key, None);
    let vote_2_res = client
        .post("/vote")
        .header(ContentType::JSON)
        .body(serde_json::to_string(&payload_2).unwrap())
        .dispatch();
    assert_eq!(vote_2_res.status(), Status::Ok);

    // Latest vote should now be Choice 2
    let query_2 = client
        .get(format!("/polls/{}/votes/{}", poll_uuid, voter_pubkey))
        .dispatch();
    assert_eq!(query_2.status(), Status::Ok);
    let vote_data_2: vote_server::models::VoteResponse =
        query_2.into_json().expect("valid json response");
    assert_eq!(vote_data_2.choice_uuid, choice_2);
    assert_eq!(vote_data_2.signature, voter_pubkey);
}

#[test]
fn test_get_user_vote_not_found() {
    let client = Client::tracked(rocket_app()).expect("valid rocket instance");
    let random_poll = Uuid::new_v4();
    let res = client
        .get(format!("/polls/{}/votes/unknown_signature", random_poll))
        .dispatch();
    assert_eq!(res.status(), Status::NotFound);
}

#[test]
fn test_get_user_vote_history_empty() {
    let client = Client::tracked(rocket_app()).expect("valid rocket instance");
    let voter_sig = format!("history_voter_{}", Uuid::new_v4());
    let res = client
        .get(format!("/votes/{}", voter_sig))
        .dispatch();
    assert_eq!(res.status(), Status::Ok);
    let history: Vec<VoteHistoryItem> = res.into_json().expect("valid json list");
    assert!(history.is_empty());
}

#[test]
fn test_get_user_vote_history_open_and_closed_polls() {
    let mut conn = get_connection();
    let client = Client::tracked(rocket_app()).expect("valid rocket instance");

    let voter_sig = format!("voter_{}", Uuid::new_v4());

    let open_poll_uuid = Uuid::new_v4();
    insert_into(polls)
        .values(&NewPoll {
            uuid: open_poll_uuid,
            name: "Open Poll".to_string(),
            start_date: Utc::now().to_string(),
            close_date: "2099-12-31".to_string(),
        })
        .execute(&mut conn)
        .unwrap();

    let open_choice_1 = Uuid::new_v4();
    let open_choice_2 = Uuid::new_v4();
    insert_into(choices)
        .values(&vec![
            NewChoice {
                uuid: open_choice_1,
                name: "Open Choice 1".to_string(),
                poll_uuid: open_poll_uuid,
            },
            NewChoice {
                uuid: open_choice_2,
                name: "Open Choice 2".to_string(),
                poll_uuid: open_poll_uuid,
            },
        ])
        .execute(&mut conn)
        .unwrap();

    let closed_poll_uuid = Uuid::new_v4();
    insert_into(polls)
        .values(&NewPoll {
            uuid: closed_poll_uuid,
            name: "Closed Poll".to_string(),
            start_date: "2020-01-01".to_string(),
            close_date: "2020-01-02".to_string(),
        })
        .execute(&mut conn)
        .unwrap();

    let closed_winning_choice = Uuid::new_v4();
    let closed_losing_choice = Uuid::new_v4();
    insert_into(choices)
        .values(&vec![
            NewChoice {
                uuid: closed_winning_choice,
                name: "Closed Choice Winner".to_string(),
                poll_uuid: closed_poll_uuid,
            },
            NewChoice {
                uuid: closed_losing_choice,
                name: "Closed Choice Loser".to_string(),
                poll_uuid: closed_poll_uuid,
            },
        ])
        .execute(&mut conn)
        .unwrap();

    insert_into(votes)
        .values(&vec![
            NewVote {
                uuid: Uuid::new_v4(),
                signature: voter_sig.clone(),
                choice_uuid: closed_winning_choice,
                tracker_hash: None,
            },
            NewVote {
                uuid: Uuid::new_v4(),
                signature: format!("other_voter_{}", Uuid::new_v4()),
                choice_uuid: closed_winning_choice,
                tracker_hash: None,
            },
            NewVote {
                uuid: Uuid::new_v4(),
                signature: format!("third_voter_{}", Uuid::new_v4()),
                choice_uuid: closed_losing_choice,
                tracker_hash: None,
            },
        ])
        .execute(&mut conn)
        .unwrap();

    std::thread::sleep(std::time::Duration::from_millis(10));

    insert_into(votes)
        .values(&NewVote {
            uuid: Uuid::new_v4(),
            signature: voter_sig.clone(),
            choice_uuid: open_choice_1,
            tracker_hash: None,
        })
        .execute(&mut conn)
        .unwrap();

    let history_res = client.get(format!("/votes/{}", voter_sig)).dispatch();
    assert_eq!(history_res.status(), Status::Ok);
    let items: Vec<VoteHistoryItem> = history_res.into_json().expect("valid json list");
    assert_eq!(items.len(), 2);

    let open_item = items.iter().find(|i| i.poll_uuid == open_poll_uuid).expect("open poll item found");
    assert_eq!(open_item.poll_name, "Open Poll");
    assert_eq!(open_item.choice_name, "Open Choice 1");
    assert_eq!(open_item.poll_status, "open");
    assert_eq!(open_item.is_winning_choice, None);
    assert_eq!(open_item.choice_uuid, open_choice_1);

    let closed_item = items.iter().find(|i| i.poll_uuid == closed_poll_uuid).expect("closed poll item found");
    assert_eq!(closed_item.poll_name, "Closed Poll");
    assert_eq!(closed_item.choice_name, "Closed Choice Winner");
    assert_eq!(closed_item.poll_status, "closed");
    assert_eq!(closed_item.is_winning_choice, Some(true));
    assert_eq!(closed_item.choice_uuid, closed_winning_choice);
}

#[test]
fn test_get_user_vote_history_filter_by_polls() {
    let mut conn = get_connection();
    let client = Client::tracked(rocket_app()).expect("valid rocket instance");

    let voter_sig = format!("filter_voter_{}", Uuid::new_v4());

    let poll_1 = Uuid::new_v4();
    let poll_2 = Uuid::new_v4();
    let poll_3 = Uuid::new_v4();

    for (p_id, p_name) in &[(poll_1, "Poll 1"), (poll_2, "Poll 2"), (poll_3, "Poll 3")] {
        insert_into(polls)
            .values(&NewPoll {
                uuid: *p_id,
                name: p_name.to_string(),
                start_date: Utc::now().to_string(),
                close_date: "2099-12-31".to_string(),
            })
            .execute(&mut conn)
            .unwrap();

        let ch = Uuid::new_v4();
        insert_into(choices)
            .values(&NewChoice {
                uuid: ch,
                name: format!("Choice for {}", p_name),
                poll_uuid: *p_id,
            })
            .execute(&mut conn)
            .unwrap();

        insert_into(votes)
            .values(&NewVote {
                uuid: Uuid::new_v4(),
                signature: voter_sig.clone(),
                choice_uuid: ch,
                tracker_hash: None,
            })
            .execute(&mut conn)
            .unwrap();
    }

    let res_single = client
        .get(format!("/votes/{}?poll_id={}", voter_sig, poll_1))
        .dispatch();
    assert_eq!(res_single.status(), Status::Ok);
    let items_single: Vec<VoteHistoryItem> = res_single.into_json().expect("valid json list");
    assert_eq!(items_single.len(), 1);
    assert_eq!(items_single[0].poll_uuid, poll_1);

    let res_multi = client
        .get(format!("/votes/{}?poll_id={}&poll_id={}", voter_sig, poll_1, poll_2))
        .dispatch();
    assert_eq!(res_multi.status(), Status::Ok);
    let items_multi: Vec<VoteHistoryItem> = res_multi.into_json().expect("valid json list");
    assert_eq!(items_multi.len(), 2);
    let poll_uuids: Vec<Uuid> = items_multi.iter().map(|i| i.poll_uuid).collect();
    assert!(poll_uuids.contains(&poll_1));
    assert!(poll_uuids.contains(&poll_2));
    assert!(!poll_uuids.contains(&poll_3));

    let res_invalid = client
        .get(format!("/votes/{}?poll_id=invalid-uuid", voter_sig))
        .dispatch();
    assert_eq!(res_invalid.status(), Status::BadRequest);
}

#[test]
fn test_get_user_vote_history_closed_poll_losing_choice() {
    let mut conn = get_connection();
    let client = Client::tracked(rocket_app()).expect("valid rocket instance");

    let voter_sig = format!("loser_voter_{}", Uuid::new_v4());

    let closed_poll_uuid = Uuid::new_v4();
    insert_into(polls)
        .values(&NewPoll {
            uuid: closed_poll_uuid,
            name: "Closed Election".to_string(),
            start_date: "2020-01-01".to_string(),
            close_date: "2020-01-02".to_string(),
        })
        .execute(&mut conn)
        .unwrap();

    let winning_choice = Uuid::new_v4();
    let losing_choice = Uuid::new_v4();
    insert_into(choices)
        .values(&vec![
            NewChoice {
                uuid: winning_choice,
                name: "Winner Choice".to_string(),
                poll_uuid: closed_poll_uuid,
            },
            NewChoice {
                uuid: losing_choice,
                name: "Loser Choice".to_string(),
                poll_uuid: closed_poll_uuid,
            },
        ])
        .execute(&mut conn)
        .unwrap();

    insert_into(votes)
        .values(&NewVote {
            uuid: Uuid::new_v4(),
            signature: voter_sig.clone(),
            choice_uuid: losing_choice,
            tracker_hash: None,
        })
        .execute(&mut conn)
        .unwrap();

    insert_into(votes)
        .values(&NewVote {
            uuid: Uuid::new_v4(),
            signature: format!("another_{}", Uuid::new_v4()),
            choice_uuid: winning_choice,
            tracker_hash: None,
        })
        .execute(&mut conn)
        .unwrap();

    insert_into(votes)
        .values(&NewVote {
            uuid: Uuid::new_v4(),
            signature: format!("third_{}", Uuid::new_v4()),
            choice_uuid: winning_choice,
            tracker_hash: None,
        })
        .execute(&mut conn)
        .unwrap();

    let res = client.get(format!("/votes/{}", voter_sig)).dispatch();
    assert_eq!(res.status(), Status::Ok);
    let items: Vec<VoteHistoryItem> = res.into_json().expect("valid json list");
    assert_eq!(items.len(), 1);
    assert_eq!(items[0].poll_status, "closed");
    assert_eq!(items[0].choice_uuid, losing_choice);
    assert_eq!(items[0].is_winning_choice, Some(false));
}

#[test]
fn test_get_polls_listing_with_status_and_choices() {
    let mut conn = vote_server::get_connection();
    let client = Client::tracked(vote_server::rocket_app()).expect("valid rocket instance");

    let open_poll_uuid = Uuid::new_v4();
    let open_poll = NewPoll {
        uuid: open_poll_uuid,
        name: "Open Poll Listing Test".to_string(),
        start_date: Utc::now().to_string(),
        close_date: "2099-12-31".to_string(),
    };
    insert_into(polls).values(&open_poll).execute(&mut conn).unwrap();

    let choice_1 = NewChoice {
        uuid: Uuid::new_v4(),
        name: "Option A".to_string(),
        poll_uuid: open_poll_uuid,
    };
    let choice_2 = NewChoice {
        uuid: Uuid::new_v4(),
        name: "Option B".to_string(),
        poll_uuid: open_poll_uuid,
    };
    insert_into(choices).values(&vec![choice_1, choice_2]).execute(&mut conn).unwrap();

    let closed_poll_uuid = Uuid::new_v4();
    let closed_poll = NewPoll {
        uuid: closed_poll_uuid,
        name: "Closed Poll Listing Test".to_string(),
        start_date: Utc::now().to_string(),
        close_date: "2000-01-01".to_string(),
    };
    insert_into(polls).values(&closed_poll).execute(&mut conn).unwrap();

    let res = client.get("/polls").dispatch();
    assert_eq!(res.status(), Status::Ok);

    let all_polls: Vec<PollDetailsResponse> = res.into_json().expect("valid json poll list");
    
    let found_open = all_polls.iter().find(|p| p.uuid == open_poll_uuid).expect("open poll found");
    assert_eq!(found_open.name, "Open Poll Listing Test");
    assert_eq!(found_open.status, "open");
    assert_eq!(found_open.choices.len(), 2);

    let found_closed = all_polls.iter().find(|p| p.uuid == closed_poll_uuid).expect("closed poll found");
    assert_eq!(found_closed.name, "Closed Poll Listing Test");
    assert_eq!(found_closed.status, "closed");
}

#[test]
fn test_receipt_endpoint_is_unrouted_and_returns_404() {
    let client = Client::tracked(rocket_app()).expect("valid rocket instance");
    let res = client.get("/receipt/123").dispatch();
    assert_eq!(res.status(), Status::NotFound);

    let res_uuid = client.get(format!("/receipt/{}", Uuid::new_v4())).dispatch();
    assert_eq!(res_uuid.status(), Status::NotFound);
}

#[test]
fn test_cast_vote_with_tracker_hash_and_audit_trackers() {
    let mut conn = get_connection();
    let poll_uuid = Uuid::new_v4();
    let new_poll = NewPoll {
        uuid: poll_uuid,
        name: "Tracker Audit Poll".to_string(),
        start_date: Utc::now().to_string(),
        close_date: "2099-12-31".to_string(),
    };
    insert_into(polls).values(&new_poll).execute(&mut conn).unwrap();

    let choice_uuid = Uuid::new_v4();
    let new_choice = NewChoice {
        uuid: choice_uuid,
        name: "Option 1".to_string(),
        poll_uuid,
    };
    insert_into(choices).values(&new_choice).execute(&mut conn).unwrap();

    let client = Client::tracked(rocket_app()).expect("valid rocket instance");

    let client_salt_1 = "salt_voter_alpha";
    let tracker_1 = compute_tracker_hash(&choice_uuid.to_string(), client_salt_1);
    let (vote_payload_1, _, _) = create_test_signed_vote(poll_uuid, choice_uuid, Some(tracker_1.clone()));
    let cast_res_1 = client
        .post(format!("/polls/{}/votes", poll_uuid))
        .header(ContentType::JSON)
        .body(serde_json::to_string(&vote_payload_1).unwrap())
        .dispatch();
    assert_eq!(cast_res_1.status(), Status::Ok);

    let client_salt_2 = "salt_voter_beta";
    let tracker_2 = compute_tracker_hash(&choice_uuid.to_string(), client_salt_2);
    let (vote_payload_2, _, _) = create_test_signed_vote(poll_uuid, choice_uuid, Some(tracker_2.clone()));
    let cast_res_2 = client
        .post("/vote")
        .header(ContentType::JSON)
        .body(serde_json::to_string(&vote_payload_2).unwrap())
        .dispatch();
    assert_eq!(cast_res_2.status(), Status::Ok);

    let audit_res = client
        .get(format!("/audit/trackers/{}", poll_uuid))
        .dispatch();
    assert_eq!(audit_res.status(), Status::Ok);

    let audit_body: PollTrackersResponse = audit_res.into_json().expect("valid tracker response");
    assert_eq!(audit_body.poll_id, poll_uuid);
    assert_eq!(audit_body.total_votes, 2);
    assert!(audit_body.trackers.contains(&tracker_1));
    assert!(audit_body.trackers.contains(&tracker_2));
    assert_eq!(audit_body.merkle_root.len(), 64);
}

#[test]
fn test_audit_trackers_invalid_and_not_found() {
    let client = Client::tracked(rocket_app()).expect("valid rocket instance");

    let invalid_res = client.get("/audit/trackers/not-a-uuid").dispatch();
    assert_eq!(invalid_res.status(), Status::BadRequest);

    let not_found_res = client.get(format!("/audit/trackers/{}", Uuid::new_v4())).dispatch();
    assert_eq!(not_found_res.status(), Status::NotFound);
}

#[test]
fn test_vote_ledger_monotonic_append_and_audit() {
    let mut conn = get_connection();
    let poll_uuid = Uuid::new_v4();
    let new_poll = NewPoll {
        uuid: poll_uuid,
        name: "Ledger Monotonic Poll".to_string(),
        start_date: Utc::now().to_string(),
        close_date: "2099-12-31".to_string(),
    };
    insert_into(polls).values(&new_poll).execute(&mut conn).unwrap();

    let choice_uuid = Uuid::new_v4();
    let new_choice = NewChoice {
        uuid: choice_uuid,
        name: "Choice 1".to_string(),
        poll_uuid,
    };
    insert_into(choices).values(&new_choice).execute(&mut conn).unwrap();

    let client = Client::tracked(rocket_app()).expect("valid rocket instance");

    let (payload_1, _, _) = create_test_signed_vote(
        poll_uuid,
        choice_uuid,
        Some(compute_tracker_hash(&choice_uuid.to_string(), "salt1")),
    );
    let cast_res_1 = client
        .post(format!("/polls/{}/votes", poll_uuid))
        .header(ContentType::JSON)
        .body(serde_json::to_string(&payload_1).unwrap())
        .dispatch();
    assert_eq!(cast_res_1.status(), Status::Ok);

    let (payload_2, _, _) = create_test_signed_vote(
        poll_uuid,
        choice_uuid,
        Some(compute_tracker_hash(&choice_uuid.to_string(), "salt2")),
    );
    let cast_res_2 = client
        .post(format!("/polls/{}/votes", poll_uuid))
        .header(ContentType::JSON)
        .body(serde_json::to_string(&payload_2).unwrap())
        .dispatch();
    assert_eq!(cast_res_2.status(), Status::Ok);

    let audit_res = client
        .get(format!("/audit/ledger/{}", poll_uuid))
        .dispatch();
    assert_eq!(audit_res.status(), Status::Ok);

    let audit_data: LedgerAuditResponse = audit_res.into_json().expect("valid ledger audit");
    assert_eq!(audit_data.poll_id, poll_uuid);
    assert_eq!(audit_data.entries_count, 2);
    assert!(audit_data.chain_valid);
    assert!(audit_data.entries[1].sequence_number > audit_data.entries[0].sequence_number);
    assert_eq!(audit_data.entries[1].prev_hash, audit_data.entries[0].entry_hash);
    assert_eq!(audit_data.head_hash, Some(audit_data.entries[1].entry_hash.clone()));
}

#[test]
fn test_vote_ledger_immutability_trigger_blocks_update_and_delete() {
    let mut conn = get_connection();
    let poll_uuid = Uuid::new_v4();
    let new_poll = NewPoll {
        uuid: poll_uuid,
        name: "Ledger Immutable Poll".to_string(),
        start_date: Utc::now().to_string(),
        close_date: "2099-12-31".to_string(),
    };
    insert_into(polls).values(&new_poll).execute(&mut conn).unwrap();

    let choice_uuid = Uuid::new_v4();
    let new_choice = NewChoice {
        uuid: choice_uuid,
        name: "Choice Immutability".to_string(),
        poll_uuid,
    };
    insert_into(choices).values(&new_choice).execute(&mut conn).unwrap();

    let client = Client::tracked(rocket_app()).expect("valid rocket instance");
    let (payload, _, _) = create_test_signed_vote(
        poll_uuid,
        choice_uuid,
        Some(compute_tracker_hash(&choice_uuid.to_string(), "salt_imm")),
    );
    let cast_res = client
        .post(format!("/polls/{}/votes", poll_uuid))
        .header(ContentType::JSON)
        .body(serde_json::to_string(&payload).unwrap())
        .dispatch();
    assert_eq!(cast_res.status(), Status::Ok);

    let update_result = diesel::sql_query("UPDATE vote_ledger SET voter_signature = 'tampered' WHERE poll_uuid = $1")
        .bind::<diesel::sql_types::Uuid, _>(poll_uuid)
        .execute(&mut conn);
    assert!(update_result.is_err(), "Direct SQL update must fail due to trigger");
    let update_err = update_result.unwrap_err().to_string();
    assert!(update_err.contains("vote_ledger is immutable"), "Error should mention immutability trigger");

    let delete_result = diesel::sql_query("DELETE FROM vote_ledger WHERE poll_uuid = $1")
        .bind::<diesel::sql_types::Uuid, _>(poll_uuid)
        .execute(&mut conn);
    assert!(delete_result.is_err(), "Direct SQL delete must fail due to trigger");
    let delete_err = delete_result.unwrap_err().to_string();
    assert!(delete_err.contains("vote_ledger is immutable"), "Error should mention immutability trigger");
}

#[test]
fn test_vote_ledger_tamper_detection_breaks_chain() {
    let mut conn = get_connection();
    let poll_uuid = Uuid::new_v4();
    let new_poll = NewPoll {
        uuid: poll_uuid,
        name: "Ledger Tamper Detection".to_string(),
        start_date: Utc::now().to_string(),
        close_date: "2099-12-31".to_string(),
    };
    insert_into(polls).values(&new_poll).execute(&mut conn).unwrap();

    let choice_uuid = Uuid::new_v4();
    let new_choice = NewChoice {
        uuid: choice_uuid,
        name: "Choice Tamper".to_string(),
        poll_uuid,
    };
    insert_into(choices).values(&new_choice).execute(&mut conn).unwrap();

    let client = Client::tracked(rocket_app()).expect("valid rocket instance");
    for i in 0..3 {
        let (payload, _, _) = create_test_signed_vote(
            poll_uuid,
            choice_uuid,
            Some(compute_tracker_hash(&choice_uuid.to_string(), &format!("salt_{}", i))),
        );
        let res = client
            .post(format!("/polls/{}/votes", poll_uuid))
            .header(ContentType::JSON)
            .body(serde_json::to_string(&payload).unwrap())
            .dispatch();
        assert_eq!(res.status(), Status::Ok);
    }

    let audit_res = client
        .get(format!("/audit/ledger/{}", poll_uuid))
        .dispatch();
    assert_eq!(audit_res.status(), Status::Ok);

    let audit_data: LedgerAuditResponse = audit_res.into_json().expect("valid ledger audit");
    assert!(audit_data.chain_valid);

    let genesis = "0".repeat(64);
    let mut tampered_entries = audit_data.entries.clone();
    tampered_entries[1].record_payload = "tampered_ballot_record".to_string();
    assert!(!verify_ledger_chain(&tampered_entries, &genesis), "Tampering record_payload must break chain verification");

    let mut tampered_prev = audit_data.entries.clone();
    tampered_prev[2].prev_hash = "f".repeat(64);
    assert!(!verify_ledger_chain(&tampered_prev, &genesis), "Tampering prev_hash must break chain verification");
}

#[test]
fn test_unsigned_vote_payload_rejected_with_400() {
    let mut conn = get_connection();
    let poll_uuid = Uuid::new_v4();
    let new_poll = NewPoll {
        uuid: poll_uuid,
        name: "Unsigned Test Poll".to_string(),
        start_date: Utc::now().to_string(),
        close_date: "2099-12-31".to_string(),
    };
    insert_into(polls).values(&new_poll).execute(&mut conn).unwrap();

    let choice_uuid = Uuid::new_v4();
    let new_choice = NewChoice {
        uuid: choice_uuid,
        name: "Choice Unsigned".to_string(),
        poll_uuid,
    };
    insert_into(choices).values(&new_choice).execute(&mut conn).unwrap();

    let client = Client::tracked(rocket_app()).expect("valid rocket instance");

    let unsigned_payload = VoteCreationDetails {
        choice_uuid: choice_uuid.to_string(),
        signature: "unsigned_dummy_signature".to_string(),
        tracker_hash: None,
        public_key: None,
        timestamp: None,
        nonce: None,
    };
    let res = client
        .post(format!("/polls/{}/votes", poll_uuid))
        .header(ContentType::JSON)
        .body(serde_json::to_string(&unsigned_payload).unwrap())
        .dispatch();
    assert_eq!(res.status(), Status::BadRequest);
}

#[test]
fn test_tampered_payload_or_invalid_signature_rejected() {
    let mut conn = get_connection();
    let poll_uuid = Uuid::new_v4();
    let new_poll = NewPoll {
        uuid: poll_uuid,
        name: "Signature Verification Poll".to_string(),
        start_date: Utc::now().to_string(),
        close_date: "2099-12-31".to_string(),
    };
    insert_into(polls).values(&new_poll).execute(&mut conn).unwrap();

    let choice_1 = Uuid::new_v4();
    let choice_2 = Uuid::new_v4();
    insert_into(choices)
        .values(&vec![
            NewChoice {
                uuid: choice_1,
                name: "Choice 1".to_string(),
                poll_uuid,
            },
            NewChoice {
                uuid: choice_2,
                name: "Choice 2".to_string(),
                poll_uuid,
            },
        ])
        .execute(&mut conn)
        .unwrap();

    let client = Client::tracked(rocket_app()).expect("valid rocket instance");

    let (mut payload_corrupted, _, _) = create_test_signed_vote(poll_uuid, choice_1, None);
    payload_corrupted.signature = "0".repeat(128);
    let res_corrupted = client
        .post("/vote")
        .header(ContentType::JSON)
        .body(serde_json::to_string(&payload_corrupted).unwrap())
        .dispatch();
    assert_eq!(res_corrupted.status(), Status::BadRequest);

    let (mut payload_tampered, _, _) = create_test_signed_vote(poll_uuid, choice_1, None);
    payload_tampered.choice_uuid = choice_2.to_string();
    let res_tampered = client
        .post("/vote")
        .header(ContentType::JSON)
        .body(serde_json::to_string(&payload_tampered).unwrap())
        .dispatch();
    assert_eq!(res_tampered.status(), Status::BadRequest);
}

#[test]
fn test_anti_replay_nonce_duplicate_rejected() {
    let mut conn = get_connection();
    let poll_uuid = Uuid::new_v4();
    let new_poll = NewPoll {
        uuid: poll_uuid,
        name: "Anti-Replay Poll".to_string(),
        start_date: Utc::now().to_string(),
        close_date: "2099-12-31".to_string(),
    };
    insert_into(polls).values(&new_poll).execute(&mut conn).unwrap();

    let choice_uuid = Uuid::new_v4();
    let new_choice = NewChoice {
        uuid: choice_uuid,
        name: "Choice Replay".to_string(),
        poll_uuid,
    };
    insert_into(choices).values(&new_choice).execute(&mut conn).unwrap();

    let client = Client::tracked(rocket_app()).expect("valid rocket instance");

    let (payload, _, _) = create_test_signed_vote(poll_uuid, choice_uuid, None);

    let first_res = client
        .post(format!("/polls/{}/votes", poll_uuid))
        .header(ContentType::JSON)
        .body(serde_json::to_string(&payload).unwrap())
        .dispatch();
    assert_eq!(first_res.status(), Status::Ok);

    let replay_res = client
        .post(format!("/polls/{}/votes", poll_uuid))
        .header(ContentType::JSON)
        .body(serde_json::to_string(&payload).unwrap())
        .dispatch();
    assert_eq!(replay_res.status(), Status::BadRequest);
}

#[test]
fn test_expired_timestamp_outside_window_rejected() {
    use ed25519_dalek::Signer;
    let mut conn = get_connection();
    let poll_uuid = Uuid::new_v4();
    let new_poll = NewPoll {
        uuid: poll_uuid,
        name: "Timestamp Window Poll".to_string(),
        start_date: Utc::now().to_string(),
        close_date: "2099-12-31".to_string(),
    };
    insert_into(polls).values(&new_poll).execute(&mut conn).unwrap();

    let choice_uuid = Uuid::new_v4();
    let new_choice = NewChoice {
        uuid: choice_uuid,
        name: "Choice Window".to_string(),
        poll_uuid,
    };
    insert_into(choices).values(&new_choice).execute(&mut conn).unwrap();

    let client = Client::tracked(rocket_app()).expect("valid rocket instance");

    let expired_timestamp = Utc::now().timestamp() - 350;
    let seed = Uuid::new_v4();
    let mut seed_bytes = [0u8; 32];
    seed_bytes[..16].copy_from_slice(seed.as_bytes());
    seed_bytes[16..].copy_from_slice(seed.as_bytes());
    let signing_key = ed25519_dalek::SigningKey::from_bytes(&seed_bytes);
    let public_key = hex::encode(signing_key.verifying_key().to_bytes());
    let nonce = Uuid::new_v4().to_string();

    let canonical = canonical_vote_payload(&poll_uuid, &choice_uuid, expired_timestamp, &nonce);
    let sig = signing_key.sign(canonical.as_bytes());
    let signature = hex::encode(sig.to_bytes());

    let expired_payload = VoteCreationDetails {
        choice_uuid: choice_uuid.to_string(),
        signature,
        tracker_hash: None,
        public_key: Some(public_key),
        timestamp: Some(expired_timestamp),
        nonce: Some(nonce),
    };

    let res = client
        .post("/vote")
        .header(ContentType::JSON)
        .body(serde_json::to_string(&expired_payload).unwrap())
        .dispatch();
    assert_eq!(res.status(), Status::BadRequest);
}





