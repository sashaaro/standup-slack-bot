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
import {WebClient} from "@slack/web-api";
import {Connection, DeepPartial} from "typeorm";

@Injectable()
export class SyncSlackService {
  constructor(
    @Inject(LOGGER_TOKEN) private logger: Logger,
    private webClient: WebClient,
    private connection: Connection,
  ) {
  }

  async updateWorkspace(workspace: SlackWorkspace): Promise<SlackWorkspace> {
    // https://api.slack.com/methods/team.info
    const teamInfo: {team: SlackTeam} = (await this.webClient.team.info({
      team: workspace.id,
      token: workspace.accessToken
    })) as any;
    workspace.slackData = teamInfo.team;

    return await this.connection.getRepository(SlackWorkspace).save(workspace)
  }

  async syncForWorkspace(workspace: SlackWorkspace) {
    await this.updateWorkspace(workspace);
    await this.updateUsers(workspace);
    await this.updateChannels(workspace);
  }

  private async updateUsers(workspace: SlackWorkspace) {
    const userRepository = this.connection.getRepository(User);

    /* https://api.slack.com/methods/users.list */
    let response;
    let cursor = null;
    do {
      cursor = response?.response_metadata?.next_cursor;
      response = await this.webClient.users.list({
        limit: 200,
        cursor,
        token: workspace.accessToken
      });
      if (!response.ok) {
        // throw..
        this.logger.error('Fetch users error', {error: response.error})
        return;
      }

      const members = (response.members as ISlackUser[]).filter(
          u =>
              !u.is_bot
              && !u.deleted
              && !u.is_app_user
              && u.id !== 'USLACKBOT' // https://stackoverflow.com/a/40681457
      )
      this.logger.debug('webClient.users.list', {users: members})

      const list = []
      for (const member of members) {
        if (member.team_id !== workspace.id) {
          throw new Error(`Workspace #${workspace.id} is not equal to member.team_id as ${member.team_id}`)
        }

        let user = await userRepository.findOne(member.id);
        if (!user) {
          user = new User();
          user.id = member.id
        }
        user.name = member.name;
        user.profile = member.profile;

        user.workspace = workspace; //await teamRepository.findOne(member.team_id);

        list.push(user);
      }
      await userRepository.save(list)

    } while (response.response_metadata.next_cursor);


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

    // TODO wtf?
    await this.connection.createQueryBuilder()
        .update(Channel)
        .where({workspace: workspace.id})
        .set({isArchived: true})
        .execute()

    const channelRepository = this.connection.getCustomRepository(ChannelRepository);

    let response;
    let cursor = null;
    do {
      cursor = response?.response_metadata?.next_cursor;

      response = await this.webClient.conversations.list({
        types: 'public_channel,private_channel',
        token: workspace.accessToken,
        limit: 200,
        cursor,
      });
      /*let response = await this.webClient.users.conversations({
        types: 'public_channel,private_channel',
      });*/
      if (!response.ok) {
        throw new Error(response.error);
      }

      const conversations = (response as any).channels as SlackConversation[];
      const channels = conversations.filter(ch =>
          ch.is_member
          && ch.name !== 'slack-bots'
          && ch.name !== 'random'
      )
      this.logger.debug('webClient.conversations.list', {channels})

      await this.connection.createQueryBuilder()
        .update(Channel)
        .where({workspace: workspace.id})
        .set({isArchived: true})
        .execute()

      const list = []
      for (const channel of channels) {
        const ch = this.connection.manager.create(Channel, {id: channel.id});
        ch.name = channel.name
        ch.nameNormalized = channel.name_normalized
        ch.isArchived = channel.is_archived;
        ch.isEnabled = true;
        ch.workspace = workspace;
        ch.createdBy = this.connection.manager.create(User, {id: channel.creator});

        list.push(ch);
      }
      await channelRepository.save(list);
    } while (response.response_metadata.next_cursor)
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
    /*await this.postMessage({
      channel: channel.id,
      text: 'Hi everyone, I am here! Every one here will be receive questions. Open settings if want change'
    })*/
  }
}