import { ErrorHandler, Injectable } from '@angular/core';
import { WebAnalyticsCollector } from './web-analytics.collector';

@Injectable()
export class AnalyticsErrorHandler implements ErrorHandler {
  constructor(private readonly analytics: WebAnalyticsCollector) {}

  handleError(error: unknown): void {
    this.analytics.frontendError();
    console.error(error);
  }
}
