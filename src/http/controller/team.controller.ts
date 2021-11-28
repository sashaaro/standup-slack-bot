import {Inject, Injectable} from 'injection-js';
import {BadRequestError, ResourceNotFoundError} from "../api.middleware";
import {instanceToPlain, plainToClassFromExist} from "class-transformer";
import {validateSync, ValidationError} from "class-validator";
import {em} from "../../services/providers";
import {Channel, Question, Team, Timezone, User} from "../../entity";
import {TeamRepository} from "../../repository/team.repository";
import {TeamDTO} from "../../dto/team-dto";
import {LOG_TOKEN} from "../../services/token";
import pino from "pino";
import {TEAM_STATUS_ACHIEVED, TEAM_STATUS_ACTIVATED, teamStatuses} from "../../entity/team";
import {reqContext} from "../middlewares";
import {authorized} from "../../decorator/authorized";
import {NotFoundError} from "@mikro-orm/core";

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
    @Inject(LOG_TOKEN) private log: pino.Logger
  ) {
  }

  @authorized
  async list(req, res) {
    let status = parseInt(req.query.status as string);

    if (!teamStatuses.includes(status)) {
      status = null;
    }

    const qb = em().createQueryBuilder(Team, 't')
        .select('*')
        .leftJoinAndSelect('t.timezone', 'tz')
        .leftJoinAndSelect('t.createdBy', 'created')
        .leftJoinAndSelect('t.users', 'users')
        .andWhere({'t.created_by_id': reqContext().user.id})
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

  @authorized
  async create(req, res) {
    const teamDTO = new TeamDTO();
    const errors = this.handleRequest(req.body, teamDTO);

    if (errors.length === 0) {
      const team = new Team()
      team.name = teamDTO.name;
      team.scheduleBitmask = teamDTO.scheduleBitmask;
      team.start = teamDTO.start;
      team.timezone = em().getReference(Timezone, teamDTO.timezoneId);
      teamDTO.userIds.forEach(u => team.users.add(em().getReference(User, u)))
      team.reportChannel = em().getReference(Channel, teamDTO.reportChannelId);
      teamDTO.questions.forEach(q => team.questions.add(em().create(Question, q)));

      team.workspace = reqContext().user.workspace;
      team.createdBy = reqContext().user;
      team.status = TEAM_STATUS_ACTIVATED;

      await em().persistAndFlush(team)
      res.send(team);
    } else {
      res.status(400);
      res.send(errors);
    }
  }

  @authorized
  async edit(req, res) {
    const teamDTO = new TeamDTO();
    const errors = this.handleRequest(req.body, teamDTO);

    const tem = await em();
    const id = req.params.id as number|any;

    const teamRepo = tem.getRepository(Team) as TeamRepository;
    const team = await teamRepo.findActiveById(id);

    if (!team) {
      throw new ResourceNotFoundError('Team is not found');
    }

    if (reqContext().user.id !== team.createdBy.id) {
      throw new ResourceNotFoundError('Team is not your own');
    }

    if (reqContext().user.workspace.id !== team.workspace.id) {
      throw new ResourceNotFoundError('Team is not your own');
    }

    res.setHeader('Content-Type', 'application/json');
    if (errors.length === 0) {
      teamDTO.id = team.id;
      let updatedTeam: Team;
      try {
          updatedTeam = await teamRepo.submit(teamDTO);
      } catch (e) {
        if (e instanceof NotFoundError) {
            const er = new ResourceNotFoundError('Team is not found');
            er.previous = e;
            throw er;
        } else {
            throw e;
        }
      }
      this.clearTeam(updatedTeam);
      res.send(instanceToPlain(updatedTeam, {strategy: 'excludeAll', groups: ["edit"]}));
    } else {
      res.status(400).send(errors);
    }
  }

  private clearTeam(team: Team)
  {
    team.questions.set(team.questions.getItems().filter(v => v.isEnabled))
    team.questions.getItems().forEach(q => {
      q.options.set(q.options.getItems().filter(v => v.isEnabled))
    });
  }

  @authorized
  async timezone(req, res) {
    res.setHeader('Content-Type', 'application/json');
    res.send(await em().find(Timezone, {}, {orderBy: {utc_offset: 'DESC'}}))
  }

  @authorized
  async get(req, res) {
    const id = parseInt(req.params.id)
    if (!id) {
      throw new BadRequestError();
    }

    const teamRepo = em().getRepository(Team) as TeamRepository
    const team = await teamRepo.findActiveById(id, false);
    if (!team) {
      throw new ResourceNotFoundError(); // 404
    }

    res.send(instanceToPlain(team, {strategy: 'excludeAll', groups: ["edit"]}));
  }

  @authorized
  async status(req, res) {
    const id = parseInt(req.params.id)
    if (!id) {
      throw new BadRequestError();
    }

    const status = parseInt(req.body.status)
    if (!teamStatuses.includes(status)) {
      throw new BadRequestError();
    }

    const team = await em().findOne(Team, {id});
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
}
