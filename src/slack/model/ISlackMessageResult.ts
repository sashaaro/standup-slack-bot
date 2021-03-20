export interface ISlackMessageResult {
  ok: true,
  channel: 'D01RSCDLNM9',
  ts: '1616242092.000900',
  message: {
    bot_id: 'B01S4Q8H7JM',
    type: 'message',
    text: "It's time to start your daily standup 324324324!!!",
    user: 'U01RP3TSBAR',
    ts: '1616242092.000900',
    team: 'TK074QB08',
    bot_profile: {
      id: 'B01S4Q8H7JM',
      deleted: false,
      name: 'Standup bot dev',
      updated: 1616100135,
      app_id: 'A01RMJH0ZDZ',
      icons: any[],
      team_id: 'TK074QB08'
    },
    blocks: any[]
  },
  response_metadata: {
    scopes: [
      'team:read',
      'channels:read',
      'chat:write',
      'users:read',
      'users:write',
      'groups:read',
      'im:read',
      'im:write',
      'im:history'
    ],
    acceptedScopes: ['chat:write']
  }
}