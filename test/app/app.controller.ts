import { Controller, Get, UseGuards } from '@nestjs/common';
import { RateLimit } from '../../src/rate-limit.decorator';
import { RateLimitGuard } from '../../src/rate-limit.guard';
import { minutes } from '../../src';

@Controller()
export class AppController {
  @UseGuards(RateLimitGuard)
  @RateLimit({
    keyPrefix: 'asd',
    points: 3,
    pointsConsumed: 1,
    duration: 5,
    blockDuration: minutes(1),
  })
  @Get()
  getHello(): string {
    return 'Hello world';
  }
}
