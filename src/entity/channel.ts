import {Entity, ManyToMany, ManyToOne, OneToMany, PrimaryKey, Property} from "@mikro-orm/core";
import {Expose} from "class-transformer";
import SlackWorkspace from "./slack-workspace";
import {User} from "./user";

@Entity()
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

  @ManyToOne(() => User, {
    eager: true
  })
  createdBy: User

  @ManyToOne(() => SlackWorkspace, {
    eager: true,
    nullable: false
  })
  workspace: SlackWorkspace
}
