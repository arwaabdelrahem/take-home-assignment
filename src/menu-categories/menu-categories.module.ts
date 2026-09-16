import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { QuarantineModule } from '../quarantine/quarantine.module';
import { RawModule } from '../raw/raw.module';
import { MenuCategoriesController } from './menu-categories.controller';
import { MenuCategoriesService } from './menu-categories.service';
import {
  MenuCategory,
  MenuCategorySchema,
} from './schemas/menu-category.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MenuCategory.name, schema: MenuCategorySchema },
    ]),
    RawModule,
    QuarantineModule,
  ],
  controllers: [MenuCategoriesController],
  providers: [MenuCategoriesService],
  exports: [MenuCategoriesService],
})
export class MenuCategoriesModule {}
