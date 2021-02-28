import {EntityRepository, Repository} from "typeorm";
import {Team, TEAM_STATUS_ACTIVATED} from "../model/Team";
import {scopeTeamJoins} from "./scopes";
import {formatTime} from "../services/utils";

@EntityRepository(Team)
export class TeamRepository extends Repository<Team> {
  findByStart(startedAt: Date): Promise<Team[]> {
    const qb = this.createQueryBuilder('team');

    scopeTeamJoins(qb);

    return qb
      .innerJoinAndSelect('team.timezone', 'timezone')
      .innerJoin( 'pg_timezone_names', 'pg_timezone', 'timezone.name = pg_timezone.name')
      .andWhere(`(team.start::time - pg_timezone.utc_offset) = :start::time`, {start: formatTime(startedAt, false)})
      .andWhere('team.status = :status', {status: TEAM_STATUS_ACTIVATED})
      .getMany();
  }

}
