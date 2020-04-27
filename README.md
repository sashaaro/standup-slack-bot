## Standup slack bot


### Development

Create new migration
```bash
./node_modules/typeorm/cli.js migration:generate --name=name
```

Create database
```bash
./cli.sh db
```

Run migrations
```bash
./node_modules/.bin/typeorm migration:run
```

Fixtures
```bash
./cli.sh fixtures
```

Run jest tests
```bash
// ./cli.sh db migrate --env=test
// ./cli.sh fixtures --env=test
npm run test
```
