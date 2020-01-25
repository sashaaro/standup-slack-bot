import { Injectable } from 'injection-js';
import {logError} from "./logError";

@Injectable()
export default class SyncLocker {
  inProgressPromises = {}

  inProgress(id): boolean {
    return !!this.inProgressPromises[id];
  }

  exec(id, promise: Promise<any>) {
    if (this.inProgress(id)) {
      throw new Error('Already in progress');
    }

    this.inProgressPromises[id] = promise

    this.inProgressPromises[id].then(() => {
      delete this.inProgressPromises[id]
    }, (e) => {
      delete this.inProgressPromises[id]
      logError(e)
    })
  }
}

