export interface SlackPrefs
{
    invites_only_admins: boolean;
    show_join_leave: boolean;
    default_channels: Array<String>;
    display_email_addresses: boolean;
    locale: string;
    hide_referers: boolean;
    msg_edit_window_mins: number;
    allow_message_deletion: boolean;
    calling_app_name: string;
    allow_calls: boolean;
    display_real_names: boolean;
    who_can_at_everyone: string;
    who_can_at_channel: string;
    who_can_create_channels: string;
    who_can_archive_channels: string;
    who_can_create_groups: string;
    who_can_post_general: string;
    who_can_kick_channels: string;
    who_can_kick_groups: string;
    retention_type: number;
    retention_duration: number;
    group_retention_type: number;
    group_retention_duration: number;
    dm_retention_type: number;
    dm_retention_duration: number;
    file_retention_type: number;
    file_retention_duration: number;
    allow_retention_override: boolean;
    require_at_for_mention: boolean;
    default_rxns: Array<String>;
    compliance_export_start: number;
    warn_before_at_channel: string;
    disallow_public_file_urls: boolean;
    who_can_create_delete_user_groups: string;
    who_can_edit_user_groups: string;
    who_can_change_team_profile: string;
    who_has_team_visibility: string;
    disable_file_uploads: string;
    disable_file_editing: boolean;
    disable_file_deleting: boolean;
    uses_customized_custom_status_presets: boolean;
    disable_email_ingestion: boolean;
    who_can_manage_guests: object;//{ type: [Array] },
    who_can_create_shared_channels: string;
    who_can_manage_shared_channels: object;//{ type: [Array] },
    who_can_post_in_shared_channels: object;//{ type: [Array] },
    allow_shared_channel_perms_override: boolean;
    gdrive_enabled_team: boolean;
    can_receive_shared_channels_invites: boolean;
    enterprise_team_creation_request: object; //{ is_enabled: false },
    enterprise_default_channels: Array<object>;
    enterprise_mandatory_channels: Array<object>;
    enterprise_mdm_level: number;
    enterprise_mdm_date_enabled: number;
    all_users_can_purchase: boolean;
    loud_channel_mentions_limit: number;
    enable_shared_channels: number;
    custom_tos: boolean;
    dnd_enabled: boolean;
    dnd_start_hour: string;
    dnd_end_hour: string;
    custom_status_presets: Array<object>;
    custom_status_default_emoji: string;
    auth_mode: string;
    who_can_manage_integrations: object;//{ type: [Array] },
    discoverable: string;
    invites_limit: boolean;
}