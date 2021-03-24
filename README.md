## Standup slack bot


### Development

```bash
cp .env.dist .env.dev
docker-compose run --rm -u $(id -u) serve install

docker-compose exec --env=PGPASSWORD=postgres postgres psql -Upostgres -c "CREATE DATABASE standup"
docker-compose exec --env=PGPASSWORD=postgres postgres psql -Upostgres -c "CREATE USER standup WITH PASSWORD 'standup_123'"
docker-compose exec --env=PGPASSWORD=postgres postgres psql -Upostgres -c "GRANT ALL PRIVILEGES ON DATABASE standup TO standup"

echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf && sudo sysctl -p
sudo sysctl -w fs.inotify.max_user_watches=524288

docker-compose up -d
docker-compose exec -u $(id -u) serve sh
```

Create new migration
```bash
./cli.sh migration:generate --name=init
# ./node_modules/typeorm/cli.js migration:generate --name=name
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

```bash
eval $(minikube -p minikube docker-env)
docker build . -f deploy/Dockerfile -t standup-slack-bot:latest
docker build frontend -f frontend/deploy/Dockerfile -t standup-slack-bot-ui:latest
#docker build . -f deploy/Dockerfile -t standup-slack-bot-ui:latest
docker tag standup-slack-bot:latest registry.digitalocean.com/simple/standup-slack-bot:latest
docker push registry.digitalocean.com/simple/standup-slack-bot:latest
```

```bash
kubectl apply -f deploy/k8s/deployment/redis.yaml
kubectl apply -f deploy/k8s/secret/postgres-secret.yaml
kubectl apply -f deploy/k8s/deployment/postgres.yaml
kubectl apply -f deploy/k8s/secret/slack-api-secret.yaml
kubectl apply -f deploy/k8s/deployment/ui.yaml
kubectl apply -f deploy/k8s/deployment/api.yaml
kubectl apply -f deploy/k8s/deployment/queue-consumer.yaml
kubectl apply -f deploy/k8s/deployment/notifier.yaml
# kubectl create secret tls app-secret-tls --cert=path/to/cert/file --key=path/to/key/file
kubectl apply -f deploy/k8s/standup-bot-ingress.yaml
```

```shell
minikube tunnel
echo "192.168.49.2    standup.botenza.com" >> /etc/host
```

Saas pkg using https://github.com/vercel/pkg

```
npm run pkg
```
