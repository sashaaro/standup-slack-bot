import {ActionsBlock, KnownBlock, SectionBlock} from "@slack/types";
import {ACTION_OPEN_DIALOG} from "./slack-bot-transport.service";
import {Standup} from "../entity";
import {ChatUpdateArguments} from "@slack/web-api";

export const generateStandupMsg = (standup: Standup, submitted = false, reportLink = null): Partial<ChatUpdateArguments> => {
  const fallbackText =  `It's time to start your daily standup ${standup.team.originTeam.name}`;

  const headerText =
      `it's time for *${standup.team.originTeam.name}* standup.${submitted ? ' :white_check_mark:' : ''}${reportLink ?  ' :page_facing_up: ' + ` <${reportLink}|Report>` : ''}`;
  const sectionBlock: SectionBlock = {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: headerText,
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
    ...(reportLink ? [] : [actionsBlock])
  ];

  return {
    text: fallbackText,
    blocks
  };
}