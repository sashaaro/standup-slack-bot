import {createProviders} from "../src/services/providers";
import {ReflectiveInjector} from "injection-js";
import {Connection} from "typeorm";
import Timezone from "../src/model/Timezone";
import {LOGGER_TOKEN} from "../src/services/token";
import TransportStream from "winston-transport";
import {createLogger} from "winston";

const {providers} = createProviders( 'test');

/*loggerProvider.useFactory = () => {
  const logger = createLogger()
  const transport = new TransportStream({
    log: (info) => {
      this.logs = this.logs ?? [];
      this.logs.push(info);
    },
  });

  (transport as any).reset = function() {
    this.logs = [];
  }

  logger.add(transport);
  (logger as any).transport = transport;
  return logger;
}*/
export const testInjector = ReflectiveInjector.resolveAndCreate(providers);

export const testConnection: Connection = testInjector.get(Connection);

const dictionaryEntities = [Timezone];

export const clearDatabase = async () => {
  const entities = testConnection.entityMetadatas
    //.filter(e => !dictionaryEntities.includes(e.target as any))

  for (const entity of entities) {
    await testConnection.getRepository(entity.target).query(`TRUNCATE "${entity.tableName}" CASCADE`)
  }
}


