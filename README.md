<h2 align="center">Flexible Rate Limiter Module for NestJS</h2>

# Description

`nestjs-rate-limit` is a module which adds in configurable rate limiting for [Nest](https://github.com/nestjs/nest) applications.

Under the hood it uses [rate-limiter-flexible](https://github.com/animir/node-rate-limiter-flexible).

# Installation

```bash
npm i --save @mvmdev/nestjs-rate-limit
```

Or if you use Yarn:

```bash
yarn add @mvmdev/nestjs-rate-limit
```

# Requirements

Nest.Js v10

# Basic Usage

### Include Module

First you need to import this module into your main application module:

> app.module.ts

```ts
import { RateLimitModule } from '@mvmdev/nestjs-rate-limit';

@Module({
    imports: [RateLimitModule],
})
export class ApplicationModule {}
```

or you can define the module global using `true` and global config.

```ts
import { RateLimitModule } from '@mvmdev/nestjs-rate-limit';

@Module({
    imports: [RateLimitModule.forRoot({}, true)],
})
export class ApplicationModule {}
```

### Using Global Guard

You can choose to register the guard globally:

> app.module.ts

```ts
import { APP_GUARD } from '@nestjs/core'
import { RateLimitModule } from '@mvmdev/nestjs-rate-limit';
import { RateLimitGuard } from '@mvmdev/nestjs-rate-limit/dist/rate-limit.guard';

@Module({
    imports: [RateLimitModule],
    providers: [
        {
            provide: APP_GUARD,
            useClass: RateLimitGuard,
        },
    ],
})
export class ApplicationModule {}
```

### With Decorator

You can use the `@RateLimit` decorator to specify the points and duration for rate limiting on per route basis:

> app.controller.ts

```ts
import { RateLimit } from 'nestjs-rate-limiter'
import { UseGuards } from '@nestjs/common';
import { RateLimitGuard } from '@mvmdev/nestjs-rate-limit/dist/rate-limit.guard';

@UseGuards(RateLimitGuard)
@RateLimit({
  keyPrefix: 'sign-up',
  points: 1,
  duration: 60,
  errorMessage: 'Accounts cannot be created more than once in per minute'
})
@Get('/signup')
async signUp() {
  console.log('hello')
}
```

### Dynamic Keyprefix

```ts
import { RateLimit } from 'nestjs-rate-limiter'
import { UseGuards } from '@nestjs/common';
import { RateLimitGuard } from '@mvmdev/nestjs-rate-limit/dist/rate-limit.guard';

@UseGuards(RateLimitGuard)
@RateLimit({
  keyPrefix: () => {
    return 'example'
  },
  points: 1,
  duration: 60,
  customResponseSchema: (rateLimiterResponse) => {
    return { 
      timestamp: '1611479696', 
      message: 'Request has been blocked' 
    }
  }
})
@Get('/example')
async example() {
  console.log('hello')
}
```

### Proxies

If your application runs behind a proxy server, check the specific HTTP 
adapter options (express and fastify) for the trust proxy option 
and enable it. Doing so will allow you to get the original IP 
address from the X-Forwarded-For header, and you can override the 
getTracker() method to pull the value from the header rather than 
from req.ip. The following example works with both express and fastify:

```ts
export class RateLimitProxyGuard extends RateLimitGuard {
  protected getTracker(request: Request): string {
    return request.ips.length > 0 ? request.ips[0] : request.ip;
  }
}
```


### With All Options

```ts
@Module({
    imports: [
        // All the values here are defaults.
        RateLimitModule.register({
            for: 'Express',
            type: 'Memory',
            keyPrefix: 'global',
            points: 4,
            pointsConsumed: 1,
            inmemoryBlockOnConsumed: 0,
            duration: 1,
            blockDuration: 0,
            inmemoryBlockDuration: 0,
            queueEnabled: false,
            whiteList: [],
            blackList: [],
            storeClient: undefined,
            insuranceLimiter: undefined,
            storeType: undefined,
            dbName: undefined,
            tableName: undefined,
            tableCreated: undefined,
            clearExpiredByTimeout: undefined,
            execEvenly: false,
            execEvenlyMinDelayMs: undefined,
            indexKeyPrefix: {},
            maxQueueSize: 100,
            omitResponseHeaders: false,
            errorMessage: 'Rate limit exceeded',
            logger: true,
            customResponseSchema: undefined
        }),
    ],
    providers: [
        {
            provide: APP_GUARD,
            useClass: RateLimitGuard,
        },
    ],
})
export class ApplicationModule {}
```

### Fastify based Graphql
If you want to use this library on a fastify based graphql server, you need to override the graphql context in the app.module as shown below.
```ts
GraphQLModule.forRoot({
    context: ({ request, reply }) => {
        return { req: request, res: reply }
    },
}),
```

# Options

#### ● for
  <code> Default: 'Express'</code>
  <br>
  <code> Type: 'Express' | 'Fastify' | 'Microservice' | 'ExpressGraphql' | 'FastifyGraphql'</code>
  <br>

In this option, you specify what the technology is running under the Nest application. The wrong value causes to limiter not working.

#### ● type
  <code> Default: 'Memory'</code>
  <br>
  <code> Type: 'Memory'</code>
  <br>

Here you define where the limiter data will be stored. Each option plays a different role in limiter performance, to see that please check [benchmarks](https://github.com/ozkanonur/nestjs-rate-limiter#benchmarks).

#### ● keyPrefix
  <code> Default: 'global'</code>
  <br>
  <code> Type: string | () => string</code>
  <br>

For creating several limiters with different options to apply different modules/endpoints.

Set to empty string '', if keys should be stored without prefix.

Note: for some limiters it should correspond to Storage requirements for tables or collections name, as keyPrefix may be used as their name.

#### ● points
  <code> Default: 4</code>
  <br>
  <code> Type: number</code>
  <br>

Maximum number of points can be consumed over duration.

#### ● pointsConsumed
  <code> Default: 1</code>
  <br>
  <code> Type: number</code>
  <br>

You can consume more than 1 point per invocation of the rate limiter.

For instance if you have a limit of 100 points per 60 seconds, and pointsConsumed is set to 10, the user will effectively be able to make 10 requests per 60 seconds.

[//]: # (#### ● inMemoryBlockOnConsumed)

[//]: # (  <code> Default: 0</code>)

[//]: # (  <br>)

[//]: # (  <code> Type: number</code>)

[//]: # (  <br>)

[//]: # ()
[//]: # (For Redis, Memcached, MongoDB, MySQL, PostgreSQL, etc.)

[//]: # ()
[//]: # (Can be used against DDoS attacks. In-memory blocking works in current process memory and for consume method only.)

[//]: # ()
[//]: # (It blocks a key in memory for msBeforeNext milliseconds from the last consume result, if inMemoryBlockDuration is not set. This helps to avoid extra requests.)

[//]: # (It is not necessary to increment counter on store, if all points are consumed already.)

#### ● duration
  <code> Default: 1</code>
  <br>
  <code> Type: number</code>
  <br>

Number of seconds before consumed points are reset.

Keys never expire, if duration is 0.

#### ● blockDuration
  <code> Default: 0</code>
  <br>
  <code> Type: number</code>
  <br>

If positive number and consumed more than points in current duration, block for blockDuration seconds.

[//]: # (#### ● inMemoryBlockDuration)

[//]: # (  <code> Default: 0</code>)

[//]: # (  <br>)

[//]: # (  <code> Type: number</code>)

[//]: # (  <br>)

[//]: # ()
[//]: # (For Redis, Memcached, MongoDB, MySQL, PostgreSQL, etc.)

[//]: # ()
[//]: # (Block key for inMemoryBlockDuration seconds, if inMemoryBlockOnConsumed or more points are consumed. Set it the same as blockDuration option for distributed application to have consistent result on all processes.)

[//]: # ()
[//]: # (#### ● queueEnabled)

[//]: # (  <code> Default: false</code>)

[//]: # (  <br>)

[//]: # (  <code> Type: boolean</code>)

[//]: # (  <br>)

[//]: # ()
[//]: # (It activates the queue mechanism, and holds the incoming requests for <code>duration</code> value.)

#### ● whiteList
  <code> Default: []</code>
  <br>
  <code> Type: string[]</code>
  <br>

If the IP is white listed, consume resolved no matter how many points consumed.

#### ● blackList
  <code> Default: []</code>
  <br>
  <code> Type: string[]</code>
  <br>

If the IP is black listed, consume rejected anytime. Blacklisted IPs are blocked on code level not in store/memory. Think of it as of requests filter.

[//]: # (#### ● storeClient)

[//]: # (  <code> Default: undefined</code>)

[//]: # (  <br>)

[//]: # (  <code> Type: any</code>)

[//]: # (  <br>)

[//]: # ()
[//]: # (Required for Redis, Memcached, MongoDB, MySQL, PostgreSQL, etc.)

[//]: # ()
[//]: # (Have to be redis, ioredis, memcached, mongodb, pg, mysql2, mysql or any other related pool or connection.)

[//]: # (#### ● insuranceLimiter)

[//]: # (  <code> Default: undefined</code>)

[//]: # (  <br>)

[//]: # (  <code> Type: any</code>)

[//]: # (  <br>)

[//]: # ()
[//]: # (Default: undefined For Redis, Memcached, MongoDB, MySQL, PostgreSQL.)

[//]: # ()
[//]: # (Instance of RateLimiterAbstract extended object to store limits, when database comes up with any error.)

[//]: # ()
[//]: # (All data from insuranceLimiter is NOT copied to parent limiter, when error gone)

[//]: # ()
[//]: # (Note: insuranceLimiter automatically setup blockDuration and execEvenly to same values as in parent to avoid unexpected behaviour.)

[//]: # (#### ● storeType)

[//]: # (  <code> Default: storeClient.constructor.name</code>)

[//]: # (  <br>)

[//]: # (  <code> Type: any</code>)

[//]: # (  <br>)

[//]: # ()
[//]: # (For MySQL and PostgreSQL)

[//]: # (It is required only for Knex and have to be set to 'knex')

[//]: # (#### ● dbName)

[//]: # (  <code> Default for MySQL, Postgres & Mongo: 'rate-limiter'</code>)

[//]: # (  <br>)

[//]: # (  <code> Type: string</code>)

[//]: # (  <br>)

[//]: # ()
[//]: # (Database where limits are stored. It is created during creating a limiter. Doesn't work with Mongoose, as mongoose connection is established to exact database.)

[//]: # ()
[//]: # (#### ● tableName)

[//]: # (  <code> Default: equals to 'keyPrefix' option</code>)

[//]: # (  <br>)

[//]: # (  <code> Type: string</code>)

[//]: # (  <br>)

[//]: # ()
[//]: # (For MongoDB, MySQL, PostgreSQL.)

[//]: # ()
[//]: # (By default, limiter creates a table for each unique keyPrefix. tableName option sets table/collection name where values should be store.)

[//]: # ()
[//]: # (#### ● tableCreated)

[//]: # (  <code> Default: false</code>)

[//]: # (  <br>)

[//]: # (  <code> Type: boolean</code>)

[//]: # (  <br>)

[//]: # ()
[//]: # (Does not create a table for rate limiter, if tableCreated is <code>true</code>.)

[//]: # (#### ● clearExpiredByTimeout)

[//]: # (  <code> Default for MySQL and PostgreSQL: true</code>)

[//]: # (  <br>)

[//]: # (  <code> Type: boolean</code>)

[//]: # (  <br>)

[//]: # ()
[//]: # (Rate limiter deletes data expired more than 1 hour ago every 5 minutes.)

#### ● execEvenly
  <code> Default: false</code>
  <br>
  <code> Type: boolean</code>
  <br>

Delay action to be executed evenly over duration First action in duration is executed without delay. All next allowed actions in current duration are delayed by formula msBeforeDurationEnd / (remainingPoints + 2) with minimum delay of duration * 1000 / points It allows to cut off load peaks similar way to Leaky Bucket.

Note: it isn't recommended to use it for long duration and few points, as it may delay action for too long with default execEvenlyMinDelayMs.

#### ● execEvenlyMinDelayMs
  <code> Default: duration * 1000 / points</code>
  <br>
  <code> Type: number</code>
  <br>

Sets minimum delay in milliseconds, when action is delayed with execEvenly

#### ● indexKeyPrefix
  <code> Default: {}</code>
  <br>
  <code> Type: {}</code>
  <br>

Object which is used to create combined index by {...indexKeyPrefix, key: 1} attributes.

[//]: # (#### ● maxQueueSize)

[//]: # (  <code> Default: 100</code>)

[//]: # (  <br>)

[//]: # (  <code> Type: number</code>)

[//]: # (  <br>)

[//]: # ()
[//]: # (Determines the maximum number of requests in the queue and returns <code>429</code> as response to requests that over of the maxQueueSize.)

#### ● omitResponseHeaders
  <code> Default: false</code>
  <br>
  <code> Type: boolean</code>
  <br>

Whether or not the rate limit headers (<code>X-Retry-After</code>, <code>X-RateLimit-Limit</code>, <code>X-Retry-Remaining</code>, <code>X-Retry-Reset</code>) should be omitted in the response.


#### ● errorMessage
  <code> Default: 'Rate limit exceeded'</code>
  <br>
  <code> Type: string</code>
  <br>

errorMessage option can change the error message of rate limiter exception.

[//]: # (#### ● logger)

[//]: # (  <code> Default: true</code>)

[//]: # (  <br>)

[//]: # (  <code> Type: boolean</code>)

[//]: # (  <br>)

[//]: # ()
[//]: # (logger option allows to enable or disable logging from library.)

#### ● customResponseSchema
  <code> Default: undefined </code>
  <br>
  <code> Type: string</code>
  <br>

customResponseSchema option allows to provide customizable response schemas

# Benchmarks

1000 concurrent clients with maximum 2000 requests per sec during 30 seconds.

```
1. Memory     0.34 ms
2. Redis      2.45 ms
3. Memcached  3.89 ms
4. Mongo      4.75 ms
```

500 concurrent clients with maximum 1000 req per sec during 30 seconds

```
5. PostgreSQL 7.48 ms (with connection pool max 100)
6. MySQL     14.59 ms (with connection pool 100)
```