import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type MenuItemDocument = HydratedDocument<MenuItem>;

@Schema({ collection: 'menu_items' })
export class MenuItem {
  @Prop({ type: Number, required: true })
  itemId: number;

  @Prop({ type: String })
  name?: string;

  @Prop({ type: String })
  description?: string;

  @Prop({ type: Number })
  price?: number;

  @Prop({ type: Number })
  rating?: number;

  @Prop({ type: String })
  image?: string;

  @Prop({ type: Number, required: true })
  categoryId: number;

  @Prop({ type: Number, required: true })
  restaurantOutletId: number;

  @Prop({ type: String, required: true })
  sourceProvider: string;

  @Prop({ type: Boolean, required: true })
  priceIsZero: boolean;
}

export const MenuItemSchema = SchemaFactory.createForClass(MenuItem);
MenuItemSchema.index(
  { itemId: 1, restaurantOutletId: 1, sourceProvider: 1 },
  { unique: true },
);
