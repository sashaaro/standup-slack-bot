import {SlackUserProfile} from "../slack/model/SlackUser";
import {Team} from "./team";
import {Exclude, Expose, Transform, Type} from "class-transformer";
import {
  BaseEntity,
  Collection,
  Entity,
  ManyToMany,
  ManyToOne,
  PrimaryKey,
  Property,
  SerializedPrimaryKey
} from "@mikro-orm/core";
import SlackWorkspace from "./slack-workspace";
import {TeamSnapshot} from "./team-snapshot";


class Profile implements SlackUserProfile {
  title: string;
  phone: string;
  skype: string;
  real_name: string;
  real_name_normalized: string;
  display_name: string;
  display_name_normalized: string;
  status_text: string;
  status_emoji: string;
  status_expiration: number;
  avatar_hash: string;
  always_active: boolean;
  @Expose({groups: ['edit', 'view_standups']})
  first_name: string;
  @Expose({groups: ['edit', 'view_standups']})
  last_name: string;
  @Expose({groups: ['edit', 'view_standups']})
  image_24: string;
  @Expose({groups: ['edit', 'view_standups']})
  image_32: string;
  @Expose({groups: ['edit', 'view_standups']})
  image_48: string;
  @Expose({groups: ['edit', 'view_standups']})
  image_72: string;
  @Expose({groups: ['edit', 'view_standups']})
  image_192: string;
  @Expose({groups: ['edit', 'view_standups']})
  image_512: string;
  status_text_canonical: string;
  team: string;
}

@Entity()
export class User {
  @Expose({groups: ['view_standups', 'edit']})
  @PrimaryKey()
  id: string;

  @Expose({groups: ['view_standups', 'edit']})
  @Property({
    length: 500
  })
  name: string;

  @ManyToOne(() => SlackWorkspace, {nullable: false})
  workspace: SlackWorkspace;

  @Property({
    length: 20,
    nullable: true,
  })
  im: string; // TODO check.

  // https://api.slack.com/authentication/token-types#user
  @Exclude()
  @Property({nullable: true})
  accessToken: string;

  @Expose({groups: ['edit', 'view_standups']})
  // @Transform(params => params.value)
  @Type(_ => Profile)
  @Property({type: 'jsonb'})
  profile: SlackUserProfile = new Profile();

  @ManyToMany(() => Team, null, {
    mappedBy: 'users'
  })
  teams = new Collection<Team>(this);

  @ManyToMany(() => TeamSnapshot, null, {
    mappedBy: 'users'
  })
  teamSnapshots = new Collection<Team>(this);

  // TODO @Column()
  createdAt: Date;

  // TODO @Column()
  updatedAt: Date;

  onBeforeInsert() {
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  onBeforeUpdate() {
    this.updatedAt = new Date();
  }
}
