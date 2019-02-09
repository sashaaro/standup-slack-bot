export interface InteractiveResponse {
  type: 'interactive_message',
  actions: [{ name: 'start', type: 'button', value: 'start' }],
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


