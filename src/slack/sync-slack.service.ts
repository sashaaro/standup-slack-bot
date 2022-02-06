import {SlackTeam} from "./model/SlackTeam";
import {User} from "../entity";
import {ISlackUser} from "./model/SlackUser";
import {SlackIm} from "./model/ScopeGranted";
import {SlackChannel, SlackConversation} from "./model/SlackChannel";
import {Channel} from "../entity";
import {Inject, Injectable} from "injection-js";
import pino from "pino";
import {WebClient} from "@slack/web-api";
import SlackWorkspace from "../entity/slack-workspace";
import {em} from "../services/providers";
import {LOG_TOKEN} from "../services/token";
import {ChannelRepository} from "../repository/channel.repository";

@Injectable()
export class SyncSlackService {
  constructor(
    @Inject(LOG_TOKEN) private logger: pino.Logger,
    private webClient: WebClient,
  ) {
  }

  async updateWorkspace(workspace: SlackWorkspace): Promise<SlackWorkspace> {
    // https://api.slack.com/methods/team.info
    const teamInfo: {team: SlackTeam} = (await this.webClient.team.info({
      team: workspace.id,
      token: workspace.accessToken
    })) as any;
    workspace.slackData = teamInfo.team;

    await em().persistAndFlush(workspace)
    return workspace;
  }

  async syncForWorkspace(workspace: SlackWorkspace) {
    await this.updateWorkspace(workspace);
    await this.updateUsers(workspace);
    // TODO await this.updateIm(workspace);
    await this.updateChannels(workspace);
  }

  private async updateUsers(workspace: SlackWorkspace) {
    const userRepository = em().getRepository(User)

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
        this.logger.error(response, 'Fetch users error')
        return;
      }

      const members = (response.members as ISlackUser[]).filter(
          u =>
              !u.is_bot
              && !u.deleted
              && !u.is_app_user
              && u.id !== 'USLACKBOT' // https://stackoverflow.com/a/40681457
      )
      this.logger.debug({users: response.members}, 'webClient.users.list')

      const list = []

      let users = members.length > 0 ? await userRepository.find({id: {$in: members.map(m => m.id)}}) : [];

      for (const member of members) {
        if (member.team_id !== workspace.id) {
          throw new Error(`Workspace #${workspace.id} is not equal to member.team_id as ${member.team_id}`)
        }
        let user = users.find((u) => u.id === member.id)
        if (!user) {
          user = new User();
          user.id = member.id
        }
        user.name = member.name;
        user.profile = member.profile;

        user.workspace = workspace; //await teamRepository.findOne(member.team_id);

        list.push(user);
      }
      await userRepository.persist(list)
      await userRepository.flush()

    } while (response.response_metadata.next_cursor);
  }

  private async updateIm(workspace: SlackWorkspace) {
    const userRepository = em().getRepository(User)

    let conversationsResponse;
    let cursor = null;
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
          await userRepository.persist(user);
        }
      }
      await userRepository.flush();
    } while (conversationsResponse.response_metadata.next_cursor);
  }

  private async updateChannels(workspace: SlackWorkspace) {
    // TODO fix update private channel where bot invited already
    const userRepository = await em().getRepository(User)

    // uncomment and migrate to mikroorm
    // await this.connection.createQueryBuilder()
    //     .update(Channel)
    //     .where({workspace: workspace.id})
    //     .set({isArchived: true})
    //     .execute()

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
      this.logger.debug({channels}, 'webClient.conversations.list')

      // uncommend and migrate mikroorm
      // await this.connection.createQueryBuilder()
      //   .update(Channel)
      //   .where({workspace: workspace.id})
      //   .set({isArchived: true})
      //   .execute()



      await em().begin()
      for (const channel of channels) {
        const d = {
          name: channel.name,
          name_normalized: channel.name_normalized,
          is_archived: channel.is_archived,
          is_enabled: true,
          workspace_id: workspace.id,
          created_by_id: channel.creator
        }

        // TODO
        // console.log(em()
        //   .createQueryBuilder(Channel, 'ch')
        //   .insert({...d, id: channel.id})
        //   .onConflict('id')
        //   .merge(d)
        //   .getQuery())
        await em()
          .createQueryBuilder(Channel, 'ch')
          .insert({...d, id: channel.id})
          .onConflict('id').merge(d)
          //.onConflict('created_by_id').ignore()
          .execute()


//         await conn.execute(`INSERT INTO customers (id, name, email)
//        VALUES('Microsoft','hotline@microsoft.com') ON CONFLICT (channel_pkey)
// DO UPDATE SET
//     email = EXCLUDED.email, customers.email;`, [
//
//         ])
      }
      await em().commit()
      //await channelRepository.persistAndFlush(list);
    } while (response.response_metadata.next_cursor)
  }

  async findOrCreateAndUpdate(channelID: string, data: Partial<Channel>): Promise<{channel: Channel, isNew: boolean}> {
    const repo = em().getRepository(Channel) as ChannelRepository
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
    await repo.persistAndFlush(channel);

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

  async joinSlackChannel(channelID: string, updateData?: Partial<Channel>) {
    const repo = em().getRepository(Channel) as ChannelRepository

    const {channel} = await repo.findOrCreateChannel(channelID);

    channel.isArchived = false;
    channel.isEnabled = true;
    if (updateData) {
      Object.assign(channel, updateData);
    }

    await repo.persistAndFlush(channel);
    /*await this.postMessage({
      channel: channel.id,
      text: 'Hi everyone, I am here! Every one here will be receive questions. Open settings if want change'
    })*/
  }
}