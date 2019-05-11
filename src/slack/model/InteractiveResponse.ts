// see https://slack.dev/node-slack-sdk/interactive-messages#constraints
export enum InteractiveResponseWithinEnum {
  block_actions = 'block_actions',
  interactive_message = 'interactive_message',
  dialog = 'dialog'
}

export enum InteractiveResponseTypeEnum {
  message_action = 'message_action',
  dialog_submission = 'dialog_submission',
  button = 'button',
  select = 'select',

  // wtf?!
  interactive_message = 'interactive_message',

  dialog_cancellation = 'dialog_cancellation'
}

export interface InteractiveResponse {
  type: InteractiveResponseTypeEnum,
  actions: { name: string, type: string, value: string }[],
  callback_id: 'standup_invite',
  team: { id: 'T6GQB7CSF', domain: 'sashaaro' },
  channel: { id: 'D6HVDGXSB', name: 'directmessage' },
  user: { id: 'U6GSG49R8', name: 'sashaaro' },
  action_ts: '1549717095.909241',
  message_ts: '1549716785.001100',
  attachment_id: '1',
  token: 'Eeo49Ou9MDuvXEdFmnEZrRFB',
  is_app_unfurl: false,
  original_message:
    {
      type: 'message',
      subtype: 'bot_message',
      text: 'Would you like to play a game?',
      ts: '1549716785.001100',
      username: 'Standup Bot',
      bot_id: 'B6GQCM4P5',
      attachments: [[Object]]
    },
  response_url:
    'https://hooks.slack.com/actions/T6GQB7CSF/546720711042/j8HC7oybBaJji5485y5LcBAl',
  trigger_id: '546562582292.220827250899.33196fe718bc1de4fb286ac689f7b612'
}

export interface InteractiveDialogSubmissionResponse {
  type: 'dialog_submission',
  token: 'sdfjalsdlf',
  action_ts: '1549718276.192685',
  team: { id: 'T6GQB7CSF', domain: 'sashaaro' },
  user: { id: 'U6GSG49R8', name: 'sashaaro' },
  channel: { id: 'D6HVDGXSB', name: 'directmessage' },
  submission: { [key: string]: string},
  callback_id: 'send_answers',
  response_url:
    'https://hooks.slack.com/app/T6GQG4CSF/asdf/dsfasdf',
  state: 'some data'
}


