import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { extractResults } from './extract';

export const RAW_CONNECTION = 'raw';

@Injectable()
export class RawService {
  constructor(
    @InjectConnection(RAW_CONNECTION) private readonly connection: Connection,
  ) {}

  async findLocations(): Promise<unknown[]> {
    return this.find('xbyte_raw_locations');
  }

  async findListings(): Promise<unknown[]> {
    return this.find('xbyte_raw_restaurants');
  }

  async findMenus(): Promise<unknown[]> {
    return this.find('xbyte_raw_menus');
  }

  extractResults(docs: unknown[]): unknown[] {
    return extractResults(docs);
  }

  private async find(collection: string): Promise<unknown[]> {
    const db = this.connection.db;
    if (!db) {
      throw new Error('Raw database connection is not ready');
    }
    return db.collection(collection).find({}).toArray();
  }
}
