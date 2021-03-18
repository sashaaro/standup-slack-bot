import SlackWorkspace from "../model/SlackWorkspace";
import {SlackTeam} from "./model/SlackTeam";
import User from "../model/User";
import {ISlackUser} from "./model/SlackUser";
import {SlackIm} from "./model/ScopeGranted";
import {SlackChannel, SlackConversation} from "./model/SlackChannel";
import {ChannelRepository} from "../repository/ChannelRepository";
import {Channel} from "../model/Channel";
import {Inject, Injectable} from "injection-js";
import {LOGGER_TOKEN} from "../services/token";
import {Logger} from "winston";
import {WebAPIPlatformError, WebClient} from "@slack/web-api";
import {Connection, DeepPartial} from "typeorm";

@Injectable()
export class SyncSlackService {
  constructor(
    @Inject(LOGGER_TOKEN) private logger: Logger,
    private webClient: WebClient,
    private connection: Connection,
  ) {
  }

  async syncForWorkspace(workspace: SlackWorkspace) {
    const teamResponse: {team: SlackTeam} = await this.webClient.team.info({
      team: workspace.id,
      token: workspace.accessToken
    }) as any;

    if (workspace.id !== teamResponse.team.id) {
      throw new Error(`Wrong team id #${teamResponse.team.id}. Workspace #${workspace.id}`);
    }

    workspace.slackData = teamResponse.team;
    const teamRepository = this.connection.getRepository(SlackWorkspace);
    workspace = await teamRepository.save(workspace);

    this.updateUsers(workspace);
    this.updateChannels(workspace);
  }

  private async updateUsers(workspace: SlackWorkspace) {
    const userRepository = this.connection.getRepository(User);

    /* https://api.slack.com/methods/users.list */
    let usersResponse;
    let cursor = null;
    do {
      cursor = usersResponse?.response_metadata?.next_cursor;
      usersResponse = await this.webClient.users.list({
        limit: 200,
        cursor,
        token: workspace.accessToken
      });
      if (!usersResponse.ok) {
        // throw..
        this.logger.error('Fetch users error', {error: usersResponse.error})
        return;
      }


      for (const member of (usersResponse.members as ISlackUser[]).filter(u => !u.is_bot && !u.deleted && !u.is_app_user)) {
        let user = await userRepository.findOne(member.id);
        if (!user) {
          user = new User();
          user.id = member.id
        }
        user.name = member.name;
        user.profile = member.profile;

        if (member.team_id !== workspace.id) {
          throw new Error(`Workspace #${workspace.id} is not equal to member.team_id as ${member.team_id}`)
        }

        user.workspace = workspace; //await teamRepository.findOne(member.team_id);

        await userRepository.save(user)
      }

    } while (usersResponse.response_metadata.next_cursor);


    let conversationsResponse;
    cursor = null;
    do {
      cursor = conversationsResponse?.response_metadata?.next_cursor;
      conversationsResponse = await this.webClient.conversations.list({
        types: 'im',
        limit: 200,
        cursor,
        token: workspace.accessToken
      });
      if (!conversationsResponse.ok) {
        throw new Error(conversationsResponse.error);
      }
      const conversations = conversationsResponse['channels'] as SlackIm[];
      // TODO sql batch update
      for (const conversation of conversations.filter(c => c.is_im)) {
        const user = await userRepository.findOne(conversation.user);
        if (user) {
          user.im = conversation.id;
          await userRepository.save(user);
        }
      }
    } while (conversationsResponse.response_metadata.next_cursor);
  }

