import SlackTime from "./../SlackTeam";

export default class RTMAuthenticatedResponse
{
    ok: boolean
    self: object
    team: SlackTime
    latest_event_ts: string
    channels: Array<object>
    ims: Array<object>
    users: Array<object>
    bots: Array<object>
}