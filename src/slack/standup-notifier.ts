import { Injectable, Inject } from 'injection-js';
import {Observable, of} from "rxjs";
import {map, mergeMap, share, tap} from "rxjs/operators";
import {Logger} from "pino";
import {TeamRepository} from "../repository/team.repository";
import {StandupRepository} from "../repository/standupRepository";
import {fromPromise} from "rxjs/internal/observable/fromPromise";
import {LOG_TOKEN} from "../services/token";
import {Team, Standup} from "../entity";
import {MikroORM} from "@mikro-orm/core";
import {PostgreSqlDriver} from "@mikro-orm/postgresql";
import {formatTime} from "../services/utils";
import {schedule} from "node-cron";

const standupGreeting = 'Hello, it\'s time to start your daily standup.'; // TODO for my_private team
const standupGoodBye = 'Have good day. Good bye.';
const standupWillRemindYouNextTime = `I will remind you when your next standup is up..`;



function cron(expr) {
  let counter = 0

  return new Observable((subscriber) => {
    const task = schedule(expr, () => {
      subscriber.next(counter++)
    })

    task.start()

    return () => task.destroy()
  })
}


@Injectable()
export default class StandupNotifier {
  constructor(@Inject(LOG_TOKEN) protected logger: Logger){}

  create(mikroORM: MikroORM<PostgreSqlDriver>) {
    const interval$ = cron('5 * * * * *')
      .pipe(
        map(_ => new Date()),
        share()
      )

    const start$ = interval$.pipe(
      mergeMap(date =>
        fromPromise(
          (mikroORM.em.getRepository(Team) as TeamRepository).findByStart(date)
        ).pipe(
          tap(teams => this.logger.debug({
            inTime: formatTime(date, true),
            teams: teams.map(t => t.id)
          }, 'Launch standups for teams')),
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
