import {ActionsBlock, KnownBlock, SectionBlock} from "@slack/types";
import {ACTION_OPEN_DIALOG} from "./slack-bot-transport.service";
import {Standup} from "../entity";
import {ChatUpdateArguments} from "@slack/web-api";

export const generateStandupMsg = (standup: Standup, submitted = false, done = false): Partial<ChatUpdateArguments> => {
  const fallbackText =  `It's time to start your daily standup ${standup.team.originTeam.name}`;

  const sectionBlock: SectionBlock = {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `it's time for *${standup.team.originTeam.name}* standup${submitted ? ' :white_check_mark:' : ''}
       <https://botenza.slack.com/archives/C01M9CE3N4T/p1619394510013300|Open report>
      `,
      // done  => add attachment
    },
  }

  const actionsBlock: ActionsBlock = {
    type: 'actions',
    elements: [
      {
        type: 'button',
        style: submitted ? undefined : 'primary',
        text: {
          type: 'plain_text',
          text: submitted ? 'Change answers' : 'Let\'s start',
        },
        action_id: ACTION_OPEN_DIALOG,
        value: standup.id.toString(),
      }
    ]
  }

  const blocks: KnownBlock[] = [
    sectionBlock,
    ...(done ? [] : [actionsBlock])
  ];

  return {
    text: fallbackText,
    blocks
  };
}