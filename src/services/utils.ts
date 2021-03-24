import {format} from "winston";
import {TransformableInfo} from "logform";
import {CodedError, WebAPIPlatformError} from "@slack/web-api";

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

export class ContextualError extends Error {
  constructor(message?: string, context = {}) {
    super(message);
  }
}

export const stringifyError = (error: Error) => Object.assign({
  message: error.message,
  stack: error.stack
}, error)

export const enumerateErrorFormat = format((info: TransformableInfo): any => {
  if (info.error instanceof Error) {
    info.error = stringifyError(info.error);
  }

  return info;
});

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
