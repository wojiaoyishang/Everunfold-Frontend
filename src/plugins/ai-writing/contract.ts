/* Generated from the AI writing plugin OpenAPI. SHA256: b2111e6fc60cd0e2dd725df95ecd99e9b74405eef9b3cbaa64fd2e38f50de7bf */

export type Revision = number;
export type Enabled = boolean;
export type BaseUrl = string;
export type Model = string;
export type ApiKeyConfigured = boolean;
export type Revision1 = number;
export type Enabled1 = boolean;
export type BaseUrl1 = string;
export type Model1 = string;
export type ApiKey = string | null;
export type ClearApiKey = boolean;
export type Revision2 = number;
export type Enabled2 = boolean;
export type Provider = string;
export type RequestId = string;
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
export type Id = string;
export type Status = "queued" | "running" | "succeeded" | "failed" | "unknown";
export type Text = string | null;
export type Error = string | null;
export type RequestId1 = string;

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
  base_url: BaseUrl;
  model: Model;
  fields: Fields;
  api_key_configured: ApiKeyConfigured;
}
export interface Fields {
  [k: string]: string[];
}
export interface SaveAiConfiguration {
  revision: Revision1;
  enabled: Enabled1;
  base_url: BaseUrl1;
  model: Model1;
  fields: Fields1;
  api_key?: ApiKey;
  clear_api_key?: ClearApiKey;
}
export interface Fields1 {
  [k: string]: string[];
}
export interface AiAvailability {
  revision: Revision2;
  enabled: Enabled2;
  fields: Fields2;
  provider: Provider;
  restricted_by_default: RestrictedByDefault;
}
export interface Fields2 {
  [k: string]: string[];
}
export interface RestrictedByDefault {
  [k: string]: boolean;
}
export interface GenerateAiText {
  request_id: RequestId;
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
  id: Id;
  status: Status;
  text: Text;
  error: Error;
}
export interface TestAiConnection {
  request_id: RequestId1;
}

export type Configuration = AiWritingContract["Configuration"];

export type SaveConfiguration = AiWritingContract["SaveConfiguration"];

export type Availability = AiWritingContract["Availability"];

export type GenerationRequest = AiWritingContract["GenerationRequest"];

export type Generation = AiWritingContract["Generation"];

export type TestRequest = AiWritingContract["TestRequest"];
