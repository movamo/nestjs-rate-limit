import { Controller, Get, UseGuards } from '@nestjs/common';
import { RateLimit } from '../../src';
import { RateLimitGuard } from '../../src';
import { minutes } from '../../src';

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
    return 'Hello world';
  }

  @Get('hello')
  getWorld(): string {
    return 'World Hello'
  }
}
