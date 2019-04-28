import entities from "../model";
import {Connection, ConnectionOptions, createConnection} from "typeorm";
import {IAppConfig} from "../index";

const databaseName = 'standup';

export const createTypeORMConnection = async (config: IAppConfig): Promise<Connection> => {
  const options: ConnectionOptions = {
    type: "postgres",
    host: "postgres",
    port: 5432,
    username: "postgres",
    password: "postgres",
    database: "postgres"
  } // TODO from config

  let connection = await createConnection(options);

  const isDatabaseExist = ((await connection.query("SELECT datname FROM pg_database WHERE datname = 'standup' LIMIT 1")) as any[]).length === 1;
  if (!isDatabaseExist) {
    await connection.query("CREATE DATABASE standup");
  }
  await connection.close()
  connection = await createConnection({...options,
    database: databaseName,
    entities: entities,
    logging: config.debug
  })

  if (true) { // TODO isDev
    await connection.synchronize()
  }

  return connection;
}