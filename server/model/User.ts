import {Entity, Column, ManyToOne, PrimaryColumn, ManyToMany, JoinTable} from "typeorm";
import Team from "./Team";
import {SlackUserProfile} from "../slack/model/SlackUser";
import {IUser} from "../StandUpBotService";
import {Channel} from "./Channel";

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
class User implements IUser {
  @PrimaryColumn()
  id: string;

  @Column({
    length: 500
  })
  name: string;

  @ManyToOne(type => Team, team => team.users, {
    eager: true
  })
  team: Team;

  @Column({
    length: 10
  })
  im: string;

  @Column('json', {default: new Profile()})
  profile: Profile;

  @ManyToMany(type => Channel, channel => channel.users, {
    eager: true
  })
  @JoinTable({name: "channel_users_user"})
  channels: Channel[];

  constructor() {
    this.profile = new Profile()
  }

  get teams() {
    return this.channels
  }
}


export default User;
