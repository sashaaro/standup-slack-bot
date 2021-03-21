import {Block, KnownBlock} from "@slack/types";
import {ACTION_OPEN_DIALOG} from "./slack-bot-transport.service";
import StandUp from "../model/StandUp";

export const greetingBlocks = (standUp: StandUp, submitted = false) => {
  const fallbackText =  `It's time to start your daily standup ${standUp.team.originTeam.name}`;

  const blocks: (KnownBlock | Block)[] = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `Hello, it's time to start your daily standup *${standUp.team.originTeam.name}*`,
      },
    },
    {
      type: 'actions',
      elements: [
        // hasOptionQuestions
        /*{
          type: "button",
          text: {
            text: 'Start',
            type: 'plain_text'
          },
          value: ACTION_START,
          action_id: "1",
        },*/
        {
          type: "button",
          style: 'primary',
          text: {
            type: 'plain_text',
            text: 'Open dialog',
          },
          action_id: ACTION_OPEN_DIALOG,
          value: standUp.id.toString(),
        }
      ]
    }
  ];

  if (submitted) {
    // blocks[1].elements.push({
    //
    // })
  }

  return {blocks, text: fallbackText};
}