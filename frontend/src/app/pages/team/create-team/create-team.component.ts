import { Component, OnInit } from '@angular/core';
import {AbstractControl, FormArray, FormBuilder, FormControl, FormGroup, Validators} from "@angular/forms";
import {TeamService, UserService, ValidationError} from "../../../../api/auto";
import {log} from "../../../operator/log";
import {HttpErrorResponse} from "@angular/common/http";
import {UntilDestroy, untilDestroyed} from "@ngneat/until-destroy";
import {map, startWith} from "rxjs/operators";

@UntilDestroy()
@Component({
  selector: 'app-create-team',
  templateUrl: './create-team.component.html',
  styleUrls: ['./create-team.component.scss'],
  host: {'class': 'ui grid'}
})
export class CreateTeamComponent implements OnInit {
  ngOnInit() {
  }
}
