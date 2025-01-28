#!/bin/bash
set -e

IMAGE_NAME="sesgoe/gmp-min-repro-metrics-python"
TAG="latest"

echo "Building Docker image ${IMAGE_NAME}:${TAG}..."
docker build -t ${IMAGE_NAME}:${TAG} .

echo "Pushing Docker image ${IMAGE_NAME}:${TAG}..."
docker push ${IMAGE_NAME}:${TAG}

echo "Done!"
