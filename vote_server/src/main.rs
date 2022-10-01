#[macro_use]
extern crate rocket;
#[macro_use]
extern crate diesel;

use std::env;
use std::string::String;

use chrono::{Utc};
use diesel::{Connection, insert_into};
use diesel::pg::PgConnection;
use diesel::prelude::*;
use rocket::serde::json::Json;
use uuid::Uuid;

use crate::models::{Choice, ChoiceCreationDetails, Poll, PollCreationDetails};
use crate::schema::choices::dsl::choices;
use crate::schema::polls::dsl::polls;

pub mod schema;
pub mod models;

#[post("/poll", format = "json", data = "<poll_details>")]
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

#[post("/choice", format = "json", data = "<choice_details>")]
async fn create_choice(choice_details: Json<ChoiceCreationDetails>) -> String {
    let choice = Choice {
        name: choice_details.name.clone(),
        uuid: Uuid::new_v4(),
        poll_uuid: choice_details.poll_uuid.parse().unwrap()
    };

    insert_into(choices).values(&choice).execute(&get_connection());

    let output = format!("Creating a choice named {}, for poll {}", &choice.name, &choice.poll_uuid);
    return output;
}

fn get_connection() -> PgConnection {
    let database_url = env::var("DB_URL").unwrap();
    PgConnection::establish(&database_url)
        .unwrap_or_else(|_| panic!("Error connecting to {}", database_url))
}

#[launch]
fn rocket() -> _ {
    println!("rocket launched!");
    rocket::build().mount("/", routes![create_poll, create_choice])
}