import { DynamicModule, Module, Provider } from '@nestjs/common';
import { defaultRateLimitOptions } from './rate-limit.options';
import {
  RateLimitAsyncOptionsInterface,
  RateLimitOptionsFactory,
  RateLimitOptionsInterface,
} from './rate-limit.options.interface';
import { RATE_LIMIT_OPTIONS } from './rate-limit.constants';

@Module({
  providers: [
    {
      provide: RATE_LIMIT_OPTIONS,
      useValue: defaultRateLimitOptions,
    },
  ],
  exports: [RATE_LIMIT_OPTIONS],
})
export class RateLimitModule {
  static register(
    options: RateLimitOptionsInterface = defaultRateLimitOptions,
    global = false,
  ): DynamicModule {
    return {
      module: RateLimitModule,
      global,
      providers: [
        {
          provide: RATE_LIMIT_OPTIONS,
          useValue: options,
        },
      ],
    };
  }

  static registerAsync(
    options: RateLimitAsyncOptionsInterface,
    global = false,
  ): DynamicModule {
    return {
      module: RateLimitModule,
      global,
      imports: options.imports,
      providers: [],
    };
  }

  private static createAsyncProviders(
    options: RateLimitAsyncOptionsInterface,
  ): Provider[] {
    if (options.useExisting || options.useFactory) {
      return [this.createAsyncOptionsProvider(options)];
    }

    return [
      this.createAsyncOptionsProvider(options),
      {
        provide: options.useClass,
        useClass: options.useClass,
      },
    ];
  }

  private static createAsyncOptionsProvider(
    options: RateLimitAsyncOptionsInterface,
  ): Provider {
    if (options.useFactory) {
      return {
        provide: RATE_LIMIT_OPTIONS,
        useFactory: options.useFactory,
        inject: options.inject || [],
      };
    }

    return {
      provide: RATE_LIMIT_OPTIONS,
      useFactory: async (optionsFactory: RateLimitOptionsFactory) =>
        optionsFactory.createRateLimitOptions(),
      inject: [options.useExisting || options.useClass],
    };
  }
}
