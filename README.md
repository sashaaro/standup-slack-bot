## Standup slack bot


### Development

```bash
cp .env.dist .env.dev
docker-compose run --rm -u $(id -u) serve npm install

docker-compose exec --env=PGPASSWORD=postgres postgres psql -Upostgres -c "CREATE DATABASE standup"
docker-compose exec --env=PGPASSWORD=postgres postgres psql -Upostgres -c "CREATE USER standup WITH PASSWORD 'standup_123'; GRANT ALL PRIVILEGES ON DATABASE standup TO standup;"

docker-compose up -d
docker-compose exec -u $(id -u) serve sh
```

Create new migration
```bash
./node_modules/typeorm/cli.js migration:generate --name=name
```

Generate migration
```bash
./cli.sh migration:generate -n
```

Run migrations
```bash
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

Run jest tests
```bash
cp .env.dist .env.dev
./cli.sh database:migrate --env=test
./cli.sh database:fixture --env=test
npm run test
```

### Deployment

Build images
```bash
cp .env.dist .env.prod
COMPOSE_DOCKER_CLI_BUILD=1 DOCKER_BUILDKIT=1 docker-compose -f docker-compose.prod.yml build
```
Create db and execute migrations
```bash
dc -f docker-compose.prod.yml run --rm ui database:migrate --env=prod
```
