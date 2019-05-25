import {IHttpAction} from "./index";
import StandUp from "../../model/StandUp";
import {Inject, Injectable} from 'injection-js';
import {Connection, Repository} from "typeorm";
import AuthorizationContext from "../../services/AuthorizationContext";
import {RENDER_TOKEN} from "../../services/token";
import {AccessDenyError} from "../dashboardExpressMiddleware";
import {isInProgress} from "../../slack/SlackTransport";
import Team from "../../model/Team";
import User from "../../model/User";


const replaceAll = function(string, search, replace){
  return string.split(search).join(replace);
}

const link = '(https?:\\/\\/(?:www\\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\\.[^\\s]{2,}|www\\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\\.[^\\s]{2,}|https?:\\/\\/(?:www\\.|(?!www))[a-zA-Z0-9]+\\.[^\\s]{2,}|www\\.[a-zA-Z0-9]+\\.[^\\s]{2,})'


// https://api.slack.com/docs/message-formatting
const formatMsg = async (team: Team, userRepository: Repository<User>, text) => {
  //text = text.replace(new RegExp('\:([a-z\-_]+)\:'), '<i class="em em-$1"></i>')
  //text = replaceAll(text, new RegExp('\:([a-z\-_]+)\:'), '<i class="em em-$1"></i>')

  let newText = text

  do {
    text = newText
    newText = text.replace(new RegExp('<'+link+'>'), '<a target="_blank" href="$1">$1</a>')
  } while (newText !== text)


  // channel link
  do {
    text = newText
    newText = text.replace(new RegExp('<#([A-Z0-9]+)\\|([#a-zA-Z0-9\-]+)>'),
      `<a target="_blank" href="https://${team.domain}.slack.com/messages/$1/details/">#$2</a>`
    )
  } while (newText !== text)

  do {
    text = newText
    const match = text.match(new RegExp('<@([A-Z0-9]+)>'))

    if (!match || match.length === 0) {
      break;
    }
    const user = await userRepository.findOne(match[1])
    if (user) {
      newText = text.substring(0, match.index) + text.slice(match.index).replace(`<@${match[1]}>`,
        `<a target="_blank" href="https://${team.domain}.slack.com/messages/${match[1]}/details/">@${user.name}</a>`)
    } else {
      newText = text.substring(0, match.index) + text.slice(match.index).replace(`<@${match[1]}>`, `<.@${match[1]}>`)
    }

  } while (true)

  do {
    text = newText
    newText = text.replace(new RegExp('\:([a-z\-_]+)\:'), '<i class="em em-$1"></i>')
  } while (newText !== text)

  return newText;
}

@Injectable()
export class StandUpsAction implements IHttpAction {
  constructor(
    private connection: Connection,
    @Inject(RENDER_TOKEN) private render: Function
  ) {

  }
  async handle(req, res) {
    const context = req.context as AuthorizationContext;
    const user = context.getUser()

    if (!user) {
      throw new AccessDenyError();
    }

    const globalParams = await context.getGlobalParams()
    const {team, channel} = globalParams


    if (!team) {
      // TODO 404
      throw new Error('team is not found');
    }

    if (!channel) {
      res.send(this.render('editChannel', globalParams));
      return;
    }

    const standUpRepository = this.connection.getRepository(StandUp);
    const userRepository = this.connection.getRepository(User);
    const qb = standUpRepository
      .createQueryBuilder('st')
      .innerJoinAndSelect('st.channel', 'channel')
      .leftJoinAndSelect('channel.users', 'user')
      .leftJoinAndSelect('st.answers', 'answers')
      .leftJoinAndSelect('answers.user', 'answersUser')
      .leftJoinAndSelect('answers.question', 'answersQuestion')
      .orderBy('st.end', 'DESC')
      //.andWhere('st.end <= CURRENT_TIMESTAMP')
      .where('channel.id = :channelID', {channelID: channel.id})

    const recordsPerPage = 5
    const page = parseInt(req.query.page) || 1;

    const standUpsTotal = await qb.getCount();

    const standUps = await qb
      .skip((page - 1) * recordsPerPage) // use offset method?!
      .take(recordsPerPage) // use limit method?!
      .getMany();

    const standUpList = [];
    for (let standUp of standUps) {
      const userAnswers = [];
      for (const u of standUp.channel.users) {
        for (const answer of standUp.answers as any) {
          if (answer.answerMessage) {
            answer.formatAnswerMessage = await formatMsg(team, userRepository, answer.answerMessage)
          }
        }

        userAnswers.push({
          user: u,
          answers: standUp.answers.filter(ans => ans.user.id === u.id)
        })
      }

      standUpList.push({
        standUp: standUp,
        answers: userAnswers
      })
    }

    const pageCount = Math.ceil(standUpsTotal / recordsPerPage)

    res.send(this.render('standUps', Object.assign({
      standUpList,
      activeMenu: 'reports',
      pageCount,
      isInProgress
    }, globalParams)));
  }
}
