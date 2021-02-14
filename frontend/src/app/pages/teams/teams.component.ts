import { Component, OnInit } from '@angular/core';
import {TeamService} from "../../../api/auto";

@Component({
  selector: 'app-teams',
  templateUrl: './teams.component.html',
  styleUrls: ['./teams.component.scss']
})
export class TeamsComponent implements OnInit {
  teams$ = this.teamService.teamGet()
  teams = []

  constructor(private teamService: TeamService) { }

  ngOnInit(): void {
    this.teams$.subscribe(teams => this.teams = teams)
  }

}
