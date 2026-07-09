/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TRELLO_API_KEY?: string;
  readonly VITE_TRELLO_API_BASE?: string;
  readonly VITE_GOOGLE_SHEET_PRICING_ID?: string;
  readonly VITE_GOOGLE_SHEET_PRICING_RANGE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare global {
  interface Window {
    TrelloPowerUp?: TrelloPowerUpFactory;
  }
}

export interface TrelloPowerUpFactory {
  initialize(capabilities: Record<string, unknown>, options?: Record<string, unknown>): void;
  iframe(options?: { appKey?: string; appName?: string }): TrelloIframe;
}

export interface TrelloIframe {
  arg(name: string): string | undefined;
  board(...properties: string[]): Promise<unknown>;
  card(...properties: string[]): Promise<unknown>;
  closeModal(): Promise<void>;
  getContext?(): unknown;
  getRestApi(): TrelloRestApi | Promise<TrelloRestApi>;
  get(scope: string, visibility: string, key: string, defaultValue?: unknown): Promise<unknown>;
  set(scope: string, visibility: string, key: string, value: unknown): Promise<void>;
  modal(options: Record<string, unknown>): Promise<void>;
  render(callback: () => void): void;
  sizeTo(selector: string): Promise<void>;
  signUrl?(url: string): string;
}

export interface TrelloRestApi {
  authorize(options: { scope: string; expiration?: string; name?: string }): Promise<string>;
  getToken(): Promise<string | null>;
}
