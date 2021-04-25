import {AccessDenyError} from "../http/api.middleware";
import {reqContext} from "../http/middlewares";

export const authorized = (
  target: object,
  propertyKey: string,
  descriptor: PropertyDescriptor
) => {
  const originalMethod = descriptor.value;
  descriptor.value = function (...args) {
    if (!reqContext().user) {
      throw new AccessDenyError('No authorized');
    }

    return originalMethod.apply(this, args);
  }
}