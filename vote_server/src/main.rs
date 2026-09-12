#[macro_use]
extern crate rocket;
#[macro_use]
extern crate diesel;

use std::env;
use std::string::String;

use chrono::Utc;
use diesel::pg::PgConnection;
use diesel::prelude::*;
use diesel::{insert_into, Connection};
use rocket::http::Status;
use rocket::response::status::Custom;
use rocket::serde::json::Json;
use uuid::Uuid;

use crate::models::{
    Choice, ChoiceCreationDetails, ChoiceResponse, Poll, PollCreationDetails, PollDetailsResponse,
    Vote, VoteCreationDetails, VoteResponse,
};
use crate::schema::choices::dsl::{choices, poll_uuid as choice_poll_uuid};
use crate::schema::polls::dsl::{polls, uuid as poll_table_uuid};
use crate::schema::votes::dsl::{
    choice_uuid as vote_choice_uuid, signature as vote_signature, timestamp as vote_timestamp,
    votes,
};

pub mod models;
pub mod schema;

#[post("/polls", format = "json", data = "<poll_details>")]
async fn create_poll_v2(poll_details: Json<PollCreationDetails>) -> (Status, Json<PollDetailsResponse>) {
    let poll = Poll {
        name: poll_details.name.clone(),
        uuid: Uuid::new_v4(),
        start_date: Utc::now().to_rfc3339(),
        close_date: poll_details.close_date.to_string(),
    };

    let mut conn = get_connection();
    insert_into(polls).values(&poll).execute(&mut conn).unwrap();

    let mut choice_responses = Vec::new();
    if let Some(choice_names) = &poll_details.choices {
        for choice_name in choice_names {
            let choice = Choice {
                name: choice_name.clone(),
                uuid: Uuid::new_v4(),
                poll_uuid: poll.uuid,
            };
            insert_into(choices).values(&choice).execute(&mut conn).unwrap();
            choice_responses.push(ChoiceResponse {
                uuid: choice.uuid,
                name: choice.name,
                poll_uuid: choice.poll_uuid,
            });
        }
    }

    (
        Status::Created,
        Json(PollDetailsResponse {
            uuid: poll.uuid,
            name: poll.name,
            start_date: poll.start_date,
            close_date: poll.close_date,
            choices: choice_responses,
        }),
    )
}

#[get("/polls/<poll_id>")]
async fn get_poll(poll_id: &str) -> Result<Json<PollDetailsResponse>, Status> {
    let parsed_poll_uuid = Uuid::parse_str(poll_id).map_err(|_| Status::BadRequest)?;
    let mut conn = get_connection();

    let found_poll = polls
        .filter(poll_table_uuid.eq(parsed_poll_uuid))
        .first::<Poll>(&mut conn)
        .optional()
        .map_err(|_| Status::InternalServerError)?
        .ok_or(Status::NotFound)?;

    let poll_choices = choices
        .filter(choice_poll_uuid.eq(parsed_poll_uuid))
        .load::<Choice>(&mut conn)
        .map_err(|_| Status::InternalServerError)?;

    let choice_responses = poll_choices
        .into_iter()
        .map(|c| ChoiceResponse {
            uuid: c.uuid,
            name: c.name,
            poll_uuid: c.poll_uuid,
        })
        .collect();

    Ok(Json(PollDetailsResponse {
        uuid: found_poll.uuid,
        name: found_poll.name,
        start_date: found_poll.start_date,
        close_date: found_poll.close_date,
        choices: choice_responses,
    }))
}

#[post("/polls/<poll_id>/choices", format = "json", data = "<choice_details>")]
async fn create_poll_choice(
    poll_id: &str,
    choice_details: Json<ChoiceCreationDetails>,
) -> Result<Custom<Json<ChoiceResponse>>, Status> {
    let parsed_poll_uuid = Uuid::parse_str(poll_id).map_err(|_| Status::BadRequest)?;
    let mut conn = get_connection();

    let _poll_exists = polls
        .filter(poll_table_uuid.eq(parsed_poll_uuid))
        .first::<Poll>(&mut conn)
        .optional()
        .map_err(|_| Status::InternalServerError)?
        .ok_or(Status::NotFound)?;

    let choice = Choice {
        name: choice_details.name.clone(),
        uuid: Uuid::new_v4(),
        poll_uuid: parsed_poll_uuid,
    };

    insert_into(choices)
        .values(&choice)
        .execute(&mut conn)
        .map_err(|_| Status::InternalServerError)?;

    Ok(Custom(
        Status::Created,
        Json(ChoiceResponse {
            uuid: choice.uuid,
            name: choice.name,
            poll_uuid: choice.poll_uuid,
        }),
    ))
}

