import { z } from 'zod';

export const ASSISTANT_CONTENT_VERSION = 1 as const;

const ContentValueSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);
const ChartDatumSchema = z.record(ContentValueSchema);

const ContentBlockBaseSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  sourceIds: z.array(z.string()).default([]),
});

export const MarkdownContentBlockSchema = z.object({
  type: z.literal('markdown'),
  id: z.string().min(1),
  content: z.string(),
});

export const MetricGridContentBlockSchema = ContentBlockBaseSchema.extend({
  type: z.literal('metric-grid'),
  metrics: z
    .array(
      z.object({
        label: z.string(),
        value: z.union([z.string(), z.number()]),
        detail: z.string().optional(),
        format: z.enum(['text', 'integer', 'decimal', 'currency', 'percentage']).default('text'),
      }),
    )
    .min(1),
});

const ChartSeriesSchema = z.object({
  key: z.string(),
  label: z.string(),
  color: z.string().optional(),
});

const ChartReferenceLineSchema = z.object({
  value: z.number(),
  label: z.string().optional(),
  color: z.string().optional(),
});

export const LineChartContentBlockSchema = ContentBlockBaseSchema.extend({
  type: z.literal('line-chart'),
  xKey: z.string(),
  valueFormat: z.enum(['number', 'currency', 'percentage']).default('number'),
  series: z.array(ChartSeriesSchema).min(1),
  referenceLines: z.array(ChartReferenceLineSchema).optional(),
  data: z.array(ChartDatumSchema),
});

export const BarChartContentBlockSchema = ContentBlockBaseSchema.extend({
  type: z.literal('bar-chart'),
  xKey: z.string(),
  valueFormat: z.enum(['number', 'currency', 'percentage']).default('number'),
  series: z.array(ChartSeriesSchema).min(1),
  data: z.array(ChartDatumSchema),
});

export const DataTableContentBlockSchema = ContentBlockBaseSchema.extend({
  type: z.literal('data-table'),
  columns: z
    .array(
      z.object({
        key: z.string(),
        label: z.string(),
        format: z.enum(['text', 'date', 'number', 'currency', 'badge', 'source']).default('text'),
      }),
    )
    .min(1),
  rows: z.array(ChartDatumSchema),
  initiallyVisibleRows: z.number().int().min(1).default(3),
});

export const AssistantContentBlockSchema = z.discriminatedUnion('type', [
  MarkdownContentBlockSchema,
  MetricGridContentBlockSchema,
  LineChartContentBlockSchema,
  BarChartContentBlockSchema,
  DataTableContentBlockSchema,
]);

export const AssistantContentEnvelopeSchema = z.object({
  version: z.literal(ASSISTANT_CONTENT_VERSION),
  blocks: z.array(AssistantContentBlockSchema),
});

export type AssistantContentBlock = z.infer<typeof AssistantContentBlockSchema>;
export type AssistantContentEnvelope = z.infer<typeof AssistantContentEnvelopeSchema>;
export type LineChartContentBlock = z.infer<typeof LineChartContentBlockSchema>;
export type BarChartContentBlock = z.infer<typeof BarChartContentBlockSchema>;
export type DataTableContentBlock = z.infer<typeof DataTableContentBlockSchema>;
export type MetricGridContentBlock = z.infer<typeof MetricGridContentBlockSchema>;
