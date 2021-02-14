import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { AuthComponent } from './pages/auth/auth.component';
import {ApiModule, Configuration} from "../api/auto";
import {HttpClientModule} from "@angular/common/http";
import { TeamsComponent } from './pages/teams/teams.component';
import { WelcomeComponent } from './pages/welcome/welcome.component';
import { TeamComponent } from './pages/team/team.component';
import { CreateTeamComponent } from './pages/team/create-team/create-team.component';
import {ReactiveFormsModule} from "@angular/forms";

@NgModule({
  declarations: [
    AppComponent,
    AuthComponent,
    TeamsComponent,
    WelcomeComponent,
    TeamComponent,
    CreateTeamComponent,
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    ApiModule,
    AppRoutingModule,
    ReactiveFormsModule,
  ],
  providers: [{
    provide: Configuration,
    useFactory: () => new Configuration({
      basePath: location.href + 'api'
    })
  }],
  bootstrap: [AppComponent]
})
export class AppModule { }
