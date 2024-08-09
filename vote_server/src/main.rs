#[macro_use]
extern crate rocket;
#[macro_use]
extern crate diesel;

use std::collections::HashMap;
use std::env;
use std::iter::Map;
use std::string::String;

use chrono::{Utc};
use diesel::{Connection, insert_into};
use diesel::dsl::count;
use diesel::pg::PgConnection;
use diesel::prelude::*;
use diesel::query_dsl::InternalJoinDsl;
use rocket::http::ext::IntoCollection;
use rocket::serde::json::Json;
use uuid::Uuid;

use crate::models::{Choice, ChoiceCreationDetails, Poll, PollCreationDetails, Vote, VoteCreationDetails};
use crate::schema::choices::dsl::choices;
use crate::schema::choices::{poll_uuid};
use crate::schema::polls::dsl::polls;
use crate::schema::votes::{choice_uuid, signature};
use crate::schema::votes::dsl::votes;

pub mod schema;
pub mod models;

#[post("/polls", format = "json", data = "<poll_details>")]
async fn create_poll(poll_details: Json<PollCreationDetails>) -> String {
    let poll = Poll {
        name: poll_details.name.clone(),
        uuid: Uuid::new_v4(),
        start_date: Utc::now().to_string(),
        close_date: poll_details.close_date.to_string(),
    };

    insert_into(polls).values(&poll).execute(&get_connection());

    let output = format!("Creating a poll named {}, closing at {}", &poll.name, &poll.close_date);
    return output;
}

#[post("/choices", format = "json", data = "<choice_details>")]
async fn create_choice(choice_details: Json<ChoiceCreationDetails>) -> String {
    let choice = Choice {
        name: choice_details.name.clone(),
        uuid: Uuid::new_v4(),
        poll_uuid: choice_details.poll_uuid.parse().unwrap(),
    };

    let choice_query_result = insert_into(choices).values(&choice).execute(&get_connection());

    match choice_query_result {
        Ok(_) => { return format!("Creating a choice named {}, for poll {}", &choice.name, &choice.poll_uuid); }
        Err(error) => { panic!("{}", error) }
    }
}

#[post("/votes", format = "json", data = "<vote_details>")]
async fn cast_vote(vote_details: Json<VoteCreationDetails>) -> String {
    let vote = Vote {
        uuid: Uuid::new_v4(),
        signature: vote_details.signature.clone(),
        choice_uuid: vote_details.choice_uuid.parse().unwrap(),
    };

    let vote_query_result = insert_into(votes).values(&vote).execute(&get_connection());

    match vote_query_result {
        Ok(_) => { return format!("Casting a vote with the signature {}, for choice {}", &vote.signature, &vote.choice_uuid); }
        Err(error) => { panic!("{}", error) }
    }
}

#[get("/polls/<poll_number>/votes")]
async fn count_votes(poll_number: String) -> Json<HashMap<String, (i32, bool)>> {
    let selected_poll = Uuid::parse_str(&poll_number).unwrap();
    let connection = &get_connection();
    let mut poll_results: HashMap<String, (i32, bool)> = HashMap::new();
    let signatures: Vec<String> = votes.inner_join(choices).filter(poll_uuid.eq(selected_poll)).select(signature).load(connection).unwrap();
    for user_signature in signatures {
        let uuid_str: Uuid = votes.filter(signature.eq(user_signature)).select(choice_uuid).first(connection).unwrap();
        let count: &mut i32 = &mut poll_results.entry(uuid_str.to_string()).or_insert((0, false)).0;
        *count += 1;
    }
    let winning_choice = poll_results.iter().max_by_key(|choice_votes| { choice_votes.1.0 }).unwrap();
    let mut winning_choice_flag = winning_choice.1.1;
    winning_choice_flag = true;
    Json(poll_results)
}

fn get_connection() -> PgConnection {
    let database_url = env::var("DATABASE_URL").unwrap();
    PgConnection::establish(&database_url)
        .unwrap_or_else(|_| panic!("Error connecting to {}", database_url))
}

#[launch]
fn rocket() -> _ {
    println!("rocket launched!");
    rocket::build().mount("/", routes![create_poll, create_choice, cast_vote, count_votes])
}
