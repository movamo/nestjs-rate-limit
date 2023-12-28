import { RateLimiterRes } from 'rate-limiter-flexible';
import { ModuleMetadata, Type } from '@nestjs/common';

export interface RateLimitOptionsInterface {
  for?:
    | 'Express'
    | 'Fastify'
    | 'Microservice'
    | 'ExpressGraphql'
    | 'FastifyGraphql';
  type?: 'Memory' | 'Redis' | 'Memcache' | 'Postgras' | 'MySQL' | 'Mongo';
  keyPrefix?: string | (() => string);
  points?: number;
  pointsConsumed?: number;
  inMemoryBlockDuration?: number;
  duration?: number;
  blockDuration?: number;
  inMemoryBlockOnConsumed?: number;
  queueEnabled?: boolean;
  whiteList?: string[];
  blackList?: string[];
  storeClient?: any;
  insuranceLimiter?: any;
  storeType?: string;
  dbName?: string;
  tableName?: string;
  tableCreated?: boolean;
  clearExpiredByTimeout?: boolean;
  execEvenly?: boolean;
  execEvenlyMinDelayMs?: number;
  indexKeyPrefix?: object;
  maxQueueSize?: number;
  omitResponseHeaders?: boolean;
  errorMessage?: string;
  logger?: boolean;
  customResponseSchema?: (
    rateLimiterResponse: RateLimiterRes,
  ) => object | string;
}

export interface RateLimitOptionsFactory {
  createRateLimitOptions():
    | Promise<RateLimitOptionsInterface>
    | RateLimitOptionsInterface;
}

export interface RateLimitAsyncOptionsInterface
  extends Pick<ModuleMetadata, 'imports'> {
  useExisting?: Type<RateLimitOptionsFactory>;
  useClass?: Type<RateLimitOptionsFactory>;
  useFactory?: (
    ...args: any[]
  ) => Promise<RateLimitOptionsInterface> | RateLimitOptionsInterface;
  inject?: any[];
}
