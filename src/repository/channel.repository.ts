import {EntityRepository} from "@mikro-orm/postgresql";
import {Channel} from "../entity";

export class ChannelRepository extends EntityRepository<Channel>
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
