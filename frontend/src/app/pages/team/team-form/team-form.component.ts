import {
  AfterViewInit,
  Component,
  Input,
  OnChanges,
  OnInit, QueryList,
  SimpleChanges,
  ViewChildren
} from '@angular/core';
import {AbstractControl, FormArray, FormBuilder, FormControl, FormGroup, Validators} from "@angular/forms";
import {
  ChannelService,
  Team,
  TeamService,
  TimezoneService,
  User,
  UserService,
  ValidationError
} from "../../../../api/auto";
import {UntilDestroy, untilDestroyed} from "@ngneat/until-destroy";
import {HttpErrorResponse} from "@angular/common/http";
import {Router} from "@angular/router";
import {combineLatest, NEVER, of, Subject} from "rxjs";
import {distinct, map, mergeMap, startWith, switchMap} from "rxjs/operators";
import {CdkDragDrop, moveItemInArray} from "@angular/cdk/drag-drop";
import {MatChip, MatChipInputEvent} from "@angular/material/chips";
import {BACKSPACE} from "@angular/cdk/keycodes";
import {FocusMonitor} from "@angular/cdk/a11y";

export const weekDays = [
  'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'
];

const valueChanges = (control: AbstractControl) => {
  return control.valueChanges.pipe(
    startWith(null),
    map(_ => control.value)
  )
}

@UntilDestroy()
@Component({
  selector: 'app-team-form',
  templateUrl: './team-form.component.html',
  styleUrls: ['./team-form.component.scss']
})
export class TeamFormComponent implements OnInit, OnChanges, AfterViewInit {
  @Input() team?: Team

  questionsControl: FormArray = new FormArray([])
  usersControl = new FormControl([], [Validators.required, Validators.minLength(1)]);
  form = this.fb.group({
    name: [null, Validators.required],
    timezone: [null, Validators.required],
    start: [null, Validators.required],
    duration: [null, [Validators.required, control => Number.isNaN(Number.parseInt(control.value, 10)) ? {required: true} : null]],
    users: this.usersControl,
    reportChannel: [null],
    questions: this.questionsControl,
  })

  @ViewChildren(MatChip) chips: QueryList<MatChip>;

  submitting = false;
  users$ = this.userService.getUsers()

  autocompleteUsers$ =
    combineLatest([
      this.users$,
      valueChanges(this.usersControl).pipe(
        map(selected => (selected || []).map(s => s.id))
      ),
    ]).pipe(
      map(([users, selected]) => users.filter(u => !selected.includes(u.id)))
    )

  timezones$ = this.timezoneService.getTimezones()
  channels$ = this.channelService.getChannels()

  focusQuestion$ = new Subject<number>();
   autocompleteOptions$ = this.focusQuestion$.pipe(
     switchMap(questionId => NEVER)
   )

  openOptionsControls = [];

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private teamService: TeamService,
    private timezoneService: TimezoneService,
    private channelService: ChannelService,
    private _focusMonitor: FocusMonitor,
    private router: Router
  ) {
  }

  ngOnInit(): void {
  }

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
        });

        this.form.reset(this.team);
        this.form.markAsPristine();
      } else {
        this.form.reset();
        this.questionsControl.push(this.createQuestionControl());
      }
    }
  }


  ngAfterViewInit() {
    this.chips.changes
      .pipe(
        mergeMap(list => of(...list.toArray())),
        distinct(),
        untilDestroyed(this)
      )
      .subscribe((chip: MatChip) => {
        this._focusMonitor.stopMonitoring(chip._elementRef)
        this.patchChip(chip)
      })
  }

  focusQuestion(questionId) {
    this.focusQuestion$.next(questionId)
  }

  private patchChip(chip: MatChip) {
    const origin = chip._handleKeydown
    chip._handleKeydown = function (...args) {
      if (BACKSPACE === args[0].keyCode) {
        // TODO avoid prevent default behavior for contenteditable
        return;
      }
      origin.call(this, ...args)
    }
    chip._handleKeydown.bind(chip);
  }

  remove(control: AbstractControl, value) {
    const list = [...control.value];
    list.splice(this.usersControl.value.indexOf(this.usersControl.value), 1)
    control.setValue(list);
  }

  focus(element: HTMLInputElement) {
    if (window.getSelection) {
      const s = window.getSelection();
      const r = document.createRange()
      const position = element.textContent.length
      r.setStart(element.childNodes[0], position);
      r.collapse(true)

      //r.setEnd(element, position);
      s.removeAllRanges();
      s.addRange(r);
    } else {
      element.focus({});
    }
  }

  add() {
    this.questionsControl.push(
      this.createQuestionControl()
    )
  }

  dropUser(control: AbstractControl, event: CdkDragDrop<User>) {
    const list = [...control.value]
    moveItemInArray(list, event.previousIndex, event.currentIndex)
    control.setValue(list)
  }

  addOption(optionsControl: FormArray|any, event: MatChipInputEvent) {
    const control = this.createOptionControl();
    control.patchValue({text: event.value.trim()});
    optionsControl.push(control);
    event.input.value = '';
    const index = this.openOptionsControls.indexOf(
      optionsControl.parent.get('id').value
    )
    if (index !== -1) {
      this.openOptionsControls.splice(index, 1);
    }
  }

  submit() {
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      // TODO return
    }
    const value = {...this.form.value};

    value.duration = Number.parseInt(value.duration, 10);

    console.log(this.questionsControl.value)
    value.questions = this.questionsControl.value.map((q, i) => {
      q.index = i;
      return q;
    })

    (this.team ?
      this.teamService.updateTeam(this.team.id, value) :
      this.teamService.createTeam(value)
    ).pipe(
      untilDestroyed(this)
    ).subscribe(team => {
      // todo notification
      // this.team = team;
      //this.router.navigateByUrl('/')
      location.reload();
    }, (e: HttpErrorResponse) => {
      if (400 === e.status) {
        const errors = e.error as ValidationError[];
        this.applyFormErrors(errors, this.form);
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
      text: this.fb.control(null, [Validators.required, Validators.minLength(1)]),
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

      const customError = error.constraints ? Array.from(Object.values(error.constraints)).shift() : null;
      if (customError) {
        control.setErrors({...control.errors, custom: customError})
      }

      if (error.children.length > 0) {
        if (control instanceof FormGroup || control instanceof FormArray) {
          this.applyFormErrors(error.children, control);
        } else {
          console.warn('Children errors are not assigned to control');
        }
      }
    })
  }

  compareWithById(a, b) {
    return a?.id === b?.id;
  }
}
