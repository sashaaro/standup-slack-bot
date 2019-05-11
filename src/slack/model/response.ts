import {ISlackUser} from "./SlackUser";

export interface IUsersResponse {
  "ok": true,
  "members": ISlackUser[],
  "cache_ts": 1498777272,
  error?: string,
  "response_metadata": {
    "next_cursor": "dXNlcjpVMEc5V0ZYTlo="
  }
}