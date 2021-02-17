import { Component, OnInit } from '@angular/core';
import {AbstractControl, FormArray, FormBuilder, FormControl, FormGroup, Validators} from "@angular/forms";
import {TeamService, UserService, ValidationError} from "../../../../api/auto";
import {log} from "../../../operator/log";
import {HttpErrorResponse} from "@angular/common/http";
import {UntilDestroy, untilDestroyed} from "@ngneat/until-destroy";

@UntilDestroy()
@Component({
  selector: 'app-create-team',
  templateUrl: './create-team.component.html',
  styleUrls: ['./create-team.component.scss'],
  host: {'class': 'ui grid'}
})
export class CreateTeamComponent implements OnInit {
  questionsControl = new FormArray([
    this.createQuestionControl()
  ])

  form = this.fb.group({
    name: [null, Validators.required],
    timezone: [null, Validators.required],
    startAt: [null, Validators.required],
    duration: [null, Validators.required],
    users: [null],
    reportChannel: [null],
    questions: this.questionsControl,
  })

  submitting = false;
  questions = [];
  options = [];

  users$ = this.userService.getUsers().pipe(log('users$'))

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private teamService: TeamService
  ) { }

  private createQuestionControl()
  {
    return this.fb.group({
      text: this.fb.control(null, Validators.required),
      options: this.fb.array([

      ]),
    });
  }

  ngOnInit(): void {

  }

  remove() {}
  add() {
    this.questionsControl.push(
      this.createQuestionControl()
    )
  }

  addOption(optionsControl: FormArray|any) {
    optionsControl.push(new FormControl())
  }

  removeOption(options: FormArray|any, optionControl: AbstractControl) {

  }

  submit() {
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      // TODO return
    }

    this.teamService.createTeam(this.form.value).pipe(
      untilDestroyed(this)
    ).subscribe(r => {
      console.log(r)
    }, (e: HttpErrorResponse) => {
      if (400 === e.status) {
        const errors = e.error as ValidationError[];
        this.applyFormErrors(errors, this.form);
        console.log(this.form.get('name').errors)
      }
    })
  }

  applyFormErrors(errors: ValidationError[], form: FormGroup|FormArray) {
    errors.forEach(error => {
      const prop: any = parseInt(error.property) || error.property
      const control = form instanceof FormArray ? form.at(prop) : form.get(prop) as AbstractControl
      if (!control) {
        console.warn('Errors are not assigned to undefined control');
        return;
      }
      // for (const constraint in error.constraints) {}
      control.setErrors(error.constraints)
      if (error.children.length > 0) {
        if (control instanceof FormGroup || control instanceof FormArray) {
          this.applyFormErrors(error.children, control);
        } else {
          console.warn('Children errors are not assigned to control');
        }
      }
    })
  }
}
