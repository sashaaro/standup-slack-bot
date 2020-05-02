## Standup slack bot


### Development

```bash
docker-compose run --rm -u $(id -u) serve npm install

docker-compose up -d
docker-compose exec -u $(id -u) serve sh
```

Create new migration
```bash
./node_modules/typeorm/cli.js migration:generate --name=name
```

Create database
```bash
./cli.sh database:create
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
// ./cli.sh database:migrate --env=test
// ./cli.sh database:fixture --env=test
npm run test
```
