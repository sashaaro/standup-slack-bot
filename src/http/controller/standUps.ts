import {IHttpAction} from "./index";
import StandUp from "../../model/StandUp";
import {Inject, Injectable} from 'injection-js';
import {Connection, Repository} from "typeorm";
import DashboardContext from "../../services/DashboardContext";
import {RENDER_TOKEN} from "../../services/token";
import {AccessDenyError} from "../dashboardExpressMiddleware";
import Team from "../../model/Team";
import User from "../../model/User";
import {RenderFn} from "../../services/providers";


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
    @Inject(RENDER_TOKEN) private render: RenderFn
  ) {

  }
  async handle(req, res) {
    const context = req.context as DashboardContext;

    if (!context.user) {
      throw new AccessDenyError();
    }

    if (!context.channel) {
      res.send(this.render('editChannel'));
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
      .orderBy('st.endAt', 'DESC')
      .andWhere('st.endAt IS NOT NULL')
      .andWhere('channel.id = :channelID', {channelID: context.channel.id})

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
            answer.formatAnswerMessage = await formatMsg(context.user.team, userRepository, answer.answerMessage)
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

    res.send(this.render('standUps', {
      standUpList,
      activeMenu: 'reports',
      pageCount
    }));
  }
}
