import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import {TeamsComponent} from "./pages/teams/teams.component";
import {CreateTeamComponent} from "./pages/team/create-team/create-team.component";
import {AuthorizedGuard} from "./guard/authorized.guard";
import {WelcomeComponent} from "./pages/welcome/welcome.component";
import {EditTeamComponent} from "./pages/team/edit-team/edit-team.component";

const routes: Routes = [
  {
    path: 'welcome',
    component: WelcomeComponent,
    canActivate: [] // TODO GuestGuard
  },
  {
    path: '',
    component: TeamsComponent,
    canActivate: [AuthorizedGuard]
  },
  {
    path: 'team/create',
    component: CreateTeamComponent,
    canActivate: [AuthorizedGuard]
  },
  {
    path: 'team/:id/edit',
    component: EditTeamComponent,
    canActivate: [AuthorizedGuard]
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
