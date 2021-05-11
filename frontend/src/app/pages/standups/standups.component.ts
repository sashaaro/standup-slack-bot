import { Component, OnInit } from '@angular/core';
import {delay, map, publishReplay, refCount, switchMap} from "rxjs/operators";
import {ActivatedRoute, Router} from "@angular/router";
import {Standup, StandupService, Team, TeamService} from "../../../api/auto";
import {HttpResponse} from "@angular/common/http";
import {combineLatest} from "rxjs";

@Component({
  selector: 'app-standups',
  templateUrl: './standups.component.html',
  styleUrls: ['./standups.component.scss']
})
export class StandupsComponent implements OnInit {
  response$ =
    combineLatest([
      this.activatedRoute.params.pipe(map(params => params.id)),
      this.activatedRoute.queryParams.pipe(map(params => params.page || 1)),
    ]).pipe(
    switchMap(([teamId, page]) => combineLatest([
      this.standupService.getStandups(teamId, page, 'response'),
      this.teamService.getTeam(teamId).pipe(
        map(team => ({
          ...team,
          timezone: {
            ...team.timezone,
            offset: (team.timezone.utc_offset.hours || 0).toFixed().padStart(2, '0') + (team.timezone.utc_offset.minutes || 0).toFixed().padStart(2, '0')
          }
        }))
      ),
    ])),
    map(([response, team]: [HttpResponse<Standup[]>, Team]) => ({
      standups: response.body,
      total: Number.parseInt(response.headers.get('x-total')) || 0,
      team
    })),
    publishReplay(1),
    refCount()
  )

  page: number;
  itemsPerPage = 5;

  ceil = Math.ceil;

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private standupService: StandupService,
    private teamService: TeamService,
  ) { }

  ngOnInit(): void {
    // TODO const pageCount = Math.ceil(total / limit)
  }

  pageChanged(page) {
    this.router.navigate([], {queryParams: {page}})
  }
}
