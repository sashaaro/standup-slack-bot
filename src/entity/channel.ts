import {Entity, ManyToMany, ManyToOne, OneToMany, PrimaryKey, Property} from "@mikro-orm/core";
import {Expose} from "class-transformer";
import SlackWorkspace from "./slack-workspace";
import {User} from "./user";
import {ChannelRepository} from "../repository/channel.repository";

@Entity({customRepository: () => ChannelRepository})
export class Channel {
  @Expose()
  @PrimaryKey()
  id: string

  @Property()
  name: string

  @Property()
  nameNormalized: string;

  @Property({default: false})
  isArchived: boolean;

  @Property({default: false})
  isEnabled: boolean;

  // TODO isPrivate: boolean;

  @ManyToOne(() => User)
  createdBy: User

  @ManyToOne(() => SlackWorkspace, {
    nullable: false
  })
  workspace: SlackWorkspace
}
