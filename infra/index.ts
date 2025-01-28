import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";
import * as k8s from "@pulumi/kubernetes";

// Enable required APIs
const computeApi = new gcp.projects.Service("compute-api", {
  service: "compute.googleapis.com",
  disableOnDestroy: false,
});

const containerApi = new gcp.projects.Service("container-api", {
  service: "container.googleapis.com",
  disableOnDestroy: false,
});

const monitoringApi = new gcp.projects.Service("monitoring-api", {
  service: "monitoring.googleapis.com",
  disableOnDestroy: false,
});

// Create a GKE cluster
const cluster = new gcp.container.Cluster(
  "gke-cluster",
  {
    location: "us-east1",
    initialNodeCount: 1,
    deletionProtection: false,
    nodeConfig: {
      machineType: "e2-small",
      oauthScopes: [
        "https://www.googleapis.com/auth/monitoring",
        "https://www.googleapis.com/auth/logging.write",
        "https://www.googleapis.com/auth/cloud-platform",
      ],
    },
    monitoringConfig: {
      managedPrometheus: {
        enabled: true,
      },
    },
  },
  { dependsOn: [containerApi, monitoringApi, computeApi] }
);

// Export cluster info
export const clusterName = cluster.name;
export const clusterEndpoint = cluster.endpoint;
export const clusterMasterAuth = cluster.masterAuth;

// Create a Kubernetes provider instance that uses our cluster
const clusterProvider = new k8s.Provider("cluster-provider", {
  kubeconfig: pulumi
    .all([cluster.name, cluster.endpoint, cluster.masterAuth])
    .apply(([name, endpoint, auth]) => {
      const context = `${gcp.config.project}_${gcp.config.zone}_${name}`;
      return `apiVersion: v1
kind: Config
preferences: {}
users:
- name: gke-user
  user:
    exec:
      apiVersion: client.authentication.k8s.io/v1beta1
      command: gke-gcloud-auth-plugin
      provideClusterInfo: true
clusters:
- cluster:
    server: https://${endpoint}
    certificate-authority-data: ${auth.clusterCaCertificate}
  name: ${context}
contexts:
- context:
    cluster: ${context}
    user: gke-user
  name: ${context}
current-context: ${context}`;
    }),
});

// Deploy the Quarkus application
const quarkusLabels = { app: "metrics-app-quarkus" };

const quarkusDeployment = new k8s.apps.v1.Deployment(
  "quarkus-deployment",
  {
    metadata: { name: "metrics-app-quarkus" },
    spec: {
      replicas: 1,
      selector: { matchLabels: quarkusLabels },
      template: {
        metadata: { labels: quarkusLabels },
        spec: {
          containers: [
            {
              name: "metrics-app-quarkus",
              image: "sesgoe/gmp-min-repro-metrics-quarkus:latest",
              ports: [{ containerPort: 8080, name: "http" }],
              resources: {
                requests: {
                  memory: "256Mi",
                  cpu: "100m",
                },
                limits: {
                  memory: "512Mi",
                  cpu: "500m",
                },
              },
            },
          ],
        },
      },
    },
  },
  { provider: clusterProvider }
);

const quarkusService = new k8s.core.v1.Service(
  "quarkus-service",
  {
    metadata: { name: "metrics-app-quarkus" },
    spec: {
      type: "LoadBalancer",
      ports: [{ port: 80, targetPort: 8080, protocol: "TCP", name: "http" }],
      selector: quarkusLabels,
    },
  },
  { provider: clusterProvider }
);

const quarkusPodMonitor = new k8s.apiextensions.CustomResource(
  "quarkus-podmonitor",
  {
    apiVersion: "monitoring.googleapis.com/v1",
    kind: "PodMonitoring",
    metadata: { name: "metrics-app-quarkus-monitor" },
    spec: {
      selector: {
        matchLabels: quarkusLabels,
      },
      endpoints: [
        {
          port: "http",
          interval: "10s",
          path: "/q/metrics",
        },
      ],
    },
  },
  { provider: clusterProvider }
);

// Deploy the Python application
const pythonLabels = { app: "metrics-app-python" };

const pythonDeployment = new k8s.apps.v1.Deployment(
  "python-deployment",
  {
    metadata: { name: "metrics-app-python" },
    spec: {
      replicas: 1,
      selector: { matchLabels: pythonLabels },
      template: {
        metadata: { labels: pythonLabels },
        spec: {
          containers: [
            {
              name: "metrics-app-python",
              image: "sesgoe/gmp-min-repro-metrics-python:latest",
              ports: [{ containerPort: 8080, name: "http" }],
              resources: {
                requests: {
                  memory: "128Mi",
                  cpu: "100m",
                },
                limits: {
                  memory: "256Mi",
                  cpu: "500m",
                },
              },
            },
          ],
        },
      },
    },
  },
  { provider: clusterProvider }
);

const pythonService = new k8s.core.v1.Service(
  "python-service",
  {
    metadata: { name: "metrics-app-python" },
    spec: {
      type: "LoadBalancer",
      ports: [{ port: 80, targetPort: 8080, protocol: "TCP", name: "http" }],
      selector: pythonLabels,
    },
  },
  { provider: clusterProvider }
);

const pythonPodMonitor = new k8s.apiextensions.CustomResource(
  "python-podmonitor",
  {
    apiVersion: "monitoring.googleapis.com/v1",
    kind: "PodMonitoring",
    metadata: { name: "metrics-app-python-monitor" },
    spec: {
      selector: {
        matchLabels: pythonLabels,
      },
      endpoints: [
        {
          port: "http",
          interval: "10s",
          path: "/q/metrics",
        },
      ],
    },
  },
  { provider: clusterProvider }
);

// Export both service IPs
export const quarkusServiceIp =
  quarkusService.status.loadBalancer.ingress[0].ip;
export const pythonServiceIp = pythonService.status.loadBalancer.ingress[0].ip;
