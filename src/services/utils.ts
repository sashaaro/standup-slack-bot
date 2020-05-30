// https://api.slack.com/docs/message-formatting
import SlackWorkspace from "../model/SlackWorkspace";
import {Repository} from "typeorm";
import User from "../model/User";

export const linkExpr = '(https?:\\/\\/(?:www\\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\\.[^\\s]{2,}|www\\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\\.[^\\s]{2,}|https?:\\/\\/(?:www\\.|(?!www))[a-zA-Z0-9]+\\.[^\\s]{2,}|www\\.[a-zA-Z0-9]+\\.[^\\s]{2,})'

const replaceAll = function(string, search, replace){
  return string.split(search).join(replace);
}

const formatMsg = async (team: SlackWorkspace, userRepository: Repository<User>, text) => {
  //text = text.replace(new RegExp('\:([a-z\-_]+)\:'), '<i class="em em-$1"></i>')
  //text = replaceAll(text, new RegExp('\:([a-z\-_]+)\:'), '<i class="em em-$1"></i>')
  let newText = text
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
