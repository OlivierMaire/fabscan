import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OpencvCardFindComponent } from './opencv-card-find.component';

describe('OpencvCardFindComponent', () => {
  let component: OpencvCardFindComponent;
  let fixture: ComponentFixture<OpencvCardFindComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ OpencvCardFindComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(OpencvCardFindComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
