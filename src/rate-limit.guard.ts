import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import {
  IRateLimiterOptions,
  RateLimiterAbstract,
  RateLimiterMemory,
  RateLimiterRes,
  RLWrapperBlackAndWhite,
} from 'rate-limiter-flexible';
import { RateLimitOptionsInterface } from './rate-limit.options.interface';
import { RATE_LIMIT_OPTIONS, RATE_LIMIT_SKIP } from './rate-limit.constants';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { defaultRateLimitOptions } from './rate-limit.options';

@Injectable()
export class RateLimitGuard implements CanActivate {
  private rateLimiters: Map<string, RateLimiterAbstract> = new Map();
  private routeLevelOptions: RateLimitOptionsInterface;

  constructor(
    @Inject('RATE_LIMIT_OPTIONS') private options: RateLimitOptionsInterface,
    @Inject('Reflector') private readonly reflector: Reflector,
  ) {}

  async getRateLimiter(
    options?: RateLimitOptionsInterface,
  ): Promise<RateLimiterAbstract> {
    this.options = { ...defaultRateLimitOptions, ...this.options };
    this.routeLevelOptions = options;

    const limiterOptions: RateLimitOptionsInterface = {
      ...this.options,
      ...options,
    };

    const libraryArguments: IRateLimiterOptions = {
      ...limiterOptions,
      keyPrefix:
        typeof limiterOptions.keyPrefix === 'function'
          ? limiterOptions.keyPrefix()
          : limiterOptions.keyPrefix,
    };

    let rateLimiter: RateLimiterAbstract = this.rateLimiters.get(
      libraryArguments.keyPrefix,
    );

    if (libraryArguments.execEvenlyMinDelayMs === undefined) {
      libraryArguments.execEvenlyMinDelayMs =
        (this.options.duration * 1000) / this.options.points;
    }

    if (!rateLimiter) {
      switch (this.routeLevelOptions?.type || this.options.type) {
        case 'Memory':
          rateLimiter = new RateLimiterMemory(libraryArguments);
          break;
        default:
          throw new Error(
            `invalid "type" option provided to RateLimit. Value was ${limiterOptions.type}`,
          );
      }

      this.rateLimiters.set(libraryArguments.keyPrefix, rateLimiter);
    }

    rateLimiter = new RLWrapperBlackAndWhite({
      limiter: rateLimiter,
      whiteList: this.routeLevelOptions?.whiteList || this.options.whiteList,
      blackList: this.routeLevelOptions?.blackList || this.options.blackList,
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

    let points: number = this.routeLevelOptions?.points || this.options.points;
    let pointsConsumed: number =
      this.routeLevelOptions?.pointsConsumed || this.options.pointsConsumed;

    if (reflectedOptions) {
      if (reflectedOptions.points) {
        points = reflectedOptions.points;
      }

      if (reflectedOptions.pointsConsumed) {
        pointsConsumed = reflectedOptions.pointsConsumed;
      }
    }

    const request = this.httpHandler(context).req;
    const response = this.httpHandler(context).res;

    const rateLimiter: RateLimiterAbstract = await this.getRateLimiter(
      reflectedOptions,
    );

    const key: string = this.getTracker(request);

    await this.responseHandler(
      response,
      key,
      rateLimiter,
      points,
      pointsConsumed,
    );

    return true;
  }

  protected getTracker(request: Request): string {
    return request.ip;
  }

  private httpHandler(context: ExecutionContext) {
    if (this.options.for === 'ExpressGraphql') {
      return {
        req: context.getArgByIndex(2).req,
        res: context.getArgByIndex(2).res,
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
    points: number,
    pointsConsumed: number,
  ) {
    try {
      const rateLimiterResponse: RateLimiterRes = await rateLimiter.consume(
        key,
        pointsConsumed,
      );

      await this.setResponseHeaders(response, points, rateLimiterResponse);
    } catch (rateLimiterResponse) {
      response.header(
        'Retry-After',
        Math.ceil(rateLimiterResponse.msBeforeNext / 1000),
      );

      if (
        typeof this.routeLevelOptions?.customResponseSchema === 'function' ||
        typeof this.options.customResponseSchema === 'function'
      ) {
        const errorBody =
          this.routeLevelOptions?.customResponseSchema ||
          this.options.customResponseSchema;
        throw new HttpException(
          errorBody(rateLimiterResponse),
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      throw new HttpException(
        this.routeLevelOptions?.errorMessage || this.options.errorMessage,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }
}
