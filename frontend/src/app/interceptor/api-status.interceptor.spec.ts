import { TestBed } from '@angular/core/testing';

import { ApiStatusInterceptor } from './api-status.interceptor';

describe('ApiStatusInterceptor', () => {
  beforeEach(() => TestBed.configureTestingModule({
    providers: [
      ApiStatusInterceptor
      ]
  }));

  it('should be created', () => {
    const interceptor: ApiStatusInterceptor = TestBed.inject(ApiStatusInterceptor);
    expect(interceptor).toBeTruthy();
  });
});
