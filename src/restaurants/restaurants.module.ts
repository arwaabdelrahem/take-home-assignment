import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { QuarantineModule } from '../quarantine/quarantine.module';
import { RawModule } from '../raw/raw.module';
import { RestaurantsController } from './restaurants.controller';
import { RestaurantsService } from './restaurants.service';
import { Restaurant, RestaurantSchema } from './schemas/restaurant.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Restaurant.name, schema: RestaurantSchema },
    ]),
    RawModule,
    QuarantineModule,
  ],
  controllers: [RestaurantsController],
  providers: [RestaurantsService],
  exports: [RestaurantsService],
})
export class RestaurantsModule {}
