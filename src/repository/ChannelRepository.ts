import {EntityRepository, Repository} from "typeorm";
import {Channel} from "../model/Channel";
import QuestionRepository from "./QuestionRepository";

@EntityRepository(Channel)
class ChannelRepository extends Repository<Channel>
{
  async addNewChannel(channel: Channel): Promise<Channel> {
    await super.save(channel);
    return await this.manager.getCustomRepository(QuestionRepository).setupDefaultQuestionsToChannel(channel);
  }
}

export default ChannelRepository;