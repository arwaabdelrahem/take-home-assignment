import { Module } from '@nestjs/common';
import { RawService } from './raw.service';

@Module({
  providers: [RawService],
  exports: [RawService],
})
export class RawModule {}
