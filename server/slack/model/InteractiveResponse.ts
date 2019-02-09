export interface InteractiveResponse {
  "type": "interactive_message",
  "actions": [
    { "name": "game",
      "type": "button",
      "value": "maze"
    }],
  "callback_id": "answer111",
  "team": { "id": "T6GQB7CSF", "domain": "sashaaro" },
  "channel": { "id": "D6HVDGXSB", "name": "directmessage" },
  "user": { "id": "U6GSG49R8", "name": "sashaaro" },
  "action_ts": "1549713717.909071",
  "message_ts": "1549713605.000700",
  "attachment_id": "1",
  "token": "Eeo49Ou9MDuvXEdFmnEZrRFB",
  "is_app_unfurl": false,
  "original_message": { "type": "message", "subtype": "bot_message", "text": "Would you like to play a game?", "ts": "1549713605.000700", "username": "Standup Bot", "bot_id": "B6GQCM4P5", "attachments": [{ "callback_id": "answer111", "text": "Choose a game to play", "id": 1, "actions": [{ "id": "1", "name": "game", "text": "Chess", "type": "button", "value": "chess", "style": "" }, { "id": "2", "name": "game", "text": "Falken\'s Maze", "type": "button", "value": "maze", "style": "" }, { "id": "3", "name": "game", "text": "Thermonuclear War", "type": "button", "value": "war", "style": "danger", "confirm": { "text": "Wouldn\'t you prefer a good game of chess?", "title": "Are you sure?", "ok_text": "Yes", "dismiss_text": "No" } }], "fallback": "Choose a game to play" }] },
  "response_url": "https:\\/\\/hooks.slack.com\\/actions\\/T6GQB7CSF\\/546105697297\\/AUlDXF4VNWbzmDmwjfbauHhf",
  "trigger_id": "546913856741.220827250899.953e5f4aaf53d24fb58f7a868b0acd3e"
}