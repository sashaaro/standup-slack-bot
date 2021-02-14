import { Component, OnInit } from '@angular/core';
import {FormBuilder} from "@angular/forms";
import {UserService} from "../../../../api/auto";

@Component({
  selector: 'app-create-team',
  templateUrl: './create-team.component.html',
  styleUrls: ['./create-team.component.scss'],
  host: {'class': 'ui grid'}
})
export class CreateTeamComponent implements OnInit {
  form = this.fb.group({
    name: [null],
    timezone: [null],
    startAt: [null],
    duration: [null],
    users: [null, []],
    reportChannel: [null],
    questions: [null, []],
  })
  submitting = false;
  questions = [];
  options = [];

  users$ = this.userService.userGet()

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

}
