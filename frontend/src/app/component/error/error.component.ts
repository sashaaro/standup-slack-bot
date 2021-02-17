import {Component, Input, OnInit} from '@angular/core';
import {AbstractControl} from "@angular/forms";
import {filter, map} from "rxjs/operators";
import {Observable} from "rxjs";

@Component({
  selector: 'app-error',
  templateUrl: './error.component.html',
  styleUrls: ['./error.component.scss'],
  host: {'class': 'error'}
})
export class ErrorComponent implements OnInit {
  @Input() control!: AbstractControl;
  public error$: Observable<string|null>;

  constructor() { }

  ngOnInit(): void {
    this.error$ = this.control.statusChanges.pipe(
      filter(status => 'INVALID' === status),
      map(status => Object.values(this.control.errors)),
      filter(errors => errors.length > 0),
      map(errors => errors[0])
    )
  }

}
