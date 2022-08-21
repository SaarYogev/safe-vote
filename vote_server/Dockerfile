FROM rust:slim as builder
WORKDIR /app
COPY . .
RUN cargo install --path . --debug

FROM debian:bullseye-slim
WORKDIR /app
COPY --from=builder /usr/local/cargo/bin/vote_server /usr/local/bin/vote_server
COPY --from=builder /app/Rocket.toml /app/Rocket.toml
EXPOSE 8001
CMD ["vote_server", "--debug"]