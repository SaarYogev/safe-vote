FROM rust:slim as builder
WORKDIR /app
RUN apt-get update -y && apt-get install libpq-dev -y
COPY . .
RUN cargo install --path . --debug

FROM debian:bullseye-slim
WORKDIR /app
COPY --from=builder /usr/local/cargo/bin/vote_server /usr/local/bin/vote_server
COPY --from=builder /app/Rocket.toml /app/Rocket.toml
COPY --from=builder /usr/lib/x86_64-linux-gnu/ /usr/lib/x86_64-linux-gnu/
EXPOSE 8001
CMD ["vote_server", "--debug"]