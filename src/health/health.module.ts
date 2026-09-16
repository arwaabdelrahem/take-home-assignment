import { Module } from '@nestjs/common';
import Redis from 'ioredis';
import { HealthController } from './health.controller';
import { HealthService, REDIS_CLIENT } from './health.service';

@Module({
  controllers: [HealthController],
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: () => {
        const redis = new Redis(
          process.env.REDIS_URL ?? 'redis://localhost:6379',
          {
            lazyConnect: true,
            maxRetriesPerRequest: 1,
            connectTimeout: 1000,
          },
        );
        redis.on('error', () => undefined);
        return redis;
      },
    },
    HealthService,
  ],
})
export class HealthModule {}
