import {
  AfterViewInit,
  Component, ElementRef,
  Input,
  OnChanges,
  OnInit, QueryList,
  SimpleChanges, TemplateRef, ViewChild,
  ViewChildren
} from '@angular/core';
import {AbstractControl, FormArray, FormBuilder, FormControl, FormGroup, Validators} from "@angular/forms";
import {
  ChannelService, Question, StatService,
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
import {BehaviorSubject, combineLatest, forkJoin, from, NEVER, of, ReplaySubject, Subject} from "rxjs";
import {
  distinct,
  distinctUntilChanged,
  filter,
  map,
  mergeMap,
  pairwise,
  startWith,
  switchMap,
  tap
} from "rxjs/operators";
import {CdkDragDrop, moveItemInArray} from "@angular/cdk/drag-drop";
import {MatChip, MatChipInputEvent} from "@angular/material/chips";
import {BACKSPACE, SPACE} from "@angular/cdk/keycodes";
import {FocusMonitor} from "@angular/cdk/a11y";
import {MatDialog} from "@angular/material/dialog";
import {MatSnackBar} from "@angular/material/snack-bar";
import {log} from "../../../operator/log";
import {chartConfig} from "../stat-team/stat-team.component";
import {chartColors} from "../../../service/utils";

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

  questionsControl: FormArray = new FormArray([
    this.createQuestionControl()
  ])
  usersControl = new FormControl([], [Validators.required, Validators.minLength(1)]);
  form = this.fb.group({
    name: [null, Validators.required],
    days: new FormArray(
      weekDays.map((d, index) => new FormControl(index < 5)),
      [
        Validators.required,
        (control) => control.value.filter(v => v).length === 0 ? {required: true} : null
      ]
    ),
    timezone: [null, Validators.required],
    start: [null, Validators.required],
    duration: [null, [Validators.required, control => Number.isNaN(Number.parseInt(control.value, 10)) ? {required: true} : null]],
    users: this.usersControl,
    reportChannel: [null, Validators.required],
    questions: this.questionsControl,
  })

  @ViewChildren(MatChip) chips: QueryList<MatChip>;
  @ViewChild('confirmDialogRef', {static: true}) confirmDialog: TemplateRef<any>;
  @ViewChild('statsDialogRef', {static: true}) statsDialog: TemplateRef<any>;

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

  weekDays = weekDays

  timezones$ = this.timezoneService.getTimezones()
  channels$ = this.channelService.getChannels()

  focusQuestion$ = new Subject<number>();
   autocompleteOptions$ = this.focusQuestion$.pipe(
     switchMap(questionId => NEVER)
   )

  openOptionsControls = [];
  focusOption;
  submit$ = new BehaviorSubject(false);

  questionFocus = new Subject<Question>();

  autocompleteQuestions$ = of(null).pipe(
    switchMap(_ => this.questionFocus),
    filter(q => !!q),
    filter(q => !q.id),
    distinctUntilChanged((a, b) => a.id === b.id),
    switchMap(question => of([ // TODO ajax question.text
      //{id: 3, text: "He he"},
      //{id: 5, text: "bitch"},
      //question
    ]))
  )

  constructor(
    private router: Router,
    private fb: FormBuilder,
    private userService: UserService,
    private teamService: TeamService,
    private timezoneService: TimezoneService,
    private statService: StatService,
    private channelService: ChannelService,
    private _focusMonitor: FocusMonitor,
    public dialog: MatDialog,
    public snackBar: MatSnackBar,
    public elementRef: ElementRef<HTMLElement>,
  ) {
  }

  // TODO https://stackblitz.com/edit/angular-dyz1eb?file=src%2Fapp%2Fapp.component.ts
  // https://github.com/angular/components/issues/13372
  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges) {
    if ('team' in changes) {
      this.questionsControl.clear();

      if (this.team) {
        this.team.questions.forEach(q => {
          const questionControl = this.createQuestionControl()
          const optionsControl = questionControl.get('options') as FormArray
          q.options.forEach(o => optionsControl.push(this.createOptionControl()));
          this.questionsControl.push(questionControl)
        });

        const value = this.team as Team|any
        value.days = weekDays.map((v, i) => value.days.includes(i))
        this.form.reset(value);
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
      if (SPACE === args[0].keyCode) {
        return
      }
      if (BACKSPACE === args[0].keyCode) {
        // TODO avoid prevent default behavior for contenteditable
        //args[0].preventDefault();
        //chip._blur()
        return;
      }
      origin.call(this, ...args)
    }
    chip._handleKeydown.bind(chip);
  }

  remove(control: AbstractControl, value) {
    // TODO add hint would not be remove until you submit form
    const list = [...control.value];
    list.splice(this.usersControl.value.indexOf(this.usersControl.value), 1)
    control.setValue(list);
  }

  removeQuestion(qIndex: number) {
    if(!this.questionsControl.at(qIndex).value.id) {
      this.questionsControl.removeAt(qIndex)
      return
    }
    const dialogRef = this.dialog.open(this.confirmDialog, {
      width: '250px'
    });
    // confirm
    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.questionsControl.removeAt(qIndex)
      }
    })
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
    const control = this.createQuestionControl()
    this.questionsControl.push(control);
    control.markAsUntouched();
  }

  drop(control: FormArray, event: CdkDragDrop<User>) {
    moveItemInArray(control.controls, event.previousIndex, event.currentIndex)
  }

  addOption(optionsControl: FormArray|any, event: MatChipInputEvent) {
    const value = event.value.trim()
    if (!value) {
      return;
    }
    const control = this.createOptionControl();
    control.patchValue({text: value});
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
    this.form.updateValueAndValidity();
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const teamDTO: any = {};
    const value = this.form.value;
    teamDTO.name = value.name
    teamDTO.days = value.days.map((v, i) => v ? i : null).filter(v => v !== null);
    teamDTO.start = value.start
    teamDTO.timezoneId = value.timezone.id;
    teamDTO.duration = Number.parseInt(value.duration, 10);
    teamDTO.userIds = value.users.map(u => u.id);
    teamDTO.reportChannelId = value.reportChannel.id
    teamDTO.questions = this.questionsControl.controls.map((control, index) => ({
      ...control.value,
      index,
      options: (control.get('options') as FormArray).controls.map((oc, index) => ({...oc.value, index}))
    })) //value.questions.map((q, index) => ({...q, index}));
    teamDTO.questions.forEach((q) => q.text = q.text?.trim());

    (this.team ?
      this.teamService.updateTeam(this.team.id, teamDTO) :
      this.teamService.createTeam(teamDTO)
    ).pipe(
      tap(_ => this.submit$.next(true)),
      untilDestroyed(this)
    ).subscribe(team => {
      // todo notification
      this.snackBar.open(this.team ?'Successfully updated' : 'Successfully created', 'Ok', {
        verticalPosition: 'top',
        duration: 3000,
      });
      // ..this.team = team;
      this.router.navigateByUrl('/')
    }, (e: HttpErrorResponse) => {
      if (400 === e.status) {
        const errors = e.error as ValidationError[];
        this.applyFormErrors(errors, this.form);
      }
      this.submit$.next(false)
    }, () => {
      this.submit$.next(false)
    })
  }


  openStats(questionId) {
    const dialogRef = this.dialog.open(this.statsDialog, {
      width: '550px'
    });

    forkJoin([
      this.statService.getOptionsStat(questionId),
      from(import ('chart.js')),
      dialogRef.afterOpened()
    ]).subscribe(([stat, {Chart}]: any) => {
      const ids = [ ...new Set(stat.map(s => s.id)) ]
      const datasets = ids.map(id => {
        const l = stat.filter(s => s.id === id)
        return {
          labels: stat.map(s => s.startAt),
          datasets: [{
            label: l[0].text,
            fill: false,
            backgroundColor: chartColors.red,
            borderColor: chartColors.red,
            data: l.map(s => parseInt(s.count)),
          }]
        }
      })
      const labels = [1,2,3,4]
      console.log(datasets);
      console.log(datasets);
      new Chart(
        (dialogRef._containerInstance['_elementRef'].nativeElement.querySelector('.canvas') as HTMLCanvasElement).getContext('2d'),
        {
          type: 'line',
          data: {
            labels,
            datasets
          },
          options: {
            responsive: true,
            title: {
              display: true,
              text: 'Are you in office today?'
            },
            tooltips: {
              mode: 'index',
              intersect: false,
            },
            hover: {
              mode: 'nearest',
              intersect: true
            },
            scales: {
              xAxes: [{
                display: true,
                scaleLabel: {
                  display: false,
                  // labelString: 'Month'
                }
              }],
              yAxes: [{
                display: true,
                scaleLabel: {
                  display: true,
                  labelString: 'Answers'
                }
              }]
            }
          }
        })
    })


    dialogRef.afterClosed().subscribe(confirmed => {

    })
  }

  private createQuestionControl() {
    return this.fb.group({
      id: this.fb.control(null),
      text: this.fb.control(null, Validators.required),
      options: this.fb.array([], Validators.minLength(2)),
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