#[get("/polls/<poll_id>/choices")]
async fn get_poll_choices(poll_id: &str) -> Result<Json<Vec<ChoiceResponse>>, Status> {
    let parsed_poll_uuid = Uuid::parse_str(poll_id).map_err(|_| Status::BadRequest)?;
    let mut conn = get_connection();

    let _poll_exists = polls
        .filter(poll_table_uuid.eq(parsed_poll_uuid))
        .first::<Poll>(&mut conn)
        .optional()
        .map_err(|_| Status::InternalServerError)?
        .ok_or(Status::NotFound)?;

    let poll_choices = choices
        .filter(choice_poll_uuid.eq(parsed_poll_uuid))
        .load::<Choice>(&mut conn)
        .map_err(|_| Status::InternalServerError)?;

    let choice_responses = poll_choices
        .into_iter()
        .map(|c| ChoiceResponse {
            uuid: c.uuid,
            name: c.name,
            poll_uuid: c.poll_uuid,
        })
        .collect();

    Ok(Json(choice_responses))
}

#[post("/polls/<poll_id>/votes", format = "json", data = "<vote_details>")]
async fn cast_poll_vote(
    poll_id: &str,
    vote_details: Json<VoteCreationDetails>,
) -> Result<Custom<Json<VoteResponse>>, Status> {
    let parsed_poll_uuid = Uuid::parse_str(poll_id).map_err(|_| Status::BadRequest)?;
    let parsed_choice_uuid =
        Uuid::parse_str(&vote_details.choice_uuid).map_err(|_| Status::BadRequest)?;

    let mut conn = get_connection();

    // Verify choice belongs to the specified poll to avoid cross-poll ballot tampering
    let choice = choices
        .filter(crate::schema::choices::dsl::uuid.eq(parsed_choice_uuid))
        .first::<Choice>(&mut conn)
        .optional()
        .map_err(|_| Status::InternalServerError)?
        .ok_or(Status::NotFound)?;

    if choice.poll_uuid != parsed_poll_uuid {
        return Err(Status::BadRequest);
    }

    let vote = Vote {
        uuid: Uuid::new_v4(),
        signature: vote_details.signature.clone(),
        choice_uuid: parsed_choice_uuid,
        timestamp: Utc::now().to_rfc3339(),
    };

    insert_into(votes)
        .values(&vote)
        .execute(&mut conn)
        .map_err(|_| Status::InternalServerError)?;

    Ok(Custom(
        Status::Created,
        Json(VoteResponse {
            uuid: vote.uuid,
            signature: vote.signature,
            choice_uuid: vote.choice_uuid,
            poll_uuid: parsed_poll_uuid,
            timestamp: vote.timestamp,
        }),
    ))
}

#[get("/polls/<poll_id>/votes/<voter_signature>")]
async fn get_poll_user_vote(
    poll_id: &str,
    voter_signature: &str,
) -> Result<Json<VoteResponse>, Status> {
    let parsed_poll_uuid = Uuid::parse_str(poll_id).map_err(|_| Status::BadRequest)?;
    let mut conn = get_connection();

    let _poll_exists = polls
        .filter(poll_table_uuid.eq(parsed_poll_uuid))
        .first::<Poll>(&mut conn)
        .optional()
        .map_err(|_| Status::InternalServerError)?
        .ok_or(Status::NotFound)?;

    // Join votes with choices to bound resolution to this poll and retrieve the voter's latest ballot revision
    let latest_vote = votes
        .inner_join(choices)
        .filter(choice_poll_uuid.eq(parsed_poll_uuid))
        .filter(vote_signature.eq(voter_signature))
        .order_by(vote_timestamp.desc())
        .select((
            crate::schema::votes::dsl::uuid,
            vote_signature,
            vote_choice_uuid,
            vote_timestamp,
        ))
        .first::<(Uuid, String, Uuid, String)>(&mut conn)
        .optional()
        .map_err(|_| Status::InternalServerError)?
        .ok_or(Status::NotFound)?;

    Ok(Json(VoteResponse {
        uuid: latest_vote.0,
        signature: latest_vote.1,
        choice_uuid: latest_vote.2,
        poll_uuid: parsed_poll_uuid,
        timestamp: latest_vote.3,
    }))
}

// Preserve existing flat REST endpoints for backwards compatibility during migration
#[post("/poll", format = "json", data = "<poll_details>")]
async fn create_poll(poll_details: Json<PollCreationDetails>) -> String {
    let poll = Poll {
        name: poll_details.name.clone(),
        uuid: Uuid::new_v4(),
        start_date: Utc::now().to_rfc3339(),
        close_date: poll_details.close_date.to_string(),
    };

    let mut conn = get_connection();
    insert_into(polls).values(&poll).execute(&mut conn).unwrap();

    format!(
        "Creating a poll named {}, closing at {}",
        &poll.name, &poll.close_date
    )
}

