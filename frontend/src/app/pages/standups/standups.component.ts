import { Component, OnInit } from '@angular/core';
import {map, publishReplay, refCount, share, switchMap} from "rxjs/operators";
import {ActivatedRoute, Router} from "@angular/router";
import {Standup, StandupService} from "../../../api/auto";
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
    switchMap(([teamId, page]) => this.standupService.getStandups(teamId, page, 'response')),
    map((response: HttpResponse<Standup[]>) => ({
      standups: response.body,
      total: Number.parseInt(response.headers.get('x-total')) || 0
    })),
    publishReplay(1),
    refCount()
  )

  page: number;
  itemsPerPage = 5;

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private standupService: StandupService,
  ) { }

  ngOnInit(): void {
    // TODO const pageCount = Math.ceil(total / limit)
  }

  pageChanged(page) {
    this.router.navigate([], {queryParams: {page}})
  }
}
