use std::collections::HashMap;
use chrono::NaiveDateTime;
use diesel::prelude::*;
use rocket::serde::{Deserialize, Serialize};
use uuid::Uuid;
use crate::schema::*;

#[derive(Insertable, Identifiable, Queryable, AsChangeset, Selectable, Debug, Clone)]
#[diesel(primary_key(uuid))]
#[diesel(table_name = polls)]
pub struct Poll {
    pub uuid: Uuid,
    pub name: String,
    pub start_date: String,
    pub close_date: String,
    pub status: String,
    pub winning_choice: Option<Uuid>,
}

#[derive(Insertable, Debug, Clone)]
#[diesel(table_name = polls)]
pub struct NewPoll {
    pub uuid: Uuid,
    pub name: String,
    pub start_date: String,
    pub close_date: String,
}

#[derive(Deserialize, FromForm)]
#[serde(crate = "rocket::serde")]
pub struct PollCreationDetails {
    pub name: String,
    pub close_date: String,
}

#[derive(Insertable, Identifiable, Associations, Queryable, Selectable, Debug, Clone)]
#[diesel(belongs_to(Poll, foreign_key = poll_uuid))]
#[diesel(primary_key(uuid))]
#[diesel(table_name = choices)]
pub struct Choice {
    pub uuid: Uuid,
    pub name: String,
    pub poll_uuid: Uuid,
    pub created_at: NaiveDateTime,
}

#[derive(Insertable, Debug, Clone)]
#[diesel(table_name = choices)]
pub struct NewChoice {
    pub uuid: Uuid,
    pub name: String,
    pub poll_uuid: Uuid,
}

#[derive(Deserialize, FromForm)]
#[serde(crate = "rocket::serde")]
pub struct ChoiceCreationDetails {
    pub name: String,
    pub poll_uuid: String,
}

#[derive(Insertable, Identifiable, Associations, Queryable, Selectable, Debug, Clone)]
#[diesel(belongs_to(Choice, foreign_key = choice_uuid))]
#[diesel(primary_key(uuid))]
#[diesel(table_name = votes)]
pub struct Vote {
    pub uuid: Uuid,
    pub signature: String,
    pub choice_uuid: Uuid,
    pub created_at: NaiveDateTime,
}

#[derive(Insertable, Debug, Clone)]
#[diesel(table_name = votes)]
pub struct NewVote {
    pub uuid: Uuid,
    pub signature: String,
    pub choice_uuid: Uuid,
}

#[derive(Deserialize, FromForm)]
#[serde(crate = "rocket::serde")]
pub struct VoteCreationDetails {
    pub signature: String,
    pub choice_uuid: String,
}

#[derive(Serialize, Deserialize, Debug, PartialEq, Eq)]
#[serde(crate = "rocket::serde")]
pub struct PollResultsResponse {
    pub status: String,
    pub winning_choice: Option<Uuid>,
    pub vote_distribution: HashMap<Uuid, i64>,
}
