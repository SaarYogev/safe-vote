CREATE TABLE polls
(
    uuid       uuid         not null
        primary key
        unique,
    name       VARCHAR(200) not null,
    start_date VARCHAR(200)    not null,
    close_date VARCHAR(200)    not null
);

CREATE TABLE choices
(
    uuid  uuid         not null
        primary key
        unique,
    name  VARCHAR(200) not null,
    poll_uuid   uuid not null
        constraint polls___fk
            references polls (uuid)
);

CREATE TABLE votes
(
    uuid  uuid         not null
        primary key
        unique,
    signature  VARCHAR(200) not null,
    choice_uuid   uuid not null
        constraint choices___fk
            references choices (uuid)
);
