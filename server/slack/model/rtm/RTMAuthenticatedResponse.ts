
export interface SlackIm
{
    id: string,
    created: number,
    is_im: boolean,
    is_org_shared: boolean,
    user: string,
    is_user_deleted: boolean,
    priority: number
}

export interface RTMAuthenticatedResponse {
  ok: boolean
  url: string,
  self: { id: string, name: string }
  team: { id: string, name: string, domain: string }
  scopes: string[],
  acceptedScopes: string[]
}
