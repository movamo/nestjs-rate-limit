import { Controller, Get, UseGuards } from '@nestjs/common';
import { RateLimit } from '../../src/rate-limit.decorator';
import { RateLimitGuard } from '../../src/rate-limit.guard';

@Controller()
export class AppController {
  @UseGuards(RateLimitGuard)
  @RateLimit({
    keyPrefix: 'test',
    points: 3,
    pointsConsumed: 1,
    duration: 5,
    blockDuration: 20,
  })
  @Get()
  getHello(): string {
    return 'Hello world';
  }
}
