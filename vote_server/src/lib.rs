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
            create_choice,
            create_choice_plural,
            cast_vote,
            cast_vote_plural,
            count_votes,
        ],
    )
}
