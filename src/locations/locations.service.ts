import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { runPipeline } from '../core/pipeline/run-pipeline';
import { toUpsertOperations } from '../persist/bulk-upsert';
import { talabatAdapter } from '../providers/talabat/adapter';
import { QuarantineService } from '../quarantine/quarantine.service';
import { RawService } from '../raw/raw.service';
import { Location } from './schemas/location.schema';

@Injectable()
export class LocationsService {
  constructor(
    @InjectModel(Location.name) private readonly locationModel: Model<Location>,
    private readonly rawService: RawService,
    private readonly quarantineService: QuarantineService,
  ) {}

  async persist(runId?: string, limit?: number): Promise<{
    upserted: number;
    quarantined: number;
  }> {
    const raw = await this.rawService.findLocations();
    const locations = this.rawService.extractResults(raw);
    const result = runPipeline(
      { locations: limit ? locations.slice(0, limit) : locations },
      talabatAdapter,
    );

    if (result.locations.length > 0) {
      await this.locationModel.bulkWrite(
        toUpsertOperations(result.locations, ['locationId', 'sourceProvider']),
      );
    }

    const quarantined = await this.quarantineService.insert(
      'locations',
      result.quarantined.locations,
      runId,
    );

    return { upserted: result.locations.length, quarantined };
  }
}
