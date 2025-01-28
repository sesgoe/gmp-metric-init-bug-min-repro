#!/bin/bash
set -e

echo "Building Quarkus application and Docker image..."
./mvnw package -Dquarkus.container-image.build=true

echo "Pushing Docker image sesgoe/gmp-min-repro-metrics-quarkus:latest..."
docker push sesgoe/gmp-min-repro-metrics-quarkus:latest

echo "Done!"
