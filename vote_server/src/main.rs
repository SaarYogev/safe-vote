#[macro_use]
extern crate rocket;

use std::string::String;
use std::future::Future;
use chrono::{DateTime, TimeZone, Utc};
use rocket::form::{Form, FromFormField};
use rocket::serde::{Deserialize};
use rocket::serde::json::Json;
use rocket::State;
use uuid::Uuid;

#[post("/poll", format = "json", data = "<poll_details>")]
fn create_poll(poll_details: Json<PollCreationDetails>) -> String {
    let poll = Poll {
        name: poll_details.name.clone(),
        uuid: Uuid::new_v4(),
        targets: poll_details.targets.iter().map(|target_string| Target {
            name: target_string.to_string(),
            uuid: Uuid::new_v4(),
            votes: 0,
        }).collect(),
        start_date: Utc::now().to_string(),
        close_date: poll_details.close_date.to_string(),
    };
    let output = format!("Creating a poll named {}, closing at {}", &poll.name, &poll.close_date);
    return output;
}

#[launch]
fn rocket() -> _ {
    println!("rocket launched!");
    rocket::build().mount("/", routes![create_poll])
}

pub struct Vote {
    pub signature: String,
    pub target: String,
}

pub struct Target {
    pub name: String,
    pub uuid: Uuid,
    pub votes: i64,
}

pub struct Poll {
    pub name: String,
    pub uuid: Uuid,
    pub targets: Vec<Target>,
    pub start_date: String,
    pub close_date: String,
}

#[derive(Deserialize, FromForm)]
#[serde(crate = "rocket::serde")]
struct PollCreationDetails {
    name: String,
    targets: Vec<String>,
    close_date: String,
}

impl PollCreationDetails {
    fn new(name: String, targets: Vec<String>, close_date: String) -> Self {
        Self {
            name,
            targets,
            close_date,
        }
    }
}