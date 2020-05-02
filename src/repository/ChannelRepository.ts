import {EntityRepository, Repository} from "typeorm";
import {Channel} from "../model/Channel";
import {QuestionRepository} from "./QuestionRepository";

@EntityRepository(Channel)
export class ChannelRepository extends Repository<Channel>
{
  async addNewChannel(channel: Channel): Promise<Channel> {
    channel = await this.save(channel);
    await this.manager.getCustomRepository(QuestionRepository).setupDefaultQuestionsToChannel(channel);

    return this.findOneOrFail(channel.id, {relations: [
      'questions', 'users'
    ]})
  }
}
