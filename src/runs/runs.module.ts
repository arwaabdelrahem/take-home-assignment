import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LocationsModule } from '../locations/locations.module';
import { MenuCategoriesModule } from '../menu-categories/menu-categories.module';
import { MenuItemsModule } from '../menu-items/menu-items.module';
import { QuarantineModule } from '../quarantine/quarantine.module';
import { RestaurantsModule } from '../restaurants/restaurants.module';
import { RunsController } from './runs.controller';
import { RunsService } from './runs.service';
import { Run, RunSchema } from './schemas/run.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Run.name, schema: RunSchema }]),
    LocationsModule,
    RestaurantsModule,
    MenuCategoriesModule,
    MenuItemsModule,
    QuarantineModule,
  ],
  controllers: [RunsController],
  providers: [RunsService],
})
export class RunsModule {}
