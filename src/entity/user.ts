import {SlackUserProfile} from "../slack/model/SlackUser";
import {Team} from "./team";
import {Exclude, Expose} from "class-transformer";
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
  first_name: string;
  last_name: string;
  image_24: string;
  image_32: string;
  image_48: string;
  image_72: string;
  image_192: string;
  image_512: string;
  status_text_canonical: string;
  team: string;
}

@Entity()
export class User {
  @Expose()
  @PrimaryKey()
  id: string;

  @Expose()
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

  @Expose()
  @Property({type: 'jsonb'})
  profile: SlackUserProfile = new Profile();

  @ManyToMany(() => Team, null, {
    inversedBy: 'users'
  })
  teams = new Collection<Team>(this);

  @ManyToMany(() => TeamSnapshot, null, {
    inversedBy: 'users'
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
