import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HealthModule } from './health/health.module';
import { LocationsModule } from './locations/locations.module';
import { MenuCategoriesModule } from './menu-categories/menu-categories.module';
import { MenuItemsModule } from './menu-items/menu-items.module';
import { QuarantineModule } from './quarantine/quarantine.module';
import { RAW_CONNECTION } from './raw/raw.service';
import { RawModule } from './raw/raw.module';
import { RestaurantsModule } from './restaurants/restaurants.module';
import { RunsModule } from './runs/runs.module';

const mongoUrl = (db: string) => `mongodb://localhost:27017/${db}`;

@Module({
  imports: [
    MongooseModule.forRoot(
      mongoUrl(process.env.FACTORY_DB ?? 'provider_factory'),
    ),
    MongooseModule.forRoot(mongoUrl(process.env.RAW_DB ?? 'provider_raw'), {
      connectionName: RAW_CONNECTION,
    }),
    RawModule,
    HealthModule,
    QuarantineModule,
    LocationsModule,
    RestaurantsModule,
    MenuCategoriesModule,
    MenuItemsModule,
    RunsModule,
  ],
})
export class AppModule {}
