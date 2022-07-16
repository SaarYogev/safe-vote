#[macro_use]
extern crate rocket;

use chrono::{DateTime, Utc};
use rocket::form::Form;
use rocket::serde::{Deserialize};

#[post("/poll", data = "<poll>")]
fn create_poll(poll: Form<PollCreationDetails>) -> String {
    format!("Creating a poll named {}, closing at", poll.name/*, poll.close_date*/)
}

#[launch]
fn rocket() -> _ {
    rocket::build().mount("/", routes![create_poll])
}

pub struct Vote {
    pub signature: String,
    pub target: String,
}

pub struct Target {
    pub name: String,
    pub guid: String,
    pub votes: i64,
}

pub struct Poll {
    pub name: String,
    pub targets: Vec<Target>,
    pub start_date: DateTime<Utc>,
    pub close_date: DateTime<Utc>,
}

#[derive(Deserialize, FromForm)]
#[serde(crate = "rocket::serde")]
struct PollCreationDetails {
    name: String,
    targets: Vec<String>,
    // close_date: DateTime<Utc>,
}

impl PollCreationDetails {
    fn new(name: String, targets: Vec<String>/*, close_date: DateTime<Utc>*/) -> Self {
        Self {
            name,
            targets,
            // close_date
        }
    }
}