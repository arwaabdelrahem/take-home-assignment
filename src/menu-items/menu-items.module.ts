import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { QuarantineModule } from '../quarantine/quarantine.module';
import { RawModule } from '../raw/raw.module';
import { MenuItemsController } from './menu-items.controller';
import { MenuItemsService } from './menu-items.service';
import { MenuItem, MenuItemSchema } from './schemas/menu-item.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MenuItem.name, schema: MenuItemSchema },
    ]),
    RawModule,
    QuarantineModule,
  ],
  controllers: [MenuItemsController],
  providers: [MenuItemsService],
  exports: [MenuItemsService],
})
export class MenuItemsModule {}
