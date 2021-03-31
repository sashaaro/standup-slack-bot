import {ConnectionException, ServerException} from "@mikro-orm/core";
import {sleep} from "../services/utils";
import {EntityManager} from "@mikro-orm/postgresql";

export function retriedTx(
  target: object,
  propertyKey: string,
  descriptor: PropertyDescriptor
) {
  const originalMethod = descriptor.value;
  descriptor.value = async function (...args) {
    const em: EntityManager = this.em
    await em.begin()
    await em.execute('SET TRANSACTION ISOLATION LEVEL SERIALIZABLE');

    let result
    result = await originalMethod.apply(this, args);

    const retry = 4;

    let attempt = 0
    for (const _ of new Array(retry)) {
      try {
        await em.commit()
        break;
      } catch (e) {
        if (e instanceof ServerException && '40001' === e.code && (attempt + 1) !== retry) {
          if (attempt !== 0) {
            await em.rollback(); // first time try commit() without rollback
            await sleep(attempt * 350)
            await em.begin()
            await em.execute('SET TRANSACTION ISOLATION LEVEL SERIALIZABLE');
            result = await originalMethod.apply(this, args);
          }
        // } else if (e instanceof ConnectionException) {
        //   await sleep(attempt * 350)
        //   await em.getConnection().connect()
        //   result = await originalMethod.apply(this, args);
        } else {
          await em.rollback();
          throw e;
        }
      }
      ++attempt
    }

    return result;
  }
}