export interface SlackUserProfile
{
    title: string;
    phone: string;
    skype: string;
    real_name: string;
    real_name_normalized: string;
    display_name: string;
    display_name_normalized: string;
    status_text: string;
    status_emoji: string;
    status_expiration: number;
    avatar_hash: string;
    always_active: boolean;
    first_name: string;
    last_name: string;
    image_24: string;
    image_32: string;
    image_48: string;
    image_72: string;
    image_192: string;
    image_512: string;
    status_text_canonical: string;
    team: string;
    // fields:
}

export interface SlackMember
{
    id: 'USLACKBOT',
    team_id: 'T6GQB7CSF',
    name: 'slackbot',
    deleted: false,
    color: '757575',
    real_name: 'slackbot',
    tz: null,
    tz_label: 'Pacific Daylight Time',
    tz_offset: -25200,
    profile: SlackUserProfile,
    is_admin: false,
    is_owner: false,
    is_primary_owner: false,
    is_restricted: false,
    is_ultra_restricted: false,
    is_bot: false,
    is_app_user: false,
    updated: 0
}