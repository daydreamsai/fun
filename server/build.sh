#!/bin/bash

# API_URL="https://fun-production-95cb.up.railway.app"

# echo ${API_URL}

IMAGE=dreams-play-server:latest
# IMAGE_TAG=latest

docker build --platform linux/amd64 -t ${IMAGE} .
docker tag ${IMAGE} europe-southwest1-docker.pkg.dev/daydreams-cloud/dreams-fun/${IMAGE}
docker push europe-southwest1-docker.pkg.dev/daydreams-cloud/dreams-fun/${IMAGE}