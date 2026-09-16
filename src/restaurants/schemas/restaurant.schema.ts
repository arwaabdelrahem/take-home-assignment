import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type RestaurantDocument = HydratedDocument<Restaurant>;

@Schema({ collection: 'restaurants' })
export class Restaurant {
  @Prop({ type: Number, required: true })
  outletCode: number;

  @Prop({ type: String })
  name?: string;

  @Prop({ type: String })
  url?: string;

  @Prop({ type: Number })
  talabatId?: number;

  @Prop({ type: String })
  logo?: string;

  @Prop({ type: String })
  location?: string;

  @Prop({ type: Number })
  rating?: number;

  @Prop({ type: Number })
  deliveryFee?: number;

  @Prop({ type: String })
  deliveryTime?: string;

  @Prop({ type: Number })
  minOrderAmount?: number;

  @Prop({ type: String })
  address?: string;

  @Prop({ type: String })
  city?: string;

  @Prop({ type: String })
  contact?: string;

  @Prop({ type: [Number], default: [] })
  areaIds: number[];

  @Prop({ type: Boolean, required: true })
  hasMenu: boolean;

  @Prop({ type: String, required: true })
  sourceProvider: string;

  @Prop({ type: String })
  outletStatus?: string;
}

export const RestaurantSchema = SchemaFactory.createForClass(Restaurant);
RestaurantSchema.index({ outletCode: 1, sourceProvider: 1 }, { unique: true });
