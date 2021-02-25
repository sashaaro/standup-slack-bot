import {Injectable} from 'injection-js';
import {Connection} from "typeorm";
import {AccessDenyError, BadRequestError, ResourceNotFoundError} from "../apiExpressMiddleware";
import {IHttpAction} from "./index";
import Timezone from "../../model/Timezone";
import {plainToClassFromExist} from "class-transformer";
import {validateSync, ValidationError} from "class-validator";
import {Team, TEAM_STATUS_ACHIEVED, TEAM_STATUS_ACTIVATED, TEAM_STATUS_DEACTIVATED} from "../../model/Team";

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
  teamRepository = this.connection.getRepository(Team)

  constructor(
    private connection: Connection,
  ) {
  }

  list: IHttpAction = async (req, res) => {
    const teams = await this.connection.getRepository(Team).createQueryBuilder('t')
      .leftJoinAndSelect('t.timezone', 'tz')
      .leftJoinAndSelect('t.createdBy', 'createdBy')
      .leftJoinAndSelect('t.users', 'users')
      .andWhere('t.createdById = :createdBy', {createdBy: req.context.user.id})
      .andWhere('t.status != :exceptStatus', {exceptStatus: TEAM_STATUS_ACHIEVED})
      // TODO .addOrderBy('t.createdAt', "DESC")
      .getMany()

    res.setHeader('Content-Type', 'application/json');
    res.send(teams);
  }

  private handleRequest(plainObject: object, team: Team): ValidationError[]
  {
    plainToClassFromExist(team, plainObject, {
      strategy: 'excludeAll'
    });
    const errors = validateSync(team);

    return clearFromTarget(errors) as ValidationError[];// TODO
  }

  create: IHttpAction = async (req, res) => {
    if (!req.context.user) {
      throw new AccessDenyError();
    }

    const team = new Team()
    team.workspace = req.context.user.workspace;
    team.createdBy = req.context.user;

    const errors = this.handleRequest(req.body, team);

    if (errors.length === 0) {
      team.status = TEAM_STATUS_ACTIVATED;
      await this.teamRepository.save(team);
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

    const id = req.params.id as number|any

    const team = await this.teamRepository
      // .findOne({id: id, isEnabled: true}, {relations: ['timezone', 'questions', 'workspace', 'users', 'questions.options']})
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.timezone', 'timezone')
      .leftJoinAndSelect('t.questions', 'questions')
      .leftJoinAndSelect('t.workspace', 'workspace')
      .leftJoinAndSelect('t.reportChannel', 'reportChannel')
      .leftJoinAndSelect('t.users', 'users')
      .leftJoinAndSelect('questions.options', 'options')
      .leftJoinAndSelect('t.createdBy', 'createdBy')
      .where("t.id = :id", {id: id})
      .andWhere("createdBy.id = :me", {me: req.context.user.id})
      .andWhere('t.status = :status', {status: TEAM_STATUS_ACTIVATED})
      .orderBy("questions.index", "ASC")
      .getOne();

    if (!team) {
      throw new ResourceNotFoundError('Team is not found');
    }

    if (req.context.user.workspace.id !== team.workspace.id) {
      throw new ResourceNotFoundError('Team is not found');
    }

    const errors = this.handleRequest(req.body, team);

    if (errors.length === 0) {
      await this.teamRepository.save(team);
    }

    res.setHeader('Content-Type', 'application/json');
    if (errors.length === 0) {
      res.status(204).send(team);
    } else {
      res.status(400).send(errors);
    }
  }

  timezone: IHttpAction = async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(await this.connection.getRepository(Timezone).find())
  }

  get: IHttpAction = async (req, res) => {
    if (!req.context.user) {
      throw new AccessDenyError();
    }

    const id = parseInt(req.params.id)
    if (!id) {
      throw new BadRequestError();
    }

    const team = await this.teamRepository.findOne(id, {relations: ['timezone', 'reportChannel', 'users']});
    if (!team) {
      throw new BadRequestError();
    }

    res.send(team);
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
    if (![TEAM_STATUS_ACTIVATED, TEAM_STATUS_DEACTIVATED, TEAM_STATUS_ACHIEVED].includes(status)) {
      throw new BadRequestError();
    }

    const team = await this.teamRepository.findOne(id);
    if (!team) {
      throw new BadRequestError();
    }

    await this.teamRepository.update({id: team.id}, {status: status})
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
