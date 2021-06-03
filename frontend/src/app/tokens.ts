import {InjectionToken} from '@angular/core';
import {ReplaySubject} from 'rxjs';

export const SERVER_ERR_TOKEN = new InjectionToken<ReplaySubject<any>>('app.server_err');
export const AUTH_LINK_TOKEN = new InjectionToken<ReplaySubject<any>>('app.auth_link');
