import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import {TeamsComponent} from "./pages/teams/teams.component";
import {CreateTeamComponent} from "./pages/team/create-team/create-team.component";
import {AuthorizedGuard} from "./guard/authorized.guard";
import {WelcomeComponent} from "./pages/welcome/welcome.component";
import {EditTeamComponent} from "./pages/team/edit-team/edit-team.component";
import {StandupsComponent} from "./pages/standups/standups.component";
import {StatTeamComponent} from "./pages/team/stat-team/stat-team.component";
import {SettingsComponent} from "./pages/settings/settings.component";
import {PricingComponent} from "./pages/pricing/pricing.component";
import {GuestGuard} from "./guard/guest.guard";

const routes: Routes = [
  {
    path: 'welcome',
    component: WelcomeComponent,
    canActivate: [GuestGuard]
  },
  // {
  //   path: 'pricing',
  //   component: PricingComponent,
  //   canActivate: []
  // },
  {
    path: '',
    component: TeamsComponent,
    canActivate: [AuthorizedGuard],
    data: {status: null}
  },
  {
    path: 'archive',
    component: TeamsComponent,
    canActivate: [AuthorizedGuard],
    data: {status: 3}
  },
  {
    path: 'settings',
    component: SettingsComponent,
    canActivate: [AuthorizedGuard],
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
  },
  {
    path: 'team/:id/standups',
    component: StandupsComponent,
    canActivate: [AuthorizedGuard]
  },
  {
    path: 'team/:id/stat',
    component: StatTeamComponent,
    canActivate: [AuthorizedGuard]
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
