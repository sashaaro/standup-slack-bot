// https://api.slack.com/methods/users.list
export interface SlackUserProfile {
  title?: string;
  phone?: string;
  skype?: string;
  always_active?: boolean;
  first_name?: string;
  last_name?: string;
  real_name?: string;
  real_name_normalized?: string;
  display_name?: string;
  display_name_normalized?: string;
  status_text?: string;
  status_emoji?: string;
  status_expiration?: number;
  avatar_hash?: string;
  image_24?: string;
  image_32?: string;
  image_48?: string;
  image_72?: string;
  image_192?: string;
  image_512?: string;
  status_text_canonical?: string;
  team?: string;
}

// https://api.slack.com/types/user
export interface ISlackUser {
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
  "is_admin": true,
  "is_owner": false,
  "is_primary_owner": false,
  "is_restricted": false,
  "is_ultra_restricted": false,
  "is_bot": false,
  "is_stranger": false,
  "updated": 1502138686,
  "is_app_user": false,
  "has_2fa": false,
  "locale": "en-US"
}

// https://api.slack.com/methods/users.info
export interface SlackUserInfo {
  "ok": true,
  "user": {
    "id": "W012A3CDE",
    "team_id": "T012AB3C4",
    "name": "spengler",
    "deleted": false,
    "color": "9f69e7",
    "real_name": "Egon Spengler",
    "tz": "America/Los_Angeles",
    "tz_label": "Pacific Daylight Time",
    "tz_offset": -25200,
    "profile": SlackUserProfile,
    "is_admin": true,
    "is_owner": false,
    "is_primary_owner": false,
    "is_restricted": false,
    "is_ultra_restricted": false,
    "is_bot": false,
    "updated": 1502138686,
    "is_app_user": false,
    "has_2fa": false
  }
}
