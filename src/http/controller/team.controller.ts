import {Injectable} from 'injection-js';
import {AccessDenyError, BadRequestError, ResourceNotFoundError} from "../ApiMiddleware";
import {IHttpAction} from "./index";
import Timezone from "../../model/Timezone";
import {classToPlain, plainToClassFromExist} from "class-transformer";
import {validateSync, ValidationError} from "class-validator";
import {
  TEAM_STATUS_ACHIEVED,
  TEAM_STATUS_ACTIVATED,
  teamStatuses
} from "../../model/Team";
import {em} from "../../services/providers";
import {Team} from "../../entity/team";

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
  teamRepository: any;
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
      try {
        await em().getRepository(Team).persist(team)
      } catch (e) {
        res.status(500).send('');
        throw e;
      }
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

    const team = await this.teamRepository.findActiveById(id);

    if (!team) {
      throw new ResourceNotFoundError('Team is not found');
    }

    if (req.context.user.id !== team.createdBy.id) {
      throw new ResourceNotFoundError('Team is not found');
    }

    if (req.context.user.workspace.id !== team.workspace.id) {
      throw new ResourceNotFoundError('Team is not found');
    }

    const errors = this.handleRequest(req.body, team);

    if (errors.length === 0) {
      await this.teamRepository.submit(team);
    }

    res.setHeader('Content-Type', 'application/json');
    if (errors.length === 0) {
      // load team from db?!
      team.questions.forEach(q => delete q.team);
      team.questions.forEach(q => q.options.forEach(o => delete o.question));// remove cycle deps for correct stringify

      res.send(classToPlain(team));
    } else {
      res.status(400).send(errors);
    }
  }

  timezone: IHttpAction = async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send([])//await this.connection.getRepository(Timezone).find())
  }

  get: IHttpAction = async (req, res) => {
    if (!req.context.user) {
      throw new AccessDenyError();
    }

    const id = parseInt(req.params.id)
    if (!id) {
      throw new BadRequestError();
    }

    const team = await this.teamRepository.findOne(id, {relations: ['questions', 'timezone', 'reportChannel', 'users']});
    if (!team) {
      throw new BadRequestError();
    }

    team.questions = team.questions.filter(q => q.isEnabled) // TODO serializer rule or sql?
    team.questions.forEach(q => {
      q.options = q.options.filter(o => o.isEnabled)
    })

    res.send(classToPlain(team));
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
