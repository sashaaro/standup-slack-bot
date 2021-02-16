import { Component, OnInit } from '@angular/core';
import {FormBuilder, Validators} from "@angular/forms";
import {UserService} from "../../../../api/auto";
import {log} from "../../../operator/log";

@Component({
  selector: 'app-create-team',
  templateUrl: './create-team.component.html',
  styleUrls: ['./create-team.component.scss'],
  host: {'class': 'ui grid'}
})
export class CreateTeamComponent implements OnInit {
  form = this.fb.group({
    name: [null, Validators.required],
    timezone: [null, Validators.required],
    startAt: [null, Validators.required],
    duration: [null, Validators.required],
    users: [null],
    reportChannel: [null],
    questions: [null],
  })
  submitting = false;
  questions = [];
  options = [];

  users$ = this.userService.userGet().pipe(log('users$'))

  constructor(
    private fb: FormBuilder,
    private userService: UserService
  ) { }

  ngOnInit(): void {

  }

  remove() {}
  add() {}

  addOption() {}
  removeOption(option) {}

  submit() {
    console.log(this.form.value)
  }
}
