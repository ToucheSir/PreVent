import { TestBed } from '@angular/core/testing';

import { AnalysisFocusService } from './analysis-focus.service';

describe('AnalysisFocusService', () => {
  let service: AnalysisFocusService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AnalysisFocusService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
