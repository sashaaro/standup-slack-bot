import { Injectable, Inject } from 'injection-js';
import {timer} from "rxjs";
import {delay, map, mapTo, mergeMap, share, tap} from "rxjs/operators";
import {LOGGER_TOKEN} from "../services/token";
import {Logger} from "winston";
import StandUp from "../model/StandUp";
import {TeamRepository} from "../repository/team.repository";
import {StandUpRepository} from "../repository/standup.repository";
import {fromPromise} from "rxjs/internal/observable/fromPromise";
import {Connection} from "typeorm";

const standUpGreeting = 'Hello, it\'s time to start your daily standup.'; // TODO for my_private team
const standUpGoodBye = 'Have good day. Good bye.';
const standUpWillRemindYouNextTime = `I will remind you when your next standup is up..`;

class InProgressStandUpNotFoundError extends Error {
  // answerMessage: IMessage

  constructor() {
    super('No stand up in progress')
  }
}


class OptionNotFoundError extends Error {
  public option: string;
  public standup: number; // TODO save
}

@Injectable()
export default class StandUpNotifier {
  constructor(
    private connection: Connection,
    @Inject(LOGGER_TOKEN) protected logger: Logger,
  ) {}

  create() {
    const teamRepository = this.connection.getCustomRepository(TeamRepository)
    const standUpRepository = this.connection.getCustomRepository(StandUpRepository)

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
      map(({teams, date}) => teams.map(team => {
        const standup = new StandUp()
        standup.startAt = date;
        standup.team = team;
        return standup;
      })),
      mergeMap(standups =>
        fromPromise(standUpRepository.insert(standups)).pipe(mapTo(standups))
      )
    )

    const end$ = interval$.pipe(
      mergeMap(date => fromPromise(standUpRepository.findEnd(date)))
    )

    return {start$, end$};
  }

}
