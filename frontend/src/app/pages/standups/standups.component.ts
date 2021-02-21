import { Component, OnInit } from '@angular/core';
import {map, publishReplay, refCount, share, switchMap} from "rxjs/operators";
import {ActivatedRoute} from "@angular/router";
import {Standup, StandupService} from "../../../api/auto";
import {HttpResponse} from "@angular/common/http";

@Component({
  selector: 'app-standups',
  templateUrl: './standups.component.html',
  styleUrls: ['./standups.component.scss']
})
export class StandupsComponent implements OnInit {
  response$ = this.activatedRoute.params.pipe(
    map(params => params.id),
    switchMap(teamId => this.standupService.getStandups(teamId, 'response')),
    map((response: HttpResponse<Standup[]>) => ({
      list: response.body,
      total: Number.parseInt(response.headers.get('x-total')) || 3
    })),
    publishReplay(1),
    refCount()
  )
  standups$ = this.response$.pipe(
    map(({list}) => list)
  )


  constructor(
    private activatedRoute: ActivatedRoute,
    private standupService: StandupService,
  ) { }

  ngOnInit(): void {
    // TODO const pageCount = Math.ceil(total / limit)
  }

}
