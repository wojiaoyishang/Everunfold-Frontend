/* Generated from the backend public contract. Do not edit by hand. */

export type Username = string;
export type Password = string;
export type Success = boolean;
export type Code = number;
export type Msg = string;
export type Authenticated = boolean;
export type Id = string;
export type Username1 = string;
export type DisplayName = string;
export type Role = "admin" | "user";
export type CsrfToken = string;
export type ExpiresAt = string;
export type Success1 = false;
export type Code1 = number;
export type Msg1 = string;

export interface AuthContract {
  login: LoginInput;
  session: PublicResponseAuthSessionState;
  error: ErrorResponse;
}
export interface LoginInput {
  username: Username;
  password: Password;
}
export interface PublicResponseAuthSessionState {
  success?: Success;
  code?: Code;
  msg?: Msg;
  data: AuthSessionState;
}
export interface AuthSessionState {
  authenticated: Authenticated;
  user: AuthUser | null;
  csrf_token: CsrfToken;
  expires_at: ExpiresAt;
}
export interface AuthUser {
  id: Id;
  username: Username1;
  display_name: DisplayName;
  role: Role;
}
export interface ErrorResponse {
  success: Success1;
  code: Code1;
  msg: Msg1;
  data?: Data;
}
export interface Data {
  [k: string]: unknown;
}