#[post("/choice", format = "json", data = "<choice_details>")]
async fn create_choice(choice_details: Json<ChoiceCreationDetails>) -> String {
    let choice = Choice {
        name: choice_details.name.clone(),
        uuid: Uuid::new_v4(),
        poll_uuid: choice_details.poll_uuid.parse().unwrap(),
    };

    let mut conn = get_connection();
    let choice_query_result = insert_into(choices).values(&choice).execute(&mut conn);

    match choice_query_result {
        Ok(_) => format!(
            "Creating a choice named {}, for poll {}",
            &choice.name, &choice.poll_uuid
        ),
        Err(error) => panic!("{}", error),
    }
}

#[post("/vote", format = "json", data = "<vote_details>")]
async fn cast_vote(vote_details: Json<VoteCreationDetails>) -> String {
    let vote = Vote {
        uuid: Uuid::new_v4(),
        signature: vote_details.signature.clone(),
        choice_uuid: vote_details.choice_uuid.parse().unwrap(),
        timestamp: Utc::now().to_rfc3339(),
    };

    let mut conn = get_connection();
    let vote_query_result = insert_into(votes).values(&vote).execute(&mut conn);

    match vote_query_result {
        Ok(_) => format!(
            "Casting a vote with the signature {}, for choice {}",
            &vote.signature, &vote.choice_uuid
        ),
        Err(error) => panic!("{}", error),
    }
}

fn get_connection() -> PgConnection {
    let database_url = env::var("DATABASE_URL").unwrap();
    PgConnection::establish(&database_url)
        .unwrap_or_else(|_| panic!("Error connecting to {}", database_url))
}

