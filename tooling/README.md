# Website Build Tooling

This directory contains the build tooling and related notes for my website,
so that I don't forget how to do it. Mostly it's for building a docker image
with Zola etc.

The docker image is currently published by hand:

```
cd ./tooling
docker build -t rfkelly/website-tooling:latest .
docker push rfkelly/website-tooling:latest
```