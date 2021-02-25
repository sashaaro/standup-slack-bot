import { Component, OnInit } from '@angular/core';
import {Team, TeamService} from "../../../api/auto";
import {delay, map, publishReplay, refCount, startWith, switchMap} from "rxjs/operators";
import {MatSlideToggleChange} from "@angular/material/slide-toggle";
import {Subject} from "rxjs";

@Component({
  selector: 'app-teams',
  templateUrl: './teams.component.html',
  styleUrls: ['./teams.component.scss']
})
export class TeamsComponent implements OnInit {
  manualUpdate = new Subject()
  teams$ = this.manualUpdate.pipe(
    startWith(null),
    switchMap(_ => this.teamService.getTeams()),
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

  achieve(team: Team) {
    this.teamService.updateStatus(team.id, {
      status: 3
    }).subscribe(t => {
      // TODO notification
      this.manualUpdate.next();
    })
  }
}
