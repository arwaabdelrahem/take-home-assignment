import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type MenuCategoryDocument = HydratedDocument<MenuCategory>;

@Schema({ collection: 'menu_categories' })
export class MenuCategory {
  @Prop({ type: Number, required: true })
  categoryId: number;

  @Prop({ type: String })
  name?: string;

  @Prop({ type: Number, required: true })
  restaurantOutletId: number;

  @Prop({ type: String, required: true })
  sourceProvider: string;
}

export const MenuCategorySchema = SchemaFactory.createForClass(MenuCategory);
MenuCategorySchema.index(
  { categoryId: 1, restaurantOutletId: 1, sourceProvider: 1 },
  { unique: true },
);
