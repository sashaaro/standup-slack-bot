import {Component, OnInit, TemplateRef, ViewChild} from '@angular/core';
import {Team, TeamService} from '../../../api/auto';
import {map, publishReplay, refCount, startWith, switchMap} from 'rxjs/operators';
import {merge, Subject} from 'rxjs';
import {ActivatedRoute} from '@angular/router';
import {UntilDestroy, untilDestroyed} from '@ngneat/until-destroy';
import {MatDialog} from '@angular/material/dialog';
import {MatSnackBar} from '@angular/material/snack-bar';

@UntilDestroy()
@Component({
  selector: 'app-teams',
  templateUrl: './teams.component.html',
  styleUrls: ['./teams.component.scss']
})
export class TeamsComponent implements OnInit {
  manualUpdate = new Subject<number|null>();
  teams$ =
    merge(
      this.activatedRoute.data.pipe(
        map(data => data.status)
      ),
      this.manualUpdate.pipe(map(_ => this.activatedRoute.snapshot.data.status))
    ).pipe(
      switchMap(status => this.teamService.getTeams(status)),
      publishReplay(1),
      refCount()
    );


  constructor(
    private teamService: TeamService,
    private activatedRoute: ActivatedRoute,
    public dialog: MatDialog,
    public snackBar: MatSnackBar,
  ) { }

  ngOnInit(): void {
  }
}
