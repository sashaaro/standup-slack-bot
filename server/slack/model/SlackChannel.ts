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
