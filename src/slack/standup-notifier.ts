import { Injectable, Inject } from 'injection-js';
import {forkJoin, from, NEVER, of, timer} from "rxjs";
import {delay, map, mapTo, mergeMap, share, tap} from "rxjs/operators";
import {LOGGER_TOKEN} from "../services/token";
import {Logger} from "winston";
import Standup from "../model/Standup";
import {TeamRepository} from "../repository/team.repository";
import {StandupRepository} from "../repository/standupRepository";
import {fromPromise} from "rxjs/internal/observable/fromPromise";
import {Connection} from "typeorm";
import QuestionSnapshot from "../model/QuestionSnapshot";
import {TeamSnapshot} from "../model/TeamSnapshot";

const standupGreeting = 'Hello, it\'s time to start your daily standup.'; // TODO for my_private team
const standupGoodBye = 'Have good day. Good bye.';
const standupWillRemindYouNextTime = `I will remind you when your next standup is up..`;

@Injectable()
export default class StandupNotifier {
  constructor(
    private connection: Connection,
    @Inject(LOGGER_TOKEN) protected logger: Logger,
  ) {}

  create() {
    const teamRepository = this.connection.getCustomRepository(TeamRepository)
    const standupRepository = this.connection.getCustomRepository(StandupRepository)

    const intervalMs = 60 * 1000;  // every minutes

    const now = new Date();
    const milliseconds = now.getSeconds() * 1000 + now.getMilliseconds();
    const millisecondsDelay = intervalMs - milliseconds;

    this.logger.debug('Wait delay ' + (millisecondsDelay / 1000).toFixed(2) + ' seconds for run loop');

    const interval$ = timer(0, intervalMs)
      .pipe(
        map(_ => new Date()),
        delay(5 * 1000),
        share(),
        tap({
          error: e => this.logger.error('Interval loop error', {error: e})
        })
      )

    const start$ = interval$.pipe(
      mergeMap(date =>
        fromPromise(teamRepository.findByStart(date)).pipe(
          map(teams => ({teams, date}))
        )
      ),
      mergeMap(({teams, date}) =>
        forkJoin(
          teams.map(team =>
            fromPromise((async () => {
              const standup = new Standup();

              standup.startAt = date;
              // TODO ?! standup.startAt = new Date(Math.floor(date.getTime() / (60 * 1000)) * 60 * 1000)
              // TODO transaction
              standup.team = await teamRepository.findSnapshot(team); // disable edger?!
              if (!standup.team) {
                  standup.team = await teamRepository.insertSnapshot(team);
              }
              return standup;
            })())
          )
        )
      ),
      mergeMap(standups =>
        fromPromise(standupRepository.insert(standups)).pipe(mapTo(standups))
      )
    )

    const end$ = interval$.pipe(
      mergeMap(date => fromPromise(standupRepository.findEnd(date)))
    )

    return {start$, end$};
  }

}
