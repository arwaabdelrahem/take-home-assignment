import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { QuarantineService } from './quarantine.service';
import { Quarantine, QuarantineSchema } from './schemas/quarantine.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Quarantine.name, schema: QuarantineSchema },
    ]),
  ],
  providers: [QuarantineService],
  exports: [QuarantineService],
})
export class QuarantineModule {}
