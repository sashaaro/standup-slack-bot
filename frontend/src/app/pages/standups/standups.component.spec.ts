import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StandupsComponent } from './standups.component';

describe('StandupsComponent', () => {
  let component: StandupsComponent;
  let fixture: ComponentFixture<StandupsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ StandupsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(StandupsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
