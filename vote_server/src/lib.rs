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

use crate::models::{Choice, ChoiceCreationDetails, NewChoice, NewPoll, NewVote, Poll, PollCreationDetails, PollResultsResponse, Vote, VoteCreationDetails};
use crate::schema::choices::dsl::choices;
use crate::schema::polls::dsl::polls;
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

    let new_vote = NewVote {
        uuid: Uuid::new_v4(),
        signature: vote_details.signature.clone(),
        choice_uuid: choice_id,
    };

    let vote_query_result = insert_into(votes).values(&new_vote).execute(&mut conn);

    match vote_query_result {
        Ok(_) => Ok(format!("Casting a vote with the signature {}, for choice {}", &new_vote.signature, &new_vote.choice_uuid)),
        Err(error) => panic!("{}", error),
    }
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

    let poll_choices: Vec<Choice> = choices
        .filter(crate::schema::choices::poll_uuid.eq(target_poll_uuid))
        .load::<Choice>(&mut conn)
        .map_err(|e| Custom(Status::InternalServerError, e.to_string()))?;

    let poll_votes: Vec<Vote> = votes
        .inner_join(choices)
        .filter(crate::schema::choices::poll_uuid.eq(target_poll_uuid))
        .select(votes::all_columns())
        .order_by((crate::schema::votes::signature.asc(), crate::schema::votes::created_at.desc()))
        .load::<Vote>(&mut conn)
        .map_err(|e| Custom(Status::InternalServerError, e.to_string()))?;

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

    let current_status = if is_poll_closed(&poll) {
        "closed".to_string()
    } else {
        "open".to_string()
    };

    Ok(Json(PollResultsResponse {
        status: current_status,
        winning_choice,
        vote_distribution: distribution,
    }))
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
            get_poll,
            create_choice,
            create_choice_plural,
            cast_vote,
            cast_vote_plural,
            count_votes,
            get_poll_user_vote,
        ],
    )
}
