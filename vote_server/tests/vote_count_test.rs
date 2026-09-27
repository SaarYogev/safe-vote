use chrono::Utc;
use diesel::insert_into;
use diesel::prelude::*;
use rocket::http::{ContentType, Status};
use rocket::local::blocking::Client;
use rocket::serde::json::serde_json;
use uuid::Uuid;
use vote_server::{get_connection, rocket_app};
use vote_server::models::{
    NewChoice, NewPoll, NewVote, Poll, PollDetailsResponse, PollResultsResponse, VoteHistoryItem,
};
use vote_server::schema::choices::dsl::choices;
use vote_server::schema::polls::dsl::polls;
use vote_server::schema::votes::dsl::votes;

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
        })
        .execute(&mut conn)
        .unwrap();

    std::thread::sleep(std::time::Duration::from_millis(10));

    insert_into(votes)
        .values(&NewVote {
            uuid: Uuid::new_v4(),
            signature: "voter_1_signature".to_string(),
            choice_uuid: choice_rust,
        })
        .execute(&mut conn)
        .unwrap();

    insert_into(votes)
        .values(&NewVote {
            uuid: Uuid::new_v4(),
            signature: "voter_2_signature".to_string(),
            choice_uuid: choice_rust,
        })
        .execute(&mut conn)
        .unwrap();

    insert_into(votes)
        .values(&NewVote {
            uuid: Uuid::new_v4(),
            signature: "voter_3_signature".to_string(),
            choice_uuid: choice_python,
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

    let voter_sig = format!("voter_{}", Uuid::new_v4());

    // Vote for Choice 1
    let vote_1_res = client
        .post("/vote")
        .header(ContentType::JSON)
        .body(format!(r#"{{"signature":"{}","choice_uuid":"{}"}}"#, voter_sig, choice_1))
        .dispatch();
    assert_eq!(vote_1_res.status(), Status::Ok);

    // Initial check: voter's vote is Choice 1
    let query_1 = client
        .get(format!("/polls/{}/votes/{}", poll_uuid, voter_sig))
        .dispatch();
    assert_eq!(query_1.status(), Status::Ok);
    let vote_data_1: vote_server::models::VoteResponse =
        query_1.into_json().expect("valid json response");
    assert_eq!(vote_data_1.choice_uuid, choice_1);
    assert_eq!(vote_data_1.signature, voter_sig);
    assert!(!vote_data_1.timestamp.is_empty());

    std::thread::sleep(std::time::Duration::from_millis(15));

    // Re-vote for Choice 2
    let vote_2_res = client
        .post("/vote")
        .header(ContentType::JSON)
        .body(format!(r#"{{"signature":"{}","choice_uuid":"{}"}}"#, voter_sig, choice_2))
        .dispatch();
    assert_eq!(vote_2_res.status(), Status::Ok);

    // Latest vote should now be Choice 2
    let query_2 = client
        .get(format!("/polls/{}/votes/{}", poll_uuid, voter_sig))
        .dispatch();
    assert_eq!(query_2.status(), Status::Ok);
    let vote_data_2: vote_server::models::VoteResponse =
        query_2.into_json().expect("valid json response");
    assert_eq!(vote_data_2.choice_uuid, choice_2);
    assert_eq!(vote_data_2.signature, voter_sig);
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
            },
            NewVote {
                uuid: Uuid::new_v4(),
                signature: format!("other_voter_{}", Uuid::new_v4()),
                choice_uuid: closed_winning_choice,
            },
            NewVote {
                uuid: Uuid::new_v4(),
                signature: format!("third_voter_{}", Uuid::new_v4()),
                choice_uuid: closed_losing_choice,
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
        })
        .execute(&mut conn)
        .unwrap();

    let history_res = client.get(format!("/votes/{}", voter_sig)).dispatch();
    assert_eq!(history_res.status(), Status::Ok);
    let items: Vec<VoteHistoryItem> = history_res.into_json().expect("valid json list");
    assert_eq!(items.len(), 2);

    let open_item = items.iter().find(|i| i.poll_uuid == open_poll_uuid).expect("open poll item found");
    assert_eq!(open_item.poll_status, "open");
    assert_eq!(open_item.is_winning_choice, None);
    assert_eq!(open_item.choice_uuid, open_choice_1);

    let closed_item = items.iter().find(|i| i.poll_uuid == closed_poll_uuid).expect("closed poll item found");
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
        })
        .execute(&mut conn)
        .unwrap();

    insert_into(votes)
        .values(&NewVote {
            uuid: Uuid::new_v4(),
            signature: format!("another_{}", Uuid::new_v4()),
            choice_uuid: winning_choice,
        })
        .execute(&mut conn)
        .unwrap();

    insert_into(votes)
        .values(&NewVote {
            uuid: Uuid::new_v4(),
            signature: format!("third_{}", Uuid::new_v4()),
            choice_uuid: winning_choice,
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



