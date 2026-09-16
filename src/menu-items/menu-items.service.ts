import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { runPipeline } from '../core/pipeline/run-pipeline';
import { toUpsertOperations } from '../persist/bulk-upsert';
import { talabatAdapter } from '../providers/talabat/adapter';
import { QuarantineService } from '../quarantine/quarantine.service';
import { RawService } from '../raw/raw.service';
import { MenuItem } from './schemas/menu-item.schema';

@Injectable()
export class MenuItemsService {
  constructor(
    @InjectModel(MenuItem.name) private readonly menuItemModel: Model<MenuItem>,
    private readonly rawService: RawService,
    private readonly quarantineService: QuarantineService,
  ) {}

  async persist(runId?: string, limit?: number): Promise<{
    upserted: number;
    quarantined: number;
  }> {
    const raw = await this.rawService.findMenus();
    const menus = this.rawService.extractResults(raw);
    const result = runPipeline(
      { menus: limit ? menus.slice(0, limit) : menus },
      talabatAdapter,
    );

    if (result.menuItems.length > 0) {
      await this.menuItemModel.bulkWrite(
        toUpsertOperations(result.menuItems, [
          'itemId',
          'restaurantOutletId',
          'sourceProvider',
        ]),
      );
    }

    const quarantined = await this.quarantineService.insert(
      'menus',
      result.quarantined.menus,
      runId,
    );

    return { upserted: result.menuItems.length, quarantined };
  }
}
