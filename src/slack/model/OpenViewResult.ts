import {WebAPICallResult} from "@slack/web-api/dist/WebClient";

export interface OpenViewResult extends WebAPICallResult {
  view: {
    id: 'V01SNK733CY',
    team_id: 'TK074QB08',
    type: 'modal',
    blocks: any[],
    private_metadata: '{"standup":14}',
    callback_id: 'standup_submit',
    state: { values: {} },
    hash: '1616324379.Z7TA6ffl',
    title: { type: 'plain_text', text: 'Standup #324324324!!!', emoji: true },
    clear_on_close: false,
    notify_on_close: false,
    close: { type: 'plain_text', text: 'Cancel', emoji: true },
    submit: null,
    previous_view_id: null,
    root_view_id: 'V01SNK733CY',
    app_id: 'A01RMJH0ZDZ',
    external_id: '',
    app_installed_team_id: 'TK074QB08',
    bot_id: 'B01S4Q8H7JM'
  }
}
