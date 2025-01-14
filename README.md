# GMP Metric Initialization Bug - Minimal Reproduction

This repository contains a minimal reproduction of a bug related to Google Managed Prometheus (GMP) and its interaction with Quarkus applications. Specifically, it demonstrates an issue where GMP fails to capture initialized counter metrics from Quarkus applications.

## Prerequisites

You'll need the following tools installed:

1. **Google Cloud SDK (gcloud)**

   ```bash
   # For Ubuntu/Debian
   curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | sudo gpg --dearmor -o /usr/share/keyrings/cloud.google.gpg
   echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" | sudo tee -a /etc/apt/sources.list.d/google-cloud-sdk.list
   sudo apt-get update && sudo apt-get install google-cloud-cli

   # Install GKE auth plugin
   sudo apt-get install google-cloud-sdk-gke-gcloud-auth-plugin
   ```

2. **Pulumi**

   ```bash
   curl -fsSL https://get.pulumi.com | sh
   ```

3. **Docker** (for building the Quarkus application)

## Authentication Setup

1. **Google Cloud Authentication**

   ```bash
   # Login to Google Cloud
   gcloud auth login

   # Set the project
   gcloud config set project gmp-metric-init-bug-min-repro

   # Set up application default credentials and quota project
   gcloud auth application-default login
   gcloud auth application-default set-quota-project gmp-metric-init-bug-min-repro
   ```

2. **Pulumi Authentication**
   ```bash
   # Login to Pulumi (we use local backend mode)
   pulumi login --local
   ```

## Project Structure

- `/infra` - Contains Pulumi infrastructure code for:
  - GKE cluster with GMP enabled
  - Kubernetes resources (Deployment, Service, PodMonitoring)
- `/quarkus-metrics` - Contains the Quarkus application that exposes test metrics
  - `/src` - Application source code

## Quarkus Application

The Quarkus application provides a simple REST endpoint to increment metrics:

- Endpoint: `/metric/{name}/{count}`
- Metrics exposed at: `/q/metrics`
- Docker image: `sesgoe/gmp-min-repro-metrics:latest`

### Building the Quarkus App

```bash
cd quarkus-metrics
./mvnw package -Dquarkus.container-image.build=true
docker push sesgoe/gmp-min-repro-metrics:latest
```

## Deployment Steps

1. **Deploy Infrastructure and Application**

   ```bash
   cd infra
   pulumi up
   ```

   This will:

   - Create a GKE cluster with GMP enabled
   - Deploy the Quarkus application
   - Create a LoadBalancer service
   - Configure GMP metric scraping

2. **Access the Application**

   The application's IP address is exported by Pulumi. You can view it with:

   ```bash
   pulumi stack output serviceIp
   ```

   Then test the application:

   ```bash
   # Test the metrics endpoint (replace IP_ADDRESS with your service IP)
   curl http://IP_ADDRESS/metric/test_counter/5

   # View the metrics
   curl http://IP_ADDRESS/q/metrics
   ```

## Estimated Costs

This reproduction uses minimal GCP resources:

- GKE Control Plane: $0.10/hour
- Single e2-small node: ~$0.017/hour
- Total for 4 hours of testing: ~$0.47

⚠️ Remember to destroy the infrastructure when not actively testing to avoid unnecessary charges:

```bash
cd infra
pulumi destroy
```

Note: The GKE cluster is configured with `deletionProtection: false` to allow cleanup. If you encounter any deletion protection errors, ensure this setting is present in `infra/index.ts`.

## Testing the Bug

1. After deployment, use the `/metric/{name}/{count}` endpoint to create and increment some counters
2. Check the GMP metric explorer in Google Cloud Console
3. Observe that initialized counters are not being captured correctly

## Infrastructure Details

The Pulumi infrastructure code (`infra/index.ts`) manages:

1. **GKE Cluster**

   - Single-node cluster in us-east1
   - Google Managed Prometheus enabled
   - e2-small machine type for cost efficiency

2. **Kubernetes Resources**
   - Deployment with resource limits
   - LoadBalancer Service for external access
   - PodMonitoring for GMP metric scraping (10s interval)

All infrastructure changes should be made through the Pulumi TypeScript code in `infra/index.ts`.
