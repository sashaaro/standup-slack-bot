import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { AuthComponent } from './pages/auth/auth.component';
import {ApiModule, BASE_PATH} from "../api/auto";
import {HttpClientModule} from "@angular/common/http";

@NgModule({
  declarations: [
    AppComponent,
    AuthComponent,
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    ApiModule,
    AppRoutingModule,
  ],
  providers: [{
    provide: BASE_PATH,
    useValue: location.href + 'api'
  }],
  bootstrap: [AppComponent]
})
export class AppModule { }
