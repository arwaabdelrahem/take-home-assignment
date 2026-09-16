import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { LocationsService } from '../locations/locations.service';
import { MenuCategoriesService } from '../menu-categories/menu-categories.service';
import { MenuItemsService } from '../menu-items/menu-items.service';
import { QuarantineService } from '../quarantine/quarantine.service';
import { RestaurantsService } from '../restaurants/restaurants.service';
import { Run } from './schemas/run.schema';

@Injectable()
export class RunsService {
  constructor(
    @InjectModel(Run.name) private readonly runModel: Model<Run>,
    private readonly locationsService: LocationsService,
    private readonly restaurantsService: RestaurantsService,
    private readonly menuCategoriesService: MenuCategoriesService,
    private readonly menuItemsService: MenuItemsService,
    private readonly quarantineService: QuarantineService,
  ) {}

  async create(limit?: number) {
    const run = await this.runModel.create({
      status: 'running',
      limit,
      startedAt: new Date(),
    });
    const runId = String(run._id);

    try {
      const [locations, restaurants, menuCategories, menuItems] = await Promise.all([
        this.locationsService.persist(runId, limit),
        this.restaurantsService.persist(runId, limit),
        this.menuCategoriesService.persist(runId, limit),
        this.menuItemsService.persist(runId, limit),
      ]);
      run.counters = {
        locations,
        restaurants,
        menuCategories,
        menuItems,
      };
 
      run.status = 'completed';
    } catch (error) {
      run.status = 'failed';
      run.error = error instanceof Error ? error.message : String(error);
    }

    run.finishedAt = new Date();
    return await this.runModel.create(run);
  }

  async findErrors(id: string, page = 1, pageSize = 50) {
    await this.findById(id);
    const { total, items } = await this.quarantineService.findByRun(
      id,
      page,
      pageSize,
    );
    return { page, pageSize, total, items };
  }

   async findById(id: string) {
    const run = await this.runModel.findById(id);
    if (!run) {
      throw new NotFoundException('Run not found');
    }
    
    return run;
  }
}
