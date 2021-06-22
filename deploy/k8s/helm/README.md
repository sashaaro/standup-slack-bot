```shell
kubectl create namespace standup-bot-ns

helm install standup-bot -n standup-bot-ns . --dry-run # see compiled template

kubectl apply -f secret/postgres-secret.yaml --namespace standup-bot-ns

#for minikube
helm install standup-bot -n standup-bot-ns . --set domain=standup.minikube --set certIssuer=selfsigned --set imagePullPolicy=Never --set debug=1
helm upgrade standup-bot -n standup-bot-ns . --set domain=standup.botenza.com --set certIssuer=letsencrypt --set debug=0 --set apiImage=registry.digitalocean.com/simple/standup-slack-bot:latest --set uiImage=registry.digitalocean.com/simple/standup-slack-bot-ui:latest
helm upgrade standup-bot -n standup-bot-ns . .....

echo $(standup.minikube) standup.minikube >> /etc/hosts 

helm uninstall standup-bot -n standup-bot-ns
kubectl delete namespace standup-bot-ns
```

```shell
helm install standup-bot -n standup-bot-ns . --set domain=standup.botenza.com --set certIssuer=letsencrypt --set debug=0
```

## Helpful links

https://cert-manager.io/docs/installation/kubernetes/

```shell
kubectl apply -f deploy/k8s/deployment/certificate.yaml
```

helm install prometheus prometheus-community/prometheus

https://grafana.com/grafana/dashboards/7249 Kubernetes Cluster dashboards
https://grafana.com/grafana/dashboards/9614 NGINX Ingress controller dashboards
https://grafana.com/grafana/dashboards/315 Kubernetes cluster monitoring (via Prometheus)

https://grafana.com/grafana/dashboards/455 Postgres Overview
https://github.com/wrouesnel/postgres_exporter

https://grafana.com/grafana/dashboards/1860 Node Exporter Full
https://grafana.com/grafana/dashboards/3320 Kubernetes Node Exporter Full

https://grafana.com/grafana/dashboards/4371 RabbitMQ Metrics