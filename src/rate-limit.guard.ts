import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import {
  IRateLimiterOptions, IRateLimiterRedisOptions, IRateLimiterStoreOptions,
  RateLimiterAbstract,
  RateLimiterMemory, RateLimiterRedis,
  RateLimiterRes,
  RLWrapperBlackAndWhite
} from 'rate-limiter-flexible';
import { RateLimitOptionsInterface } from './rate-limit.options.interface';
import { RATE_LIMIT_OPTIONS, RATE_LIMIT_SKIP } from './rate-limit.constants';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { defaultRateLimitOptions } from './rate-limit.options';
import { GraphQLException } from '@nestjs/graphql/dist/exceptions';

@Injectable()
export class RateLimitGuard implements CanActivate {
  private rateLimiters: Map<string, RateLimiterAbstract> = new Map();

  constructor(
    @Inject(RATE_LIMIT_OPTIONS) private options: RateLimitOptionsInterface,
    @Inject('Reflector') private readonly reflector: Reflector,
  ) {}

  async getRateLimiter(): Promise<RateLimiterAbstract> {
    const libraryArguments: IRateLimiterOptions = {
      ...this.options,
      keyPrefix:
        typeof this.options.keyPrefix === 'function'
          ? this.options.keyPrefix()
          : this.options.keyPrefix,
    };

    let rateLimiter: RateLimiterAbstract = this.rateLimiters.get(
      libraryArguments.keyPrefix,
    );

    if (libraryArguments.execEvenlyMinDelayMs === undefined) {
      libraryArguments.execEvenlyMinDelayMs =
        (libraryArguments.duration * 1000) / libraryArguments.points;
    }

    if (!rateLimiter) {
      switch (this.options.type) {
        case 'Memory':
          rateLimiter = new RateLimiterMemory(libraryArguments);
          break;
        case 'Redis':
          rateLimiter = new RateLimiterRedis(libraryArguments as IRateLimiterRedisOptions)
          break;
        default:
          throw new Error(
            `invalid "type" option provided to RateLimit. Value was ${this.options.type}`,
          );
      }

      this.rateLimiters.set(libraryArguments.keyPrefix, rateLimiter);
    }

    rateLimiter = new RLWrapperBlackAndWhite({
      limiter: rateLimiter,
      whiteList: this.options.whiteList,
      blackList: this.options.blackList,
      runActionAnyway: false,
    });

    return rateLimiter;
  }

  async canActivate(context: ExecutionContext) {
    const shouldSkip = this.reflector.get(
      RATE_LIMIT_SKIP,
      context.getHandler(),
    );

    if (shouldSkip) {
      return true;
    }

    const reflectedOptions: RateLimitOptionsInterface =
      this.reflector.get<RateLimitOptionsInterface>(
        'rateLimit',
        context.getHandler(),
      );

    this.options = {
      ...defaultRateLimitOptions,
      ...this.options,
      ...reflectedOptions,
    };

    const request = this.httpHandler(context).req;
    const response = this.httpHandler(context).res;

    const rateLimiter: RateLimiterAbstract = await this.getRateLimiter();

    const key: string = this.getTracker(request);

    await this.responseHandler(response, key, rateLimiter);

    return true;
  }

  protected getTracker(request: Request): string {
    return request.ip;
  }

  private httpHandler(context: ExecutionContext) {
    if (this.options.for === 'ExpressGraphql') {
      return {
        req: context.getArgByIndex(2).req,
        res: context.getArgByIndex(2).req.res,
      };
    } else if (this.options.for === 'FastifyGraphql') {
      return {
        req: context.getArgByIndex(2).req,
        res: context.getArgByIndex(2).res,
      };
    }

    return {
      req: context.switchToHttp().getRequest(),
      res: context.switchToHttp().getResponse(),
    };
  }

  private async setResponseHeaders(
    response: any,
    points: number,
    rateLimiterResponse: RateLimiterRes,
  ) {
    response.header(
      'Retry-After',
      Math.ceil(rateLimiterResponse.msBeforeNext / 1000),
    );
    response.header('X-RateLimit-Limit', points);
    response.header('X-Retry-Remaining', rateLimiterResponse.remainingPoints);
    response.header(
      'X-Retry-Reset',
      new Date(Date.now() + rateLimiterResponse.msBeforeNext).toUTCString(),
    );
  }

  private async responseHandler(
    response: any,
    key: any,
    rateLimiter: RateLimiterAbstract,
  ) {
    try {
      const rateLimiterResponse: RateLimiterRes = await rateLimiter.consume(
        key,
        this.options.pointsConsumed,
      );

      await this.setResponseHeaders(
        response,
        this.options.points,
        rateLimiterResponse,
      );
    } catch (rateLimiterResponse) {
      response.header(
        'Retry-After',
        Math.ceil(rateLimiterResponse.msBeforeNext / 1000),
      );

      if (typeof this.options.customResponseSchema === 'function') {
        const errorBody = this.options.customResponseSchema;

        if (this.options.for === 'ExpressGraphql') {
          throw new GraphQLException(errorBody(rateLimiterResponse) as string, {
            extensions: {
              code: 'TOO_MANY_REQUESTS',
              http: {
                status: HttpStatus.TOO_MANY_REQUESTS
              },
            },
          });
        }

        if (this.options.for === 'FastifyGraphql') {
          throw new GraphQLException(errorBody(rateLimiterResponse) as string, {
            extensions: {
              code: 'TOO_MANY_REQUESTS',
              http: {
                status: HttpStatus.TOO_MANY_REQUESTS,
              },
            },
          });
        }

        throw new HttpException(
          errorBody(rateLimiterResponse),
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      if (this.options.for === 'ExpressGraphql') {
        throw new GraphQLException(this.options.errorMessage, {extensions: {code: 'TOO_MANY_REQUESTS', http: {status: HttpStatus.TOO_MANY_REQUESTS}}})
      }

      if (this.options.for === 'FastifyGraphql') {
        throw new GraphQLException(this.options.errorMessage, {extensions: {code: 'TOO_MANY_REQUESTS', http: {status: HttpStatus.TOO_MANY_REQUESTS}}})
      }

      throw new HttpException(
        this.options.errorMessage,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }
}
