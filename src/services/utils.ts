import {AccessDenyError} from "../http/apiExpressMiddleware";
import {Request} from "express";

export const authorized = (
  target: object,
  propertyKey: string,
  descriptor: PropertyDescriptor
) => {
  const originalMethod = descriptor.value;
  descriptor.value = function (...args) {
    const req = args[0] as Request
    if (!req.context.user) {
      throw new AccessDenyError('No authorized');
    }

    return originalMethod.apply(this, args);
  }
}

export function bind<T extends Function>(
    target: object,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<T>,
): TypedPropertyDescriptor<T> | void {
  if (!descriptor || typeof descriptor.value !== 'function') {
    throw new TypeError(
        `Only methods can be decorated with @bind. <${propertyKey}> is not a method!`,
    );
  }

  return {
    configurable: true,
    get(this: T): T {
      const bound: T = descriptor.value!.bind(this);
      // Credits to https://github.com/andreypopp/autobind-decorator for memoizing the result of bind against a symbol on the instance.
      Object.defineProperty(this, propertyKey, {
        value: bound,
        configurable: true,
        writable: true,
      });
      return bound;
    },
  };
}

export function groupBy<T = any>(list: T[], by: (item: T) => string|number): {[index: keyof T]: T} {
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