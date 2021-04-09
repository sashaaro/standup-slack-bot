import { Injectable, Inject } from 'injection-js';
import {of, timer} from "rxjs";
import {delay, map, mapTo, mergeMap, share, tap} from "rxjs/operators";
import {Logger} from "pino";
import {TeamRepository} from "../repository/team.repository";
import {StandupRepository} from "../repository/standupRepository";
import {fromPromise} from "rxjs/internal/observable/fromPromise";
import {LOG_TOKEN} from "../services/token";
import {em, emStorage} from "../services/providers";
import {Team, Standup, UserStandup} from "../entity";
import {withinContext} from "../operator/within-context.operator";
import {MikroORM} from "@mikro-orm/core";
import {PostgreSqlDriver} from "@mikro-orm/postgresql";

const standupGreeting = 'Hello, it\'s time to start your daily standup.'; // TODO for my_private team
const standupGoodBye = 'Have good day. Good bye.';
const standupWillRemindYouNextTime = `I will remind you when your next standup is up..`;

@Injectable()
export default class StandupNotifier {
  constructor(@Inject(LOG_TOKEN) protected logger: Logger){}

  create(mikroORM: MikroORM<PostgreSqlDriver>) {
    const intervalMs = 60 * 1000;  // every minutes

    const now = new Date();
    const milliseconds = now.getSeconds() * 1000 + now.getMilliseconds();
    const millisecondsDelay = intervalMs - milliseconds;

    this.logger.info('Wait delay ' + (millisecondsDelay / 1000).toFixed(2) + ' seconds for run loop');

    const interval$ = timer(0, intervalMs)
      .pipe(
        map(_ => new Date()),
        delay(5 * 1000),
        share(),
        tap({
          error: e => this.logger.error(e, 'Interval loop error')
        })
      )

    const start$ = interval$.pipe(
      mergeMap(date =>
        fromPromise(
          (mikroORM.em.getRepository(Team) as TeamRepository).findByStart(date)
        ).pipe(
          tap(teams => this.logger.debug({teams: teams.map(t => t.id)}, 'Launch standups for teams')),
          map(teams => ({teams, date}))
        )
      ),
      mergeMap(({teams, date}) => of(...teams.map(team => ({team, date})))),
      // withinContext(emStorage, () => mikroORM.em.fork(true, true)),
      mergeMap(({team, date}) => fromPromise(this.createStandup(team, date, mikroORM))),
    )

    const end$ = interval$.pipe(
      mergeMap(date => fromPromise((mikroORM.em.getRepository(Standup) as StandupRepository).findEnd(date)))
    )

    return {start$, end$};
  }

  private async createStandup(team: Team, date: Date, mikroORM) {
    const teamRepository = mikroORM.em.getRepository(Team) as TeamRepository;

    const standup = new Standup();

    standup.startAt = date;
    // TODO ?! standup.startAt = new Date(Math.floor(date.getTime() / (60 * 1000)) * 60 * 1000)
    // TODO transaction
    standup.team = await teamRepository.findSnapshot(team); // TODO disable edger?! IN?
    const newSnapshot = teamRepository.createSnapshot(team);
    if (!standup.team || !standup.team.equals(newSnapshot)) {
      standup.team = newSnapshot
      await mikroORM.em.persistAndFlush(newSnapshot) // TODO
    }
    //
    // team.users.getItems().forEach(u => {
    //   standup.users.add(em().create(UserStandup, {
    //     standup: standup,
    //     user: u,
    //   }))
    // })

    await mikroORM.em.persistAndFlush(standup)

    return standup
  }

}
