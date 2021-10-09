# -------
# Builder
# -------
FROM rust:1.56-buster AS builder

RUN apt-get update && apt-get install --yes \
  libssl-dev \
  pkg-config

WORKDIR /build
COPY . .
RUN git clone https://github.com/getzola/zola

WORKDIR /build/deployer
RUN cargo build --release

WORKDIR /build/zola
RUN git checkout v0.14.1
RUN cargo build --release

# -------
# Runtime
# -------

FROM debian:buster-slim
RUN apt-get update && apt-get install --yes \
  ca-certificates \
  git \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*
COPY --from=builder /build/deployer/target/release/deployer /usr/bin/
COPY --from=builder /build/zola/target/release/zola /usr/bin/
