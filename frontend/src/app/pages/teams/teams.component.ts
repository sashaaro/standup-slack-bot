import { Component, OnInit } from '@angular/core';
import {Team, TeamService} from "../../../api/auto";
import {map, publishReplay, refCount, switchMap} from "rxjs/operators";
import {MatSlideToggleChange} from "@angular/material/slide-toggle";

@Component({
  selector: 'app-teams',
  templateUrl: './teams.component.html',
  styleUrls: ['./teams.component.scss']
})
export class TeamsComponent implements OnInit {
  teams$ = this.teamService.getTeams().pipe(
    publishReplay(1),
    refCount(),
  )


  constructor(private teamService: TeamService) { }

  ngOnInit(): void {
    this.teams$.subscribe(teams => {
      //this.activateControls = new FormControl();
    })
  }

  toggle(e: MatSlideToggleChange, team: Team) {
    this.teamService.toggle(team.id).subscribe(t => {
      team.isEnabled = t.isEnabled;
    })
  }
}
