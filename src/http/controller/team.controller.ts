import StandUp from "../../model/StandUp";
import {Inject, Injectable} from 'injection-js';
import {Connection} from "typeorm";
import {AccessDenyError, BadRequestError, ResourceNotFoundError} from "../apiExpressMiddleware";
import {IHttpAction} from "./index";
import Timezone from "../../model/Timezone";
import {plainToClassFromExist} from "class-transformer";
import { validateSync, ValidationError } from "class-validator";
import {Team} from "../../model/Team";

@Injectable()
export class TeamController {
  teamRepository = this.connection.getRepository(Team)

  constructor(
    private connection: Connection,
  ) {
  }

  private handleRequest(plainObject: object, team: Team): ValidationError[]
  {
    console.log(team.questions);
    plainToClassFromExist(team, plainObject);
    console.log(team.questions);
    const errors = validateSync(team);
    return errors;
    /*if (errors.length > 0) {
      return errors
    }
    team.timezone = this.connection.manager.create(Timezone, {id: formData.timezone}) || team.timezone;
    team.name = formData.name;
    team.start = formData.start;
    team.duration = formData.duration;
    team.reportChannel = formData.reportChannel;
    team.users = (formData.receivers || []).map(r => this.connection.manager.create(User, {id: r}));

    const questions = team.questions;
    team.questions = [];
    formData.questions.forEach(q => {
      let question;
      if (q.id) {
        question = questions.find((qu) => qu.id === q.id)
        question = {...question, ...q}
      }

      if (!question) {
        question = this.connection.manager.create(Question, {...q, team})
      }
      const options = question.options;
      question.options = []
      q.options.forEach(o => {
        let option;
        if (o.id && !o.isNew) {
          option = options.find((op) => op.id === o.id);
          option = {...option, text: o.text}
        }
        if (!option) {
          option = this.connection.manager.create(QuestionOption, {
            id: o.id,
            text: o.text,
            question
          })
        }
        if (o.isNew) {
          delete option.id;
        }
        question.options.push(option)
      })
      team.questions.push(question);
    })

    team.questions.map((q, index) => q.index = index); // recalculate question index
    return [];*/
  }

  list: IHttpAction = async (req, res) => {
    const teams = await this.connection.getRepository(Team).createQueryBuilder('t')
      .leftJoinAndSelect('t.timezone', 'tz')
      .leftJoinAndSelect('t.createdBy', 'createdBy')
      .leftJoinAndSelect('t.users', 'users')
      //.andWhere('t.createdBy = :craetedBy', {craetedBy: req.context.user})
      .getMany()

    res.setHeader('Content-Type', 'application/json');
    res.send(teams);
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
      team.isEnabled = true;
      //await this.teamRepository.save(team);
      // notification
      res.send(team);
    } else {
      res.status(400);
      res.send(errors); // TODO remove target
    }
  }

  edit: IHttpAction = async (req, res) => {
    if (!req.context.user) {
      throw new AccessDenyError();
    }

    const id = req.params.id as number|any

    const team = await this.teamRepository.findOne({
      id: id,
      isEnabled: true
    }, {
      relations: ['timezone', 'questions', 'workspace', 'users', 'questions.options']
    })

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

  toggle: IHttpAction = async (req, res) => {
    if (!req.context.user) {
      throw new AccessDenyError();
    }

    const id = parseInt(req.params.id)
    if (!id) {
      throw new BadRequestError();
    }

    const team = await this.teamRepository.findOne(id);
    if (!team) {
      throw new BadRequestError();
    }

    await this.teamRepository.update({id: team.id}, {isEnabled: !team.isEnabled})

    res.status(204).send(team);
  }

  stats: IHttpAction = async (req, res) => {
    if (!req.context.user) {
      throw new AccessDenyError();
    }

    res.send({})
  }
}
