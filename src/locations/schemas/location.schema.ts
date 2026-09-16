import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type LocationDocument = HydratedDocument<Location>;

@Schema({ collection: 'locations' })
export class Location {
  @Prop({ type: Number, required: true })
  locationId: number;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true })
  slug: string;

  @Prop({ type: String, required: true })
  sourceProvider: string;
}

export const LocationSchema = SchemaFactory.createForClass(Location);
LocationSchema.index({ locationId: 1, sourceProvider: 1 }, { unique: true });
