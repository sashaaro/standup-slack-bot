import {EntityRepository, Repository} from "typeorm";
import {Channel} from "../model/Channel";
import {QuestionRepository} from "./QuestionRepository";

@EntityRepository(Channel)
export class ChannelRepository extends Repository<Channel>
{

}
