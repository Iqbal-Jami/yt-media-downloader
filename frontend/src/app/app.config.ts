import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, withViewTransitions, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    // Angular 21: Zoneless Change Detection (Performance Boost)
    provideZonelessChangeDetection(),
    
    // Router with Angular 21 features
    provideRouter(
      routes,
      withViewTransitions(), // Smooth page transitions
      withComponentInputBinding(), // Route params as component inputs
      withInMemoryScrolling({
        anchorScrolling: 'enabled',
        scrollPositionRestoration: 'enabled'
      })
    ),
    
    // HTTP Client with modern features
    provideHttpClient(
      withFetch(), // Use Fetch API instead of XHR
      // withInterceptors([...]) // Add interceptors here
    ),
    
    // Animations
    provideAnimations()
  ]
};
