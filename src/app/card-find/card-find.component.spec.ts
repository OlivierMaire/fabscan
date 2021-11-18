import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CardFindComponent } from './card-find.component';

describe('CardFindComponent', () => {
  let component: CardFindComponent;
  let fixture: ComponentFixture<CardFindComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CardFindComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CardFindComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
