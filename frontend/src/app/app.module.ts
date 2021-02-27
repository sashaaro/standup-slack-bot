import {NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';

import {AppRoutingModule} from './app-routing.module';
import {AppComponent} from './app.component';
import {AuthComponent} from './pages/auth/auth.component';
import {ApiModule, Configuration} from "../api/auto";
import {HttpClientModule} from "@angular/common/http";
import {TeamsComponent} from './pages/teams/teams.component';
import {WelcomeComponent} from './pages/welcome/welcome.component';
import {TeamComponent} from './pages/team/team.component';
import {CreateTeamComponent} from './pages/team/create-team/create-team.component';
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import {AuthorizedGuard} from "./guard/authorized.guard";
import {ErrorComponent} from './component/error/error.component';
import {NgSelectModule} from "@ng-select/ng-select";
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatAutocompleteModule} from "@angular/material/autocomplete";
import {MatInputModule} from "@angular/material/input";
import {MatSelectModule} from "@angular/material/select";
import {MatButtonModule} from "@angular/material/button";
import {MatChipsModule} from "@angular/material/chips";
import {MatIconModule} from "@angular/material/icon";
import {MatSlideToggleModule} from "@angular/material/slide-toggle";
import {EditTeamComponent} from "./pages/team/edit-team/edit-team.component";
import {TeamFormComponent} from './pages/team/team-form/team-form.component';
import {FormatTimezonePipe} from './pipe/format-timezone.pipe';
import {DragDropModule} from "@angular/cdk/drag-drop";
import {ContenteditableDirective} from "./component/contenteditable.directive";
import {StandupsComponent} from './pages/standups/standups.component';
import {NgxPaginationModule} from "ngx-pagination";
import {AsyncDirective} from './component/async.directive';
import {LoaderComponent} from './component/loader/loader.component';
import {StatTeamComponent} from './pages/team/stat-team/stat-team.component';
import {SettingsComponent} from './pages/settings/settings.component';
import {PricingComponent} from './pages/pricing/pricing.component';
import {MatSnackBarModule} from "@angular/material/snack-bar";
import {MatDialogModule} from "@angular/material/dialog";

@NgModule({
  declarations: [
    AppComponent,
    AuthComponent,
    TeamsComponent,
    WelcomeComponent,
    TeamComponent,
    CreateTeamComponent,
    ErrorComponent,
    EditTeamComponent,
    TeamFormComponent,
    FormatTimezonePipe,
    ContenteditableDirective,
    StandupsComponent,
    AsyncDirective,
    LoaderComponent,
    StatTeamComponent,
    SettingsComponent,
    PricingComponent,
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    ApiModule,
    AppRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    NgSelectModule,
    BrowserAnimationsModule,
    MatFormFieldModule,
    MatAutocompleteModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatChipsModule,
    MatIconModule,
    MatSlideToggleModule,
    DragDropModule,
    NgxPaginationModule,
    MatSnackBarModule,
    MatDialogModule
  ],
  providers: [
    {
      provide: Configuration,
      useFactory: () => new Configuration({
        basePath: location.origin + '/api'
      })
    },
    AuthorizedGuard
  ],
  bootstrap: [AppComponent]
})
export class AppModule {
}
