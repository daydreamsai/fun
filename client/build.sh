#!/bin/bash

API_URL=""
RELEASE="dev"

for ARGUMENT in "$@"
do
   KEY=$(echo $ARGUMENT | cut -f1 -d=)
   VALUE=$(echo $ARGUMENT | cut -f2 -d=)   

   case "$KEY" in
           --release)              RELEASE=${VALUE} ;;     
           *)   
   esac    
done

echo "API_URL: ${API_URL}"
echo "RELEASE: ${RELEASE}"

# echo ${API_URL}

docker build --platform linux/amd64 --build-arg API_URL="${API_URL}" -t dreams-play-client:${RELEASE} .
docker tag dreams-play-client:${RELEASE} europe-southwest1-docker.pkg.dev/daydreams-cloud/dreams-fun/play-client:${RELEASE}
docker push europe-southwest1-docker.pkg.dev/daydreams-cloud/dreams-fun/play-client:${RELEASE}