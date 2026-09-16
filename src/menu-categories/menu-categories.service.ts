import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { runPipeline } from '../core/pipeline/run-pipeline';
import { toUpsertOperations } from '../persist/bulk-upsert';
import { talabatAdapter } from '../providers/talabat/adapter';
import { QuarantineService } from '../quarantine/quarantine.service';
import { RawService } from '../raw/raw.service';
import { MenuCategory } from './schemas/menu-category.schema';

@Injectable()
export class MenuCategoriesService {
  constructor(
    @InjectModel(MenuCategory.name) private readonly menuCategoryModel: Model<MenuCategory>,
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

    if (result.menuCategories.length > 0) {
      await this.menuCategoryModel.bulkWrite(
        toUpsertOperations(result.menuCategories, [
          'categoryId',
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

    return { upserted: result.menuCategories.length, quarantined };
  }
}
