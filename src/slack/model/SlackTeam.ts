export interface SlackTeamIcons {
    image_34: string;
    image_44: string;
    image_68: string;
    image_88: string;
    image_102: string;
    image_132: string;
    image_230: string;
    image_default: boolean;
}

export interface SlackTeam
{
    "id": "T12345",
    "name": "My SlackWorkspace",
    "domain": "example",
    "email_domain": "example.com",
    "icon": SlackTeamIcons,
    "enterprise_id": "E1234A12AB",
    "enterprise_name": "Umbrella Corporation"
}