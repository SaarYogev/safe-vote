use uuid::Uuid;
use rocket::serde::Deserialize;
use crate::schema::*;

#[derive(Insertable, Identifiable, Queryable)]
#[primary_key(uuid)]
#[diesel(table_name = polls)]
pub struct Poll {
    pub name: String,
    pub uuid: Uuid,
    pub start_date: String,
    pub close_date: String
}

#[derive(Deserialize, FromForm)]
#[serde(crate = "rocket::serde")]
pub struct PollCreationDetails {
    pub name: String,
    pub close_date: String
}

#[derive(Insertable, Identifiable, Associations, Queryable)]
#[belongs_to(Poll, foreign_key = "poll_uuid")]
#[primary_key("uuid")]
#[diesel(table_name = choices)]
pub struct Choice {
    pub name: String,
    pub uuid: Uuid,
    pub poll_uuid: Uuid
}

#[derive(Deserialize, FromForm)]
#[serde(crate = "rocket::serde")]
pub struct ChoiceCreationDetails {
    pub name: String,
    pub poll_uuid: String
}

#[derive(Insertable, Identifiable, Associations, Queryable)]
#[belongs_to(Choice, foreign_key = "choice_uuid")]
#[primary_key("uuid")]
#[diesel(table_name = votes)]
pub struct Vote {
    pub uuid: Uuid,
    pub signature: String,
    pub choice_uuid: Uuid
}


#[derive(Deserialize, FromForm)]
#[serde(crate = "rocket::serde")]
pub struct VoteCreationDetails {
    pub signature: String,
    pub choice_uuid: String
}
