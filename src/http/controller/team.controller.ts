import {Injectable} from 'injection-js';
import {Connection} from "typeorm";
import {AccessDenyError, BadRequestError, ResourceNotFoundError} from "../ApiMiddleware";
import {IHttpAction} from "./index";
import Timezone from "../../model/Timezone";
import {plainToClassFromExist} from "class-transformer";
import {validateSync, ValidationError} from "class-validator";
import {
  Team,
  TEAM_STATUS_ACHIEVED,
  TEAM_STATUS_ACTIVATED,
  teamStatuses
} from "../../model/Team";
import Question from "../../model/Question";
import QuestionOption from "../../model/QuestionOption";

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
    let status = parseInt(req.query.status as string);

    if (!teamStatuses.includes(status)) {
      status = null;
    }

    const qb = this.connection.getRepository(Team).createQueryBuilder('t')
      .leftJoinAndSelect('t.timezone', 'tz')
      .leftJoinAndSelect('t.createdBy', 'createdBy')
      .leftJoinAndSelect('t.users', 'users')
      .andWhere('t.createdById = :createdBy', {createdBy: req.context.user.id})
    // TODO .addOrderBy('t.createdAt', "DESC")

    if (status) {
      qb.andWhere('t.status = :status', {status: status})
    } else {
      qb.andWhere('t.status != :exceptStatus', {exceptStatus: TEAM_STATUS_ACHIEVED})
    }

    const teams = await qb.getMany()

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
      await this.teamRepository.manager.transaction(async manager => {
        await manager.getRepository(Team)
          .createQueryBuilder()
          .update({
            name: team.name,
            duration: team.duration,
            timezone: team.timezone,
            start: team.start,
            reportChannel: team.reportChannel,
            // users: team.users
          })
          .where({id: team.id})
          .execute();

        await manager.connection.query(
          `DELETE FROM user_teams_team WHERE "teamId" = $1 AND "userId" NOT IN (${team.users.map((u, i) => `$${i + 2}`).join(',')})`, [
          team.id,
          ...team.users.map(u => u.id)
        ]);
        await manager.query(
          `INSERT INTO user_teams_team ("teamId", "userId") VALUES ${team.users.map((u, i) => `($1, $${i + 2})`).join(',')} ON CONFLICT DO NOTHING`,
          [
          team.id,
          ...team.users.map(u => u.id)
        ]);

        const questionRepository = manager.getRepository(Question)
        const optionsRepository = manager.getRepository(QuestionOption)

        const newQuestions = team.questions.filter(q => !q.id)
        const existQuestions = team.questions.filter(q => !!q.id)

        if (existQuestions.length) {
          await questionRepository // mark as disabled removed questions
            .createQueryBuilder()
            .update(Question, {isEnabled: false})
            .where('teamId = :team', {team: team.id})
            .andWhere('id NOT IN(:...questions)', {questions: existQuestions.map(q => q.id)})
            .execute();
        }
        await Promise.all(existQuestions.map(q => questionRepository
          .createQueryBuilder()
          .update(Question, {text: q.text})
          .where({id: q.id})
          .execute())
        )

        await Promise.all(newQuestions.map(q => {
          // TODO find same.. in
          q.team = team;
          return questionRepository.insert(q);
        }));

        for (const q of team.questions.filter(q => q.options.length)) {
          const options = q.options

          const newOptions = options.filter(o => !o.id);
          const existOptions = options.filter(o => !!o.id)

          if (existOptions.length) {
            await optionsRepository // mark as disabled removed options
              .createQueryBuilder()
              .update(QuestionOption, {isEnabled: false})
              .where({question: q})
              .andWhere('id NOT IN(:...options)', {options: existOptions.map(o => o.id)})
              .execute()
          }

          await Promise.all(existOptions.map(o => questionRepository
              .createQueryBuilder()
              .update(QuestionOption, {text: o.text})
              .where({id: o.id})
              .execute()
          ));

          await Promise.all(newOptions.map(o => {
            // TODO find same
            o.question = q;
            return optionsRepository.insert(o);
          }))
        }
      })
    }

    res.setHeader('Content-Type', 'application/json');
    if (errors.length === 0) {
      // load team from db?!
      team.questions.forEach(q => delete q.team);
      team.questions.forEach(q => q.options.forEach(o => delete o.question));// remove cycle deps for correct stringify

      res.send(team);
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

    const team = await this.teamRepository.findOne(id, {relations: ['questions', 'timezone', 'reportChannel', 'users']});
    if (!team) {
      throw new BadRequestError();
    }

    team.questions = team.questions.filter(q => q.isEnabled)
    team.questions.forEach(q => {
      q.options = q.options.filter(o => o.isEnabled) // TODO sql
    })

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
