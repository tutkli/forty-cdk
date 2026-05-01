import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FortyCdk } from './forty-cdk';

describe('FortyCdk', () => {
  let component: FortyCdk;
  let fixture: ComponentFixture<FortyCdk>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FortyCdk],
    }).compileComponents();

    fixture = TestBed.createComponent(FortyCdk);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
