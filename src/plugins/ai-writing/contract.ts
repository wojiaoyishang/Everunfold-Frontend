/* Generated from the AI writing plugin OpenAPI. SHA256: e19f75d6674d53919f50b7c7bac4e7c8a77ca7fc28df5919dfcff7c4c029d940 */

export type Revision = number;
export type Enabled = boolean;
export type DefaultProviderId = string | null;
export type Id = string;
export type Name = string;
export type Model = string;
export type BaseUrl = string;
export type ApiKeyConfigured = boolean;
export type Providers = AiProviderConfiguration[];
export type Revision1 = number;
export type Enabled1 = boolean;
export type DefaultProviderId1 = string | null;
export type Id1 = string;
export type Name1 = string;
export type BaseUrl1 = string;
export type Model1 = string;
export type ApiKey = string | null;
export type ClearApiKey = boolean;
/**
 * @maxItems 20
 */
export type Providers1 = SaveAiProvider[];
export type Revision2 = number;
export type Enabled2 = boolean;
export type DefaultProviderId2 = string | null;
export type Id2 = string;
export type Name2 = string;
export type Model2 = string;
export type Providers2 = AiProviderSummary[];
export type RequestId = string;
export type ProviderId = string | null;
export type Scene =
  | "content.article.edit"
  | "content.shuoshuo.edit"
  | "pages.edit"
  | "glossary.edit"
  | "settings.site";
export type Field = string;
export type ResourceId = string | null;
export type Language = string;
export type Title = string;
export type Summary = string;
export type Body = string;
export type Restricted = boolean;
export type ExpectedRevision = number | null;
export type Id3 = string;
export type Status = "queued" | "running" | "succeeded" | "failed" | "unknown";
export type Text = string | null;
export type Error = string | null;
export type RequestId1 = string;
export type ProviderId1 = string | null;
export type ExpectedRevision1 = number | null;

export interface AiWritingContract {
  Configuration: AiConfiguration;
  SaveConfiguration: SaveAiConfiguration;
  Availability: AiAvailability;
  GenerationRequest: GenerateAiText;
  Generation: AiGeneration;
  TestRequest: TestAiConnection;
}
export interface AiConfiguration {
  revision: Revision;
  enabled: Enabled;
  fields: Fields;
  default_provider_id: DefaultProviderId;
  providers: Providers;
}
export interface Fields {
  [k: string]: string[];
}
export interface AiProviderConfiguration {
  id: Id;
  name: Name;
  model: Model;
  base_url: BaseUrl;
  api_key_configured: ApiKeyConfigured;
}
export interface SaveAiConfiguration {
  revision: Revision1;
  enabled: Enabled1;
  fields: Fields1;
  default_provider_id: DefaultProviderId1;
  providers: Providers1;
}
export interface Fields1 {
  [k: string]: string[];
}
export interface SaveAiProvider {
  id: Id1;
  name: Name1;
  base_url: BaseUrl1;
  model: Model1;
  api_key?: ApiKey;
  clear_api_key?: ClearApiKey;
}
export interface AiAvailability {
  revision: Revision2;
  enabled: Enabled2;
  fields: Fields2;
  default_provider_id: DefaultProviderId2;
  providers: Providers2;
  restricted_by_default: RestrictedByDefault;
}
export interface Fields2 {
  [k: string]: string[];
}
export interface AiProviderSummary {
  id: Id2;
  name: Name2;
  model: Model2;
}
export interface RestrictedByDefault {
  [k: string]: boolean;
}
export interface GenerateAiText {
  request_id: RequestId;
  provider_id?: ProviderId;
  scene: Scene;
  field: Field;
  resource_id?: ResourceId;
  language: Language;
  title: Title;
  summary?: Summary;
  body?: Body;
  restricted?: Restricted;
  expected_revision?: ExpectedRevision;
}
export interface AiGeneration {
  id: Id3;
  status: Status;
  text: Text;
  error: Error;
}
export interface TestAiConnection {
  request_id: RequestId1;
  provider_id?: ProviderId1;
  expected_revision?: ExpectedRevision1;
}

export type Configuration = AiWritingContract["Configuration"];

export type SaveConfiguration = AiWritingContract["SaveConfiguration"];

export type Availability = AiWritingContract["Availability"];

export type GenerationRequest = AiWritingContract["GenerationRequest"];

export type Generation = AiWritingContract["Generation"];

export type TestRequest = AiWritingContract["TestRequest"];
