import {Request} from "express";
import {AccessDenyError} from "../http/api.middleware";

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