export interface SlackChannel
{
    id: string,
    name: string,
    is_channel: boolean,
    created: number,
    creator: string,
    is_archived: boolean,
    is_general: boolean,
    unlinked: number,
    name_normalized: string,
    is_shared: boolean,
    is_org_shared: boolean,
    has_pins: boolean,
    is_member: boolean,
    is_private: boolean,
    is_mpim: boolean,
    last_read: string,
    members: Array<string>,

}