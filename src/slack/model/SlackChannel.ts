/**
 * https://api.slack.com/types/channel
 */
export interface SlackChannel {
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

export interface ChannelLeft {
  type: 'channel_left',
  channel: 'CK222FUKH',
  actor_id: 'UJZM51SN8',
  event_ts: '1587901539.000500'
}

export interface MemberJoinedChannel {
  type: 'member_joined_channel',
  user: 'UK2R50WDV',
  channel: 'CK222FUKH',
  channel_type: 'C',
  team: 'TK074QB08',
  inviter: 'UJZM51SN8',
  event_ts: '1587901379.000300'
}

/**
 * https://api.slack.com/types/conversation
 */
export interface SlackConversation {
  "id": "C012AB3CD",
  "name": string,
  "is_channel": true,
  "is_group": false,
  "is_im": false,
  "created": 1449252889,
  "creator": "W012A3BCD",
  "is_archived": false,
  "is_general": true,
  "unlinked": 0,
  "name_normalized": "general",
  "is_read_only": false,
  "is_shared": false,
  "is_ext_shared": false,
  "is_org_shared": false,
  "pending_shared": any[],
  "is_pending_ext_shared": false,
  "is_member": true,
  "is_private": false,
  "is_mpim": false,
  "last_read": "1502126650.228446",
  "topic": {
    "value": "For public discussion of generalities",
    "creator": "W012A3BCD",
    "last_set": 1449709364
  },
  "purpose": {
    "value": "This part of the workspace is for fun. Make fun here.",
    "creator": "W012A3BCD",
    "last_set": 1449709364
  },
  "previous_names": ["specifics", "abstractions", "etc"],
  "num_members": 23,
  "locale": "en-US"
}

export interface SlackGroup {
  "id": "G024BE91L",
  "name": "secretplans",
  "created": 1360782804,
  "creator": "U024BE7LH",
  "is_archived": false,
  "members": [
    "U024BE7LH"
  ],
  "topic": {
    "value": "Secret plans on hold",
    "creator": "U024BE7LV",
    "last_set": 1369677212
  },
  "purpose": {
    "value": "Discuss secret plans that no-one else should know",
    "creator": "U024BE7LH",
    "last_set": 1360782804
  }
}
