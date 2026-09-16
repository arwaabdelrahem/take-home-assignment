import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type RunDocument = HydratedDocument<Run>;

@Schema({ collection: 'runs' })
export class Run {
  @Prop({ required: true })
  status: string;

  @Prop()
  limit?: number;

  @Prop({ type: Object })
  counters?: Record<string, { upserted: number; quarantined: number }>;

  @Prop()
  error?: string;

  @Prop({ required: true })
  startedAt: Date;

  @Prop()
  finishedAt?: Date;
}

export const RunSchema = SchemaFactory.createForClass(Run);
