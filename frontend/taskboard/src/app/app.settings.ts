import { InjectionToken } from '@angular/core';

export interface AppSettings {
  apiBaseUrl: string;
}

export const APP_SETTINGS = new InjectionToken<AppSettings>('app.settings');
