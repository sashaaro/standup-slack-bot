import { SlackTeam } from "../SlackTeam";

export interface SlackIm
{
    id: string,
    created: number,
    is_im: boolean,
    is_org_shared: boolean,
    user: string,
    is_user_deleted: boolean,
    priority: number
}

export interface RTMAuthenticatedResponse
{
    ok: boolean
    self: object
    team: SlackTeam
    latest_event_ts: string
}