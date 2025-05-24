#!/bin/bash

API_URL=""

echo ${API_URL}

docker build --platform linux/amd64 --build-arg API_URL="${API_URL}" -t dreams-play-client:latest .
docker tag dreams-play-client:latest europe-southwest1-docker.pkg.dev/daydreams-cloud/dreams-fun/play-client:latest
docker push europe-southwest1-docker.pkg.dev/daydreams-cloud/dreams-fun/play-client:latest