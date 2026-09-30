import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import type { WebAnalyticsOperation } from '../../domain/models/portal.models';

export interface ApiFailureSignal {
  operation: WebAnalyticsOperation;
  httpStatus: number;
  errorCode: string;
}

@Injectable({ providedIn: 'root' })
export class AnalyticsEventBus {
  private readonly apiFailureSubject = new Subject<ApiFailureSignal>();
  readonly apiFailures = this.apiFailureSubject.asObservable();

  apiFailure(signal: ApiFailureSignal): void {
    this.apiFailureSubject.next(signal);
  }
}
