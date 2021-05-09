import {InjectionToken} from '@angular/core';
import {ReplaySubject, Subject} from 'rxjs';

export const SERVER_ERR_TOKEN = new InjectionToken<ReplaySubject<any>>('app.server_err');
