import { SlackPrefs } from "./SlackPrefs";

export interface  Icon {
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
    id: string;
    name: string;
    email_domain: string;
    domain: string;
    msg_edit_window_mins: number;
    prefs: SlackPrefs;
    icon: Icon;
    over_storage_limit: boolean;
    messages_count: number;
    plan: string;
    avatar_base_url: string;
    over_integrations_limit: boolean;
}