import {CodedError, WebAPIPlatformError} from "@slack/web-api";
import {MikroORM, Platform, Type, ValidationError} from "@mikro-orm/core";
import {AsyncLocalStorage} from "async_hooks";
import {Observable} from "rxjs";
import {TransformFnParams} from "class-transformer/types/interfaces";

export const transformCollection: (params: TransformFnParams) => any = (params) => [...params.value.getItems()]

export function groupBy<T>(list: T[], by: (item: T) => string|number): {[key: string]: T[]} {
  new Map()
  const group = {};
  list.forEach(i => {
    const v = by(i)
    if (!group[v]) {
      group[v] = [];
    }
    group[v].push(i);
  });
  return group;
}

export const sortByIndex = (a, b) => a.index === b.index ? 0 : a.index > b.index ? 1 : -1

export function formatTime(date: Date, seconds = true): string {
  const parts = [];
  parts.push(date.getHours().toString(10).padStart(2, '0'));
  parts.push(date.getMinutes().toString(10).padStart(2, '0'));
  if (seconds) {
    parts.push(date.getSeconds().toString(10).padStart(2, '0'));
  }
  return parts.join(':');
}

export class HasPreviousError extends Error {
  public previous: Error;
}

export class ContextualError extends HasPreviousError {
  constructor(message?: string, public context = {}) {
    super(message);
  }
}



export const stringifyError = (error: Error) => Object.assign({
  message: error.message,
  stack: error.stack
}, error)

export const groupByData = (data: any[], options: { groupBy: string, groupProps: string[], listProp: string }) => {
  const list = groupBy(data, i => i[options.groupBy])

  const items = [];
  for(const groupBy in list) {
    const itemList = list[groupBy];
    const first = itemList[0];
    const item = {};
    [options.groupBy, ...options.groupProps].forEach(prop => item[prop] = first[prop])
    item[options.listProp] = itemList.map(i => {
      [options.groupBy, ...options.groupProps].forEach(prop => delete i[prop])
      return i;
    });

    if (1 === item[options.listProp].length &&
        Object.values(item[options.listProp][0]).filter(i => i === null).length === Object.values(item[options.listProp][0]).length
    ) {
      item[options.listProp] = []
    }

    items.push(item);
  }

  return items;
}

export const isPlatformError = (e: CodedError): e is WebAPIPlatformError => e.code === 'slack_webapi_platform_error'

export class IntArrayType extends Type {
  convertToDatabaseValue(value: any): string {
    if (value.length) {
      return `{${value.join(',')}}`;
    }
    throw ValidationError.invalidType(Array, value, 'JS');
  }

  toJSON(value: any) {
    return value;
  }

  compareAsType(): string {
    return 'integer[]';
  }

  getColumnType() {
    return 'integer[]';
  }
}


export class BitmaskType extends Type<number, string> {
  constructor(private size: number = 2) {
    super()
  }

  convertToDatabaseValueSQL(key: string, platform: Platform = null): string {
    return `${key}::bit(${this.size})`;
  }

  convertToJSValue(value: string): number {
    const v = parseInt(value, 2)
    if (v === NaN) {
      throw new Error(`Invalid database value ${value} from column ${this.getColumnType()}`);
    }
    return v;
  }

  toJSON(value: any) {
    return this.convertToJSValue(value);
  }

  compareAsType(): string {
    return `bit(${this.size})`;
  }

  getColumnType() {
    return `bit(${this.size})`;
  }
}


export const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));


export const initMikroORM = async (orm: MikroORM, connect: boolean = true, applicationName?: string) => {
  await orm.discoverEntities();
  if (connect) {
    if (orm.config.get('ensureIndexes')) {
      await orm.getSchemaGenerator().ensureIndexes();
      if (applicationName) {
        await orm.em.execute(`set application_name to "${applicationName}";`) // TODO hostname
      }
    }
  }
}
