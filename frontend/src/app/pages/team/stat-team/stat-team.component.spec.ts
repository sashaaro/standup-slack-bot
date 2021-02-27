import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StatTeamComponent } from './stat-team.component';

describe('StatTeamComponent', () => {
  let component: StatTeamComponent;
  let fixture: ComponentFixture<StatTeamComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ StatTeamComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(StatTeamComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
