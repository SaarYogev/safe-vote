use chrono::Utc;
use diesel::insert_into;
use diesel::prelude::*;
use rocket::http::{ContentType, Status};
use rocket::local::blocking::Client;
use rocket::serde::json::serde_json;
use uuid::Uuid;
use vote_server::get_connection;
use vote_server::models::{NewChoice, NewPoll, NewVote, Poll, PollResultsResponse};
use vote_server::rocket_app;
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
