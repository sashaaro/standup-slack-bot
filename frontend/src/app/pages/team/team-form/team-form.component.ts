import {Component, Input, OnChanges, OnInit, SimpleChanges} from '@angular/core';
import {AbstractControl, FormArray, FormBuilder, FormControl, FormGroup, Validators} from "@angular/forms";
import {log} from "../../../operator/log";
import {Team, TeamService, UserService, ValidationError} from "../../../../api/auto";
import {untilDestroyed} from "@ngneat/until-destroy";
import {HttpErrorResponse} from "@angular/common/http";
import {Router} from "@angular/router";

@Component({
  selector: 'app-team-form',
  templateUrl: './team-form.component.html',
  styleUrls: ['./team-form.component.scss']
})
export class TeamFormComponent implements OnInit, OnChanges {
  @Input() team?: Team

  questionsControl: FormArray = new FormArray([])

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

  users$ = this.userService.getUsers()

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private teamService: TeamService,
    private router: Router
  ) {
  }

  ngOnInit(): void {}

  ngOnChanges(changes: SimpleChanges) {
    this.questionsControl.controls.forEach((_, index) => {
      this.questionsControl.removeAt(index)
    });

    if ('team' in changes) {
      if (this.team) {
        this.team.questions.forEach(q => {
          const questionControl = this.createQuestionControl()
          const optionsControl = questionControl.get('options') as FormArray
          q.options.forEach(o => optionsControl.push(this.createOptionControl()));
          this.questionsControl.push(questionControl)
        })
        this.form.reset(this.team);
        this.form.markAsPristine();
      } else {
        this.form.reset();
        this.questionsControl.push(this.createQuestionControl());
      }
    }
  }

  remove(qIndex: number) {
    this.questionsControl.removeAt(qIndex);
  }

  add() {
    this.questionsControl.push(
      this.createQuestionControl()
    )
  }

  addOption(optionsControl: FormArray|any) {
    optionsControl.push(this.createOptionControl())
  }

  removeOption(options: FormArray|any, index: number) {
    options.removeAt(index)
  }

  submit() {
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      // TODO return
    }

    (this.team ?
      this.teamService.createTeam(this.form.value) :
      this.teamService.updateTeam(this.team.id, this.form.value)).pipe(
      untilDestroyed(this)
    ).subscribe(team => {
      // todo notification
      this.router.navigateByUrl('/')
    }, (e: HttpErrorResponse) => {
      if (400 === e.status) {
        const errors = e.error as ValidationError[];
        this.applyFormErrors(errors, this.form);
        console.log(this.form.get('name').errors)
      }
    })
  }


  private createQuestionControl() {
    return this.fb.group({
      id: this.fb.control(null),
      text: this.fb.control(null, Validators.required),
      options: this.fb.array([

      ]),
    });
  }

  private createOptionControl() {
    return this.fb.group({
      id: this.fb.control(null),
      text: this.fb.control(null, Validators.required),
    });
  }

  private applyFormErrors(errors: ValidationError[], form: FormGroup|FormArray) {
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
