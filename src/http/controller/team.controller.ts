import {Inject, Injectable} from 'injection-js';
import {AccessDenyError, BadRequestError, ResourceNotFoundError} from "../ApiMiddleware";
import {IHttpAction} from "./index";
import {classToPlain, plainToClassFromExist} from "class-transformer";
import {validateSync, ValidationError} from "class-validator";
import {
  TEAM_STATUS_ACHIEVED,
  TEAM_STATUS_ACTIVATED,
  teamStatuses
} from "../../model/Team";
import {em} from "../../services/providers";
import {Channel, Question, Team, Timezone, User} from "../../entity";
import {TeamRepository} from "../../repository/team.repository";
import {TeamDTO} from "../../dto/team-dto";
import {LOG_TOKEN} from "../../services/token";
import {Logger} from "pino";
import {sleep} from "../../services/utils";
import {DeadlockException, ServerException} from "@mikro-orm/core";

const clearFromTarget = (errors: ValidationError[]): Partial<ValidationError>[] => {
  return errors.map(error => {
    delete error.target
    delete error.value
    clearFromTarget(error.children)
    return error;
  })
};

@Injectable()
export class TeamController {
  constructor(
    @Inject(LOG_TOKEN) private log: Logger
  ) {
  }

  list: IHttpAction = async (req, res) => {

    let status = parseInt(req.query.status as string);

    if (!teamStatuses.includes(status)) {
      status = null;
    }

    const qb = em().createQueryBuilder(Team, 't')
        .select('*')
        .leftJoinAndSelect('t.timezone', 'tz')
        .leftJoinAndSelect('t.createdBy', 'created')
        .leftJoinAndSelect('t.users', 'users')
        .andWhere({'t.created_by_id': req.context.user.id})
    // TODO .addOrderBy('t.createdAt', "DESC")

    if (status) {
      qb.andWhere({'t.status': status})
    } else {
      qb.andWhere('t.status != ?', [TEAM_STATUS_ACHIEVED])
    }

    const teams = await qb.getResultList()

    //await em().execute('rollback');

    res.setHeader('Content-Type', 'application/json');
    res.send(teams);
  }

  private handleRequest(plainObject: any, teamDTO: TeamDTO): ValidationError[]
  {
    plainToClassFromExist(teamDTO, plainObject, {
      strategy: 'exposeAll'
    });
    const errors = validateSync(teamDTO);

    return clearFromTarget(errors) as ValidationError[];// TODO
  }

  create: IHttpAction = async (req, res) => {
    if (!req.context.user) {
      throw new AccessDenyError();
    }

    const teamDTO = new TeamDTO();
    const errors = this.handleRequest(req.body, teamDTO);

    if (errors.length === 0) {
      const team = new Team()
      team.name = teamDTO.name;
      team.days = teamDTO.days;
      team.start = teamDTO.start;
      team.timezone = em().getReference(Timezone, teamDTO.timezoneId);
      teamDTO.userIds.map(u => team.users.add(em().getReference(User, u)))
      team.reportChannel = em().getReference(Channel, teamDTO.reportChannelId);
      teamDTO.questions.forEach(q => team.questions.add(em().create(Question, q)));

      team.workspace = req.context.user.workspace;
      team.createdBy = req.context.user;
      team.status = TEAM_STATUS_ACTIVATED;

      await em().persistAndFlush(team)
      res.send(team);
    } else {
      res.status(400);
      res.send(errors);
    }
  }

  edit: IHttpAction = async (req, res) => {
    if (!req.context.user) {
      throw new AccessDenyError();
    }

    const teamDTO = new TeamDTO();
    const errors = this.handleRequest(req.body, teamDTO);

    const tem = await em().fork(false);
    const id = req.params.id as number|any

    await tem.begin()
    await tem.execute('SET TRANSACTION ISOLATION LEVEL SERIALIZABLE');

    let updatedTeam;
    try {
      const teamRepo = tem.getRepository(Team) as TeamRepository
      const team = await teamRepo.findActiveById(id);

      if (!team) {
        throw new ResourceNotFoundError('Team is not found');
      }

      if (req.context.user.id !== team.createdBy.id) {
        throw new ResourceNotFoundError('Team is not your own');
      }

      if (req.context.user.workspace.id !== team.workspace.id) {
        throw new ResourceNotFoundError('Team is not your own');
      }

      res.setHeader('Content-Type', 'application/json');
      if (errors.length === 0) {
        teamDTO.id = team.id
        updatedTeam = await teamRepo.submit(teamDTO);
        await sleep(5000)
        await tem.commit();
      } else {
        tem.rollback(); //release
        res.status(400).send(errors);
      }
    } catch (error) {
      if (error instanceof ServerException && '40001' === error.code) {
        await tem.commit();
      } else if (error instanceof ResourceNotFoundError) {
        this.log.debug(error.message)
        res.status(404).send('');
        return;
      } else {
        //res.status(500).send('');
        await tem.rollback();
        throw new error; // would return 500
        // return;
      }
    }

    res.send(classToPlain(updatedTeam, {strategy: 'excludeAll'}));
  }

  timezone: IHttpAction = async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(await em().find(Timezone, {}))
  }

  get: IHttpAction = async (req, res) => {
    if (!req.context.user) {
      throw new AccessDenyError();
    }

    const id = parseInt(req.params.id)
    if (!id) {
      throw new BadRequestError();
    }

    const team = await em().findOne(Team, id, {populate: ['questions', 'questions.options', 'timezone', 'reportChannel', 'users']});
    if (!team) {
      throw new BadRequestError(); // 404
    }

    // team.questions = team.questions.filter(q => q.isEnabled) // TODO serializer rule or sql?
    // team.questions.forEach(q => {
    //   q.options = q.options.filter(o => o.isEnabled)
    // })

    res.send(classToPlain(team, {strategy: 'excludeAll'}));
  }

  status: IHttpAction = async (req, res) => {
    if (!req.context.user) {
      throw new AccessDenyError();
    }

    const id = parseInt(req.params.id)
    if (!id) {
      throw new BadRequestError();
    }

    const status = parseInt(req.body.status)
    if (!teamStatuses.includes(status)) {
      throw new BadRequestError();
    }

    const team = await em().findOne(Team, id);
    if (!team) {
      throw new BadRequestError();
    }

    await em().createQueryBuilder(Team, 't')
      .where({id: team.id})
      .update({status: status})
      .execute()

    team.status = status;
    res.status(200).send(team);
  }

  stats: IHttpAction = async (req, res) => {
    if (!req.context.user) {
      throw new AccessDenyError();
    }

    res.send({})
  }
}
