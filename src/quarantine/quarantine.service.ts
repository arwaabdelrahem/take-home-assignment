import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { QuarantinedRecord } from '../interfaces/types';
import { Quarantine } from './schemas/quarantine.schema';

@Injectable()
export class QuarantineService {
  constructor(
    @InjectModel(Quarantine.name) private readonly quarantineModel: Model<Quarantine>,
  ) {}

  async insert(
    stream: string,
    records: QuarantinedRecord[],
    runId?: string,
  ): Promise<number> {
    if (records.length === 0) {
      return 0;
    }

    await this.quarantineModel.insertMany(
      records.map((item) => ({
        runId,
        stream,
        reason: item.reason,
        record: item.record as Record<string, unknown>,
      })),
    );
    return records.length;
  }

  async findByRun(
    runId: string,
    page: number,
    pageSize: number,
  ): Promise<{
    total: number;
    items: Array<{
      id: string;
      stream: string;
      reason: string;
      record: Record<string, unknown>;
    }>;
  }> {
    const filter = { runId };
    const [total, docs] = await Promise.all([
      this.quarantineModel.countDocuments(filter),
      this.quarantineModel
        .find(filter)
        .sort({ _id: 1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize),
    ]);

    return {
      total,
      items: docs.map((doc) => ({
        id: String(doc._id),
        stream: doc.stream,
        reason: doc.reason,
        record: doc.record,
      })),
    };
  }
}
