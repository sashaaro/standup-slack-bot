export interface SlackUserProfile
{
    first_name: string,
    last_name: string,
    avatar_hash: string,
    real_name: string,
    display_name: string,
    real_name_normalized: string,
    display_name_normalized: string,
    email: string,
    image_24: string,
    image_32: string,
    image_48: string,
    image_72: string,
    image_192: string,
    image_512: string,
    fields: null,
    team: string
}

export interface SlackUser
{
    id: string
    team_id: string
    name: string
    deleted: boolean
    color: string
    real_name: string
    tz: string
    tz_label: string
    tz_offset: number
    profile: SlackUserProfile
}