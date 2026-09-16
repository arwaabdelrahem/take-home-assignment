import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type QuarantineDocument = HydratedDocument<Quarantine>;

@Schema({ collection: 'quarantine' })
export class Quarantine {
  @Prop({ type: String })
  runId?: string;

  @Prop({ type: String, required: true })
  stream: string;

  @Prop({ type: String, required: true })
  reason: string;

  @Prop({ type: Object, required: true })
  record: Record<string, unknown>;
}

export const QuarantineSchema = SchemaFactory.createForClass(Quarantine);
QuarantineSchema.index({ runId: 1 });
