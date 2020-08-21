import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SignalViewerComponent } from './signal-viewer.component';

describe('SignalViewerComponent', () => {
  let component: SignalViewerComponent;
  let fixture: ComponentFixture<SignalViewerComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ SignalViewerComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SignalViewerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