  private async updateChannels(workspace: SlackWorkspace) {
    // TODO fix update private channel where bot invited already
    const userRepository = this.connection.getRepository(User);
    const response = await this.webClient.conversations.list({
      types: 'public_channel,private_channel',
      token: workspace.accessToken
      // TODO limit? pagination
    });
    /*let response = await this.webClient.users.conversations({
      types: 'public_channel,private_channel',
    });*/
    if (!response.ok) {
      throw new Error(response.error);
    }

    const conversations = (response as any).channels as SlackConversation[];
    const channelRepository = this.connection.getCustomRepository(ChannelRepository);
    await this.connection.createQueryBuilder()
      .update(Channel)
      .where({workspace: workspace.id})
      .set({isArchived: true})
      .execute()

    for (const channel of conversations.filter(ch => !ch.is_member)) {
      let ch = await channelRepository.findOne(channel.id);
      if (!ch) {
        ch = new Channel()
        ch.id = channel.id;
      }

      ch.isEnabled = true;
      ch.isArchived = channel.is_archived;
      ch.createdBy = await userRepository.findOne(channel.creator);
      if (!ch.createdBy) {
        this.logger.error(`Created by is not found`);

        continue;
      }
      ch.workspace = workspace
      if (!ch.workspace) {
        this.logger.error(`Created by is not found`);
        continue;
      }

      ch.name = channel.name
      ch.nameNormalized = channel.name_normalized
      await channelRepository.save(ch);
      await this.updateChannelMembers(ch, workspace.accessToken);
      await channelRepository.save(ch);
    }
  }

  async updateWorkspace(workspace: SlackWorkspace, token): Promise<SlackWorkspace> {
    // https://api.slack.com/methods/team.info
    const teamInfo: {team: SlackTeam} = (await this.webClient.team.info({
      team: workspace.id,
      token
    })) as any;
    workspace.name = teamInfo.team.name;``
    workspace.domain = teamInfo.team.domain

    return await this.connection.getRepository(SlackWorkspace).save(workspace)
  }

  async updateChannelMembers(channel: Channel, token) {
    const userRepository = this.connection.getRepository(User);
    let membersResponse: { ok: boolean, members?: string[], error?: string };
    try {
      membersResponse = await this.webClient.conversations.members({
        channel: channel.id,
        token
      });
    } catch (e: WebAPIPlatformError|any) {
      if (e.code === 'slack_webapi_platform_error' && e.data.error === 'not_in_channel') {
        this.logger.warn('Can not joined channel', {error: e})
        // TODO ?! throw new SyncDataProblem
      } else {
        throw e
      }
    }

    if (!membersResponse.ok) {
      throw new Error(membersResponse.error);
    }

    channel.users = []
    if (membersResponse.members.length > 0) {
      channel.users = await userRepository.createQueryBuilder('u').whereInIds(membersResponse.members).getMany() // TODO
    }
  }

  async findOrCreateAndUpdate(channelID: string, data: DeepPartial<Channel>): Promise<{channel: Channel, isNew: boolean}> {
    const repo = this.connection.getCustomRepository(ChannelRepository);
    const {channel, isNew} = await repo.findOrCreateChannel(channelID);
    Object.assign(channel, data);
    if (isNew) {
      const channelInfo = (await this.webClient.conversations.info({
        channel: channel.id,
        token: channel.workspace.accessToken
      })).channel as SlackConversation

      channel.name = channelInfo.name;
      channel.nameNormalized = channelInfo.name_normalized;
    }
    await repo.save(channel);

    return {channel, isNew}
  };

  async channelJoined({channel}: { channel: SlackChannel }) {

    // TODO use channel.members
    await this.joinSlackChannel(channel.id, {
      isArchived: channel.is_archived,
      name: channel.name,
      nameNormalized: channel.name_normalized
    })
  }

  async joinSlackChannel(channelID: string, updateData?: DeepPartial<Channel>) {
    const repo = this.connection.getCustomRepository(ChannelRepository);

    const {channel} = await repo.findOrCreateChannel(channelID);

    channel.isArchived = false;
    channel.isEnabled = true;
    if (updateData) {
      Object.assign(channel, updateData);
    }

    const channelRepository = this.connection.getCustomRepository(ChannelRepository);
    await channelRepository.save(channel);
    await this.updateChannelMembers(channel, 'TODO')
    /*await this.postMessage({
      channel: channel.id,
      text: 'Hi everyone, I am here! Every one here will be receive questions. Open settings if want change'
    })*/
  }
}