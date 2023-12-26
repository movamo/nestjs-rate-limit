import { RateLimitOptionsInterface } from './rate-limit.options.interface';
import { SetMetadata } from '@nestjs/common';
import { RATE_LIMIT_SKIP } from './rate-limit.constants';

export const RateLimit = (
  options: RateLimitOptionsInterface,
): MethodDecorator => SetMetadata('rateLimit', options);

export const SkipRateLimit = (): MethodDecorator => {
  return (
    target: any,
    propertyKey?: string | symbol,
    descriptor?: TypedPropertyDescriptor<any>,
  ) => {
    const reflectionTarget = descriptor?.value ?? target;

    Reflect.defineMetadata(RATE_LIMIT_SKIP, true, reflectionTarget);

    return descriptor ?? target;
  };
};
