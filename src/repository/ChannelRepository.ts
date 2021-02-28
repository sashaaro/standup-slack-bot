import {EntityRepository, Repository} from "typeorm";
import {Channel} from "../model/Channel";

@EntityRepository(Channel)
export class ChannelRepository extends Repository<Channel>
{
  public async findOrCreateChannel(channelID: string): Promise<{channel: Channel, isNew: boolean}>{
    let channel = await this.findOne(channelID);
    const isNew = !channel;
    if (isNew) {
      channel = new Channel();
      channel.id = channelID;
      channel.isEnabled = false
    }

    return {channel, isNew};
  };
}
