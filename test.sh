# TODO run inside container
docker-compose exec --env=PGPASSWORD=postgres postgres psql -Upostgres -c "DROP DATABASE standup_test"
docker-compose exec --env=PGPASSWORD=postgres postgres psql -Upostgres -c "CREATE DATABASE standup_test"
docker-compose run --rm --entrypoint ./cli.sh serve database:migrate --env=test
docker-compose run --rm --entrypoint ./cli.sh serve database:fixture --env=test
docker-compose run --rm serve run test