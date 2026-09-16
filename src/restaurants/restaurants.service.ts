import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { runPipeline } from '../core/pipeline/run-pipeline';
import { toUpsertOperations } from '../persist/bulk-upsert';
import { talabatAdapter } from '../providers/talabat/adapter';
import { QuarantineService } from '../quarantine/quarantine.service';
import { RawService } from '../raw/raw.service';
import { Restaurant } from './schemas/restaurant.schema';

@Injectable()
export class RestaurantsService {
  constructor(
    @InjectModel(Restaurant.name) private readonly restaurantModel: Model<Restaurant>,
    private readonly rawService: RawService,
    private readonly quarantineService: QuarantineService,
  ) {}

  async persist(runId?: string, limit?: number): Promise<{
    upserted: number;
    quarantined: number;
  }> {
    const [rawListings, rawMenus] = await Promise.all([
      this.rawService.findListings(),
      this.rawService.findMenus(),
    ]);
    const listings = this.rawService.extractResults(rawListings);
    const menus = this.rawService.extractResults(rawMenus);

    const result = runPipeline(
      {
        listings: limit ? listings.slice(0, limit) : listings,
        menus: limit ? menus.slice(0, limit) : menus,
      },
      talabatAdapter,
    );

    if (result.restaurants.length > 0) {
      await this.restaurantModel.bulkWrite(
        toUpsertOperations(result.restaurants, ['outletCode', 'sourceProvider']),
      );
    }

    const quarantined =
      (await this.quarantineService.insert(
        'listings',
        result.quarantined.listings,
        runId,
      )) +
      (await this.quarantineService.insert(
        'menus',
        result.quarantined.menus,
        runId,
      ));

    return { upserted: result.restaurants.length, quarantined };
  }
}
