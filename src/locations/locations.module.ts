import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { QuarantineModule } from '../quarantine/quarantine.module';
import { RawModule } from '../raw/raw.module';
import { LocationsController } from './locations.controller';
import { LocationsService } from './locations.service';
import { Location, LocationSchema } from './schemas/location.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Location.name, schema: LocationSchema },
    ]),
    RawModule,
    QuarantineModule,
  ],
  controllers: [LocationsController],
  providers: [LocationsService],
  exports: [LocationsService],
})
export class LocationsModule {}
