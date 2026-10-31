/* Generated from the backend public contract. Do not edit by hand. */

export type Persona = "guest" | "member";
/**
 * @minItems 1
 * @maxItems 20
 */
export type Ids = string[];
export type Success = boolean;
export type Code = number;
export type Msg = string;
export type Mode = "demo";
export type Persona1 = "guest" | "member";
export type DisplayName = string;
export type SampledAt = string;
export type Success1 = boolean;
export type Code1 = number;
export type Msg1 = string;
export type Mode1 = "demo";
export type SampledAt1 = string;
export type ContentId = string;
export type Views = number;
export type Items = ReaderMetric[];

/**
 * Opt-in synthetic data only. No authentication, authorization or writes.
 */
export interface ReaderPreviewContract {
  identity_query: ReaderIdentityQuery;
  metrics_query: ReaderMetricsQuery;
  identity: PublicResponseReaderIdentity;
  metrics: PublicResponseReaderMetrics;
}
export interface ReaderIdentityQuery {
  persona?: Persona;
}
export interface ReaderMetricsQuery {
  ids: Ids;
}
export interface PublicResponseReaderIdentity {
  success?: Success;
  code?: Code;
  msg?: Msg;
  data: ReaderIdentity;
}
export interface ReaderIdentity {
  mode: Mode;
  persona: Persona1;
  display_name: DisplayName;
  sampled_at: SampledAt;
}
export interface PublicResponseReaderMetrics {
  success?: Success1;
  code?: Code1;
  msg?: Msg1;
  data: ReaderMetrics;
}
export interface ReaderMetrics {
  mode: Mode1;
  sampled_at: SampledAt1;
  items: Items;
}
export interface ReaderMetric {
  content_id: ContentId;
  views: Views;
}
