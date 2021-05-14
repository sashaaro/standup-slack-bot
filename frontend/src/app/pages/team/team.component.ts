import {Component, HostBinding, EventEmitter, Input, OnInit, Output, ViewChild, TemplateRef} from '@angular/core';
import {Team, TeamService} from '../../../api/auto';
import {MatSlideToggleChange} from '@angular/material/slide-toggle';
import {MatDialog} from '@angular/material/dialog';
import {MatSnackBar} from '@angular/material/snack-bar';

@Component({
  selector: 'app-team',
  templateUrl: './team.component.html',
  styleUrls: ['./team.component.scss']
})
export class TeamComponent implements OnInit {
  @Input()
  team: Team;

  @Output()
  update = new EventEmitter<number|null>();

  @ViewChild('confirmDialogRef', {static: true}) confirmDialog: TemplateRef<any>;

  @HostBinding('class')
  // tslint:disable-next-line:typedef
  get classes() {
    return 'team' + (this.team?.status === 2 ? 'team--disabled' : '');
  }

  constructor(
    private teamService: TeamService,
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
    });
  }

  restoreTeam(team: Team) {
    this.teamService.updateStatus(team.id, {
      status: 1
    }).subscribe(t => {
      // TODO notification
      this.update.emit();
    });
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
          this.update.emit();
        });
      }
    });

  }


  untilTime(team: Team) { // TODO pipe
    const time = new Date(new Date('2020.01.01 ' + team.start).getTime() + team.duration * 60 * 1000); // TODO
    return time.getHours().toString().padStart(2, '0') + ':' + time.getMinutes().toString().padStart(2, '0');
  }
}
