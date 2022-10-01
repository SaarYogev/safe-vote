CREATE TABLE polls
(
    uuid       uuid         not null
        primary key
        unique,
    name       VARCHAR(200) not null,
    start_date VARCHAR(200)    not null,
    close_date VARCHAR(200)    not null
);

create table choices
(
    uuid  uuid         not null
        primary key
        unique,
    name  VARCHAR(200) not null,
    votes BIGINT       not null,
    poll_uuid   uuid not null
        constraint polls___fk
            references polls (uuid)
);
