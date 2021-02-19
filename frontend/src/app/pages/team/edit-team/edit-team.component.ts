import { Component, OnInit } from '@angular/core';
import {ActivatedRoute} from "@angular/router";
import {map, switchMap} from "rxjs/operators";
import {UntilDestroy} from "@ngneat/until-destroy";
import {TeamService} from "../../../../api/auto";

@UntilDestroy()
@Component({
  selector: 'app-edit-team',
  templateUrl: './edit-team.component.html',
  styleUrls: ['./edit-team.component.scss']
})
export class EditTeamComponent implements OnInit {
  team$ = this.activatedRoute.params.pipe(
    map(params => params.id),
    switchMap(teamId => this.teamService.getTeam(teamId))
  )
  constructor(
    private activatedRoute: ActivatedRoute,
    private teamService: TeamService,
  ) { }

  ngOnInit(): void {

  }

}
