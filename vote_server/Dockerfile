FROM rust:slim-bookworm as builder
WORKDIR /app

RUN apt-get update -y && apt-get install libpq-dev -y
COPY . .
RUN cargo install --path . --debug --locked


FROM debian:bookworm-slim as app
LABEL org.opencontainers.image.source="https://github.com/SaarYogev/safe-vote"
WORKDIR /app
COPY --from=builder /usr/local/cargo/bin/vote_server /usr/local/bin/vote_server
COPY --from=builder /app/Rocket.toml /app/Rocket.toml
COPY --from=builder /usr/lib/x86_64-linux-gnu/ /usr/lib/x86_64-linux-gnu/
EXPOSE 8001
ENV RUST_BACKTRACE=1
CMD ["vote_server", "--debug"]


FROM rust:slim-bookworm as db-init
LABEL org.opencontainers.image.source="https://github.com/SaarYogev/safe-vote"
WORKDIR /app

RUN apt-get update -y && apt-get install libpq-dev curl -y
RUN cargo install diesel_cli --no-default-features --features postgres
COPY . .
ENTRYPOINT [ "diesel", "setup" ]
