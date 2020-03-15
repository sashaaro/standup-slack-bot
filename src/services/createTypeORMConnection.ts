import entities from "../model";
import {Connection, ConnectionOptions, createConnection} from "typeorm";
import {IAppConfig} from "./providers";

const options: ConnectionOptions = {
  type: "postgres",
  host: "postgres",
  port: 5432,
  username: "postgres",
  password: "postgres",
  database: "postgres"
} // TODO from config

export const createTypeORMConnection = async (config: IAppConfig): Promise<Connection> => {
  let connection = await createConnection(options);

  await connection.close()

  const {database, username, password} = config.db;

  connection = await createConnection({...options,
    database,
    username,
    password,
    entities,
    logging: config.debug,
  })

  if (config.debug) {
    await connection.synchronize()
  }

  return connection;
}