#[launch]
pub fn rocket() -> _ {
    println!("rocket launched!");
    rocket::build().mount(
        "/",
        routes![
            create_poll_v2,
            get_poll,
            create_poll_choice,
            get_poll_choices,
            cast_poll_vote,
            get_poll_user_vote,
            create_poll,
            create_choice,
            cast_vote,
        ],
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use rocket::local::blocking::Client;
    use rocket::http::{ContentType, Status};

    #[test]
    fn test_create_poll_and_get_details() {
        let client = Client::tracked(rocket()).expect("valid rocket instance");
        let response = client
            .post("/polls")
            .header(ContentType::JSON)
            .body(r#"{"name":"Test Election","close_date":"2026-12-31T00:00:00Z","choices":["Alice","Bob"]}"#)
            .dispatch();

        assert_eq!(response.status(), Status::Created);
        let created_poll: PollDetailsResponse =
            rocket::serde::json::from_str(&response.into_string().unwrap()).unwrap();
        assert_eq!(created_poll.name, "Test Election");
        assert_eq!(created_poll.choices.len(), 2);

        let get_response = client
            .get(format!("/polls/{}", created_poll.uuid))
            .dispatch();
        assert_eq!(get_response.status(), Status::Ok);
        let fetched_poll: PollDetailsResponse =
            rocket::serde::json::from_str(&get_response.into_string().unwrap()).unwrap();
        assert_eq!(fetched_poll.uuid, created_poll.uuid);
        assert_eq!(fetched_poll.choices.len(), 2);
    }

    #[test]
    fn test_cast_vote_and_get_latest_user_vote() {
        let client = Client::tracked(rocket()).expect("valid rocket instance");
        let poll_response = client
            .post("/polls")
            .header(ContentType::JSON)
            .body(r#"{"name":"Ballot Election","close_date":"2026-12-31T00:00:00Z","choices":["Candidate A","Candidate B"]}"#)
            .dispatch();

        assert_eq!(poll_response.status(), Status::Created);
        let poll: PollDetailsResponse =
            rocket::serde::json::from_str(&poll_response.into_string().unwrap()).unwrap();
        let choice_a = &poll.choices[0];
        let choice_b = &poll.choices[1];
        let voter_sig = format!("voter_sig_{}", Uuid::new_v4());

        // Initial vote for candidate A
        let vote_1_body = format!(
            r#"{{"signature":"{}","choice_uuid":"{}"}}"#,
            voter_sig, choice_a.uuid
        );
        let vote_1_res = client
            .post(format!("/polls/{}/votes", poll.uuid))
            .header(ContentType::JSON)
            .body(vote_1_body)
            .dispatch();
        assert_eq!(vote_1_res.status(), Status::Created);

        // Fetch user's current vote
        let query_1 = client
            .get(format!("/polls/{}/votes/{}", poll.uuid, voter_sig))
            .dispatch();
        assert_eq!(query_1.status(), Status::Ok);
        let vote_data_1: VoteResponse =
            rocket::serde::json::from_str(&query_1.into_string().unwrap()).unwrap();
        assert_eq!(vote_data_1.choice_uuid, choice_a.uuid);
        assert_eq!(vote_data_1.signature, voter_sig);
        assert!(!vote_data_1.timestamp.is_empty());

        // Re-vote for candidate B
        let vote_2_body = format!(
            r#"{{"signature":"{}","choice_uuid":"{}"}}"#,
            voter_sig, choice_b.uuid
        );
        let vote_2_res = client
            .post(format!("/polls/{}/votes", poll.uuid))
            .header(ContentType::JSON)
            .body(vote_2_body)
            .dispatch();
        assert_eq!(vote_2_res.status(), Status::Created);

        // Fetch latest vote again - should resolve to choice B
        let query_2 = client
            .get(format!("/polls/{}/votes/{}", poll.uuid, voter_sig))
            .dispatch();
        assert_eq!(query_2.status(), Status::Ok);
        let vote_data_2: VoteResponse =
            rocket::serde::json::from_str(&query_2.into_string().unwrap()).unwrap();
        assert_eq!(vote_data_2.choice_uuid, choice_b.uuid);
        assert_eq!(vote_data_2.signature, voter_sig);
    }

    #[test]
    fn test_create_and_get_poll_choices() {
        let client = Client::tracked(rocket()).expect("valid rocket instance");
        let poll_response = client
            .post("/polls")
            .header(ContentType::JSON)
            .body(r#"{"name":"Empty Poll","close_date":"2026-12-31T00:00:00Z"}"#)
            .dispatch();
        assert_eq!(poll_response.status(), Status::Created);
        let poll: PollDetailsResponse =
            rocket::serde::json::from_str(&poll_response.into_string().unwrap()).unwrap();

        let choice_response = client
            .post(format!("/polls/{}/choices", poll.uuid))
            .header(ContentType::JSON)
            .body(format!(r#"{{"name":"Write-in Candidate","poll_uuid":"{}"}}"#, poll.uuid))
            .dispatch();
        assert_eq!(choice_response.status(), Status::Created);

        let get_choices_res = client
            .get(format!("/polls/{}/choices", poll.uuid))
            .dispatch();
        assert_eq!(get_choices_res.status(), Status::Ok);
        let choices_list: Vec<ChoiceResponse> =
            rocket::serde::json::from_str(&get_choices_res.into_string().unwrap()).unwrap();
        assert_eq!(choices_list.len(), 1);
        assert_eq!(choices_list[0].name, "Write-in Candidate");
    }

    #[test]
    fn test_vote_for_choice_from_different_poll_rejected() {
        let client = Client::tracked(rocket()).expect("valid rocket instance");
        let poll_1_res = client
            .post("/polls")
            .header(ContentType::JSON)
            .body(r#"{"name":"Poll 1","close_date":"2026-12-31T00:00:00Z","choices":["Choice 1"]}"#)
            .dispatch();
        let poll_1: PollDetailsResponse =
            rocket::serde::json::from_str(&poll_1_res.into_string().unwrap()).unwrap();

        let poll_2_res = client
            .post("/polls")
            .header(ContentType::JSON)
            .body(r#"{"name":"Poll 2","close_date":"2026-12-31T00:00:00Z","choices":["Choice 2"]}"#)
            .dispatch();
        let poll_2: PollDetailsResponse =
            rocket::serde::json::from_str(&poll_2_res.into_string().unwrap()).unwrap();

        // Attempt to vote in Poll 2 using Choice from Poll 1
        let invalid_vote_res = client
            .post(format!("/polls/{}/votes", poll_2.uuid))
            .header(ContentType::JSON)
            .body(format!(
                r#"{{"signature":"rogue_sig","choice_uuid":"{}"}}"#,
                poll_1.choices[0].uuid
            ))
            .dispatch();
        assert_eq!(invalid_vote_res.status(), Status::BadRequest);
    }

    #[test]
    fn test_legacy_endpoints_backward_compatibility() {
        let client = Client::tracked(rocket()).expect("valid rocket instance");
        let poll_res = client
            .post("/poll")
            .header(ContentType::JSON)
            .body(r#"{"name":"Legacy Poll","close_date":"2026-12-31T00:00:00Z"}"#)
            .dispatch();
        assert_eq!(poll_res.status(), Status::Ok);
    }
}
