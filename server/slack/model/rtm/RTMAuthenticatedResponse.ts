import { SlackTeam } from "../SlackTeam";
import { SlackUser } from "../SlackUser";
import { SlackBot } from "../SlackBot";
import { SlackChannel } from "../SlackChannel";

export interface Im
{
    id: string,
    created: number,
    is_im: boolean,
    is_org_shared: boolean,
    user: string,
    has_pins: boolean,
    last_read: string,
    is_open: boolean
}

export interface RTMAuthenticatedResponse
{
    ok: boolean
    self: object
    team: SlackTeam
    latest_event_ts: string
    channels: Array<SlackChannel>
    ims: Array<Im>
    users: Array<SlackUser>
    bots: Array<SlackBot>
}