import { Component, OnInit } from '@angular/core';
import {Team, TeamService} from "../../../api/auto";
import {delay, map, publishReplay, refCount, switchMap} from "rxjs/operators";
import {MatSlideToggleChange} from "@angular/material/slide-toggle";

@Component({
  selector: 'app-teams',
  templateUrl: './teams.component.html',
  styleUrls: ['./teams.component.scss']
})
export class TeamsComponent implements OnInit {
  teams$ = this.teamService.getTeams().pipe(
    publishReplay(1),
    refCount()
  )


  constructor(private teamService: TeamService) { }

  ngOnInit(): void {
    this.teams$.subscribe(teams => {
      //this.activateControls = new FormControl();
    })
  }

  toggle(e: MatSlideToggleChange, team: Team) {
    this.teamService.updateStatus(team.id, {
      status: team.status === 1 ? 2 : 1
    }).subscribe(t => {
      team.status = t.status;
      // TODO notification
    })
  }
}
