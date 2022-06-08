import {NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';

import {AppRoutingModule} from './app-routing.module';
import {AppComponent} from './app.component';
import {AuthComponent} from './pages/auth/auth.component';
import {ApiModule, Configuration} from '../api/auto';
import {HTTP_INTERCEPTORS, HttpClientModule} from '@angular/common/http';
import {TeamsComponent} from './pages/teams/teams.component';
import {WelcomeComponent} from './pages/welcome/welcome.component';
import {TeamComponent} from './pages/team/team.component';
import {CreateTeamComponent} from './pages/team/create-team/create-team.component';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {AuthorizedGuard} from './guard/authorized.guard';
import {ErrorComponent} from './component/error/error.component';
import {NgSelectModule} from '@ng-select/ng-select';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatAutocompleteModule} from '@angular/material/autocomplete';
import {MatInputModule} from '@angular/material/input';
import {MatSelectModule} from '@angular/material/select';
import {MatButtonModule} from '@angular/material/button';
import {MatChipsModule} from '@angular/material/chips';
import {MatIconModule} from '@angular/material/icon';
import {MatSlideToggleModule} from '@angular/material/slide-toggle';
import {EditTeamComponent} from './pages/team/edit-team/edit-team.component';
import {TeamFormComponent} from './pages/team/team-form/team-form.component';
import {FormatTimezonePipe} from './pipe/format-timezone.pipe';
import {DragDropModule} from '@angular/cdk/drag-drop';
import {ContenteditableDirective} from './component/contenteditable.directive';
import {StandupsComponent} from './pages/standups/standups.component';
import {NgxPaginationModule} from 'ngx-pagination';
import {AsyncDirective} from './component/async.directive';
import {LoaderComponent} from './component/loader/loader.component';
import {StatTeamComponent} from './pages/team/stat-team/stat-team.component';
import {SettingsComponent} from './pages/settings/settings.component';
import {PricingComponent} from './pages/pricing/pricing.component';
import {MatSnackBarModule} from '@angular/material/snack-bar';
import {MatDialogModule} from '@angular/material/dialog';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {ApiStatusInterceptor} from './interceptor/api-status.interceptor';
import {AUTH_LINK_TOKEN, NOT_FOUND_TOKEN, SERVER_ERR_TOKEN} from './tokens';
import {ReplaySubject, Subject} from 'rxjs';
import {environment} from '../environments/environment';


const scopes = [
  'team:read',
  'channels:read',
  'chat:write',
  'users:read',
  'users:write',
  'groups:read',
  'im:read',
  'im:write',
  'im:history',
];


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
    MatDialogModule,
    MatCheckboxModule,

    AsyncDirective,
  ],
  providers: [
    {
      provide: Configuration,
      useFactory: () => new Configuration({
        basePath: location.origin + '/api'
      })
    },
    AuthorizedGuard,
    {
      provide: HTTP_INTERCEPTORS,
      multi: true,
      useClass: ApiStatusInterceptor
    },
    {
      provide: SERVER_ERR_TOKEN,
      useValue: new ReplaySubject(1)
    },
    {
      provide: NOT_FOUND_TOKEN,
      useValue: new ReplaySubject(1)
    },
    {
      provide: AUTH_LINK_TOKEN,
      useFactory: () => `https://slack.com/oauth/v2/authorize?client_id=${environment.slackClientID}&scope=${scopes.join(',')}&redirect_uri=${location.origin}/api/auth`
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule {
}
