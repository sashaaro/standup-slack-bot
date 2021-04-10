// https://api.slack.com/events/message
export interface MessageResponse
{
    bot_id: string,
    type: string,
    subtype?: string,
    user: string,
    text: string,
    client_msg_id: string,
    team: string,
    channel: string,
    event_ts: '1546417638.006800',
    ts: '1546417638.006800'
}
