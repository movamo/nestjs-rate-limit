import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { RateLimitModule } from '../../src';

@Module({
  imports: [
    RateLimitModule.register(
      {
        for: 'Express',
        type: 'Memory',
        errorMessage: 'tooManyRequests',
      },
      true,
    ),
  ],
  controllers: [AppController],
})
export class AppModule {}
