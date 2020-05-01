import {createProviders} from "../src/services/providers";
import {ReflectiveInjector} from "injection-js";
import {Connection} from "typeorm";
import Timezone from "../src/model/Timezone";

const testProviders = createProviders( 'test');
export const testInjector = ReflectiveInjector.resolveAndCreate(testProviders);

export const testConnection: Connection = testInjector.get(Connection);

const dictionaryEntities = [Timezone];

export const clearDatabase = async () => {
  const entities = testConnection.entityMetadatas
    //.filter(e => !dictionaryEntities.includes(e.target as any))

  for (const entity of entities) {
    await testConnection.getRepository(entity.target).query(`TRUNCATE "${entity.tableName}" CASCADE`)
  }
}


