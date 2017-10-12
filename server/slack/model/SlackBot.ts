export interface SlackBotIcons
{
    image_36: string,
    image_48: string,
    image_72: string
}

export interface SlackBot
{
    id: string,
    deleted: boolean,
    name: string,
    updated: number,
    app_id: string,
    icons: SlackBotIcons
}