import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import Redis from 'ioredis';
import { Connection } from 'mongoose';
import { RAW_CONNECTION } from '../raw/raw.service';

export const REDIS_CLIENT = 'REDIS_CLIENT';

@Injectable()
export class HealthService implements OnModuleDestroy {
  constructor(
    @InjectConnection() private readonly factory: Connection,
    @InjectConnection(RAW_CONNECTION) private readonly raw: Connection,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async check() {
    const [factory, raw, redis] = await Promise.all([
      this.pingMongo(this.factory),
      this.pingMongo(this.raw),
      this.pingRedis(),
    ]);
    const ok = factory && raw && redis;
    return {
      status: ok ? 'ok' : 'degraded',
      mongo: { factory, raw },
      redis,
    };
  }

  onModuleDestroy() {
    this.redis.disconnect();
  }

  private async pingMongo(connection: Connection): Promise<boolean> {
    try {
      const db = connection.db;
      if (!db) {
        return false;
      }
      await db.admin().command({ ping: 1 });
      return true;
    } catch {
      return false;
    }
  }

  private async pingRedis(): Promise<boolean> {
    try {
      if (this.redis.status === 'wait') {
        await this.redis.connect();
      }
      return (await this.redis.ping()) === 'PONG';
    } catch {
      return false;
    }
  }
}
