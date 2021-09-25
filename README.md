## Standup slack bot


### Development

```bash
cp .env.dist .env.dev
docker-compose run --rm -u $(id -u) serve install
docker-compose run --workdir=/opt/app/frontend --rm -u $(id -u) serve install

docker-compose exec --env=PGPASSWORD=postgres postgres psql -Upostgres
# see init-postgres.sql

echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf && sudo sysctl -p
sudo sysctl -w fs.inotify.max_user_watches=524288

docker-compose up -d
docker-compose exec -u $(id -u) serve sh
```

Create new migration
```bash
./cli.sh migration:generate
```

Run migrations
```bash
rm -r ./dist/*
npm run build
./cli.sh database:migrate
```

Fixtures
```bash
./cli.sh database:fixture
```

Standup notifier
```bash
./cli.sh standup:notify
```

Queue consumer
```bash
./cli.sh queue:consume
```

Server
```bash
./cli.sh server:run
```

Sync slack data from api
```shell
docker-compose exec serve ./cli.sh slack:sync
```

Generate angular api module
```shell
docker-compose run --rm openapi-generator
```

Run jest tests
```bash
cp .env.dist .env.dev
./test.sh

```

### Staging

Build images
```bash
cp .env.dist .env.prod
docker-compose -f docker-compose.staging.yml build
```
Create db and execute migrations
```bash
dc -f docker-compose.staging.yml run --rm ui database:migrate --env=prod
```

### Minikube

Build base image
https://www.digitalocean.com/docs/container-registry/quickstart/

https://minikube.sigs.k8s.io/docs/handbook/pushing/#1-pushing-directly-to-the-in-cluster-docker-daemon-docker-env

https://minikube.sigs.k8s.io/docs/handbook/registry/#enabling-insecure-registries
```bash
minikube start --insecure-registry "10.0.0.0/24"
minikube addons enable ingress
minikube addons enable registry
minikube addons enable dashboard
```

```bash
eval $(minikube -p minikube docker-env)
docker build . -f deploy/Dockerfile -t standup-slack-bot:latest
docker build frontend -f frontend/deploy/Dockerfile -t standup-slack-bot-ui:latest
docker tag standup-slack-bot:latest registry.digitalocean.com/simple/standup-slack-bot:latest
docker tag standup-slack-bot-ui:latest registry.digitalocean.com/simple/standup-slack-bot-ui:latest

minikube image load standup-slack-bot:latest
minikube image load standup-slack-bot-ui:latest

doctl registry login
docker push registry.digitalocean.com/simple/standup-slack-bot:latest
docker push registry.digitalocean.com/simple/standup-slack-bot-ui:latest
```


https://cert-manager.io/docs/installation/kubernetes/

```bash
kubectl apply -f https://github.com/jetstack/cert-manager/releases/download/v1.5.3/cert-manager.yaml
```

```shell
minikube tunnel
minikube kubectl -- -n kubernetes-dashboard get services # see kubernetes-dashboard service ip
echo "192.168.49.2    standup.botenza.com" >> /etc/hosts

minikube kubectl -- create namespace cattle-system
helm install rancher rancher-stable/rancher --namespace cattle-system --set hostname=rancher.minikube,ingress.tls.source=secret
```

```bash
cd deploy/k8s

echo "password" | base64 # set to postgres-secret standup-password
kubectl apply -f secret/postgres-secret.yaml
kubectl apply -f deployment/postgres.yaml # grafana loki promtail

kubectl exec -it postgres-0 -- bash
psql -Upostgres -W
# execute script init-postgres.sh

kubectl apply -f deployment/redis.yaml

# see helm/README.md

# kubectl create secret tls app-secret-tls --cert=path/to/cert/file --key=path/to/key/file
```

Saas pkg using https://github.com/vercel/pkg

```
npm run pkg
```
