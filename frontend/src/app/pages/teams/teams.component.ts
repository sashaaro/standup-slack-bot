import {Component, OnInit, TemplateRef, ViewChild} from '@angular/core';
import {Team, TeamService} from "../../../api/auto";
import {map, publishReplay, refCount, startWith, switchMap} from "rxjs/operators";
import {MatSlideToggleChange} from "@angular/material/slide-toggle";
import {merge, Subject} from "rxjs";
import {ActivatedRoute} from "@angular/router";
import {UntilDestroy, untilDestroyed} from "@ngneat/until-destroy";
import {MatDialog} from "@angular/material/dialog";
import {MatSnackBar} from "@angular/material/snack-bar";

@UntilDestroy()
@Component({
  selector: 'app-teams',
  templateUrl: './teams.component.html',
  styleUrls: ['./teams.component.scss']
})
export class TeamsComponent implements OnInit {
  manualUpdate = new Subject<number|null>()
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
    )

  @ViewChild('confirmDialogRef', {static: true}) confirmDialog: TemplateRef<any>;

  constructor(
    private teamService: TeamService,
    private activatedRoute: ActivatedRoute,
    public dialog: MatDialog,
    public snackBar: MatSnackBar,
  ) { }

  ngOnInit(): void {
  }

  toggle(e: MatSlideToggleChange, team: Team) {
    this.teamService.updateStatus(team.id, {
      status: team.status === 1 ? 2 : 1
    }).subscribe(t => {
      team.status = t.status;
      // TODO notification
    })
  }

  restoreTeam(team: Team) {
    this.teamService.updateStatus(team.id, {
      status: 1
    }).subscribe(t => {
      // TODO notification
      this.manualUpdate.next();
    })
  }
  achieve(team: Team) {
    const dialogRef = this.dialog.open(this.confirmDialog, {
      width: '250px'
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.teamService.updateStatus(team.id, {
          status: 3
        }).subscribe(t => {
          // TODO notification
          this.manualUpdate.next();
        })
      }
    })

  }

  untilTime(team: Team) { // TODO pipe
    const time = new Date(new Date('2020.01.01 ' + team.start).getTime() + team.duration * 60 * 1000); // TODO
    return time.getHours().toString().padStart(2, '0') + ':' + time.getMinutes().toString().padStart(2, '0')
  }
}
