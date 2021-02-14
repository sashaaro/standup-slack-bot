import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import {TeamsComponent} from "./pages/teams/teams.component";
import {CreateTeamComponent} from "./pages/team/create-team/create-team.component";

const routes: Routes = [
  {
    path: '',
    component: TeamsComponent
  },
  {
    path: 'team/create',
    component: CreateTeamComponent
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
