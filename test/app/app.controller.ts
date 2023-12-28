import { Controller, Get, UseGuards } from '@nestjs/common';
import { RateLimit } from '../../src';
import { RateLimitGuard } from '../../src';
import { minutes } from '../../src';
import Redis from 'ioredis';

@Controller()
export class AppController {
  @UseGuards(RateLimitGuard)
  @RateLimit({
    keyPrefix: 'hello',
    points: 3,
    pointsConsumed: 1,
    duration: 5,
    blockDuration: minutes(1),
  })
  @Get()
  getHello(): string {
    return 'Hello World';
  }

  @UseGuards(RateLimitGuard)
  @RateLimit({
    type: 'Redis',
    storeClient: new Redis({
      host: 'redis-15130.c250.eu-central-1-1.ec2.cloud.redislabs.com',
      port: 15130,
      db: 0,
      password: 'aYLKX4LnFkrHsQPvC0pcstu7RNpvrUJM',
      username: 'default'
    }),
    keyPrefix: 'redis',
    points: 3,
    pointsConsumed: 1,
    duration: 5,
    blockDuration: minutes(1)
  })
  @Get('redis')
  getWorld(): string {
    return 'Hello Redis'
  }
}
