import {Entity, Column, ManyToOne, PrimaryColumn, ManyToMany, JoinTable, OneToMany} from "typeorm";
import SlackWorkspace from "./SlackWorkspace";
import {SlackUserProfile} from "../slack/model/SlackUser";
import {Channel} from "./Channel";
import {Team} from "./Team";
import AnswerRequest from "./AnswerRequest";
import {Exclude, Expose} from "class-transformer";

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
export default class User {
  @Expose()
  @PrimaryColumn()
  id: string;

  @Column({
    length: 500
  })
  name: string;

  @ManyToOne(type => SlackWorkspace, team => team.users, {nullable: false})
  workspace: SlackWorkspace;

  @Column({
    length: 10,
    nullable: true,
  })
  im: string;

  // https://api.slack.com/authentication/token-types#user
  @Exclude()
  @Column({nullable: true})
  accessToken: string;

  @Column('json', {default: new Profile()})
  profile: SlackUserProfile = new Profile();

  @ManyToMany(type => Team, team => team.users)
  @JoinTable()
  teams: Team[];

  @ManyToMany(type => Channel, channel => channel.users)
  @JoinTable()
  channels: Channel[];

  @OneToMany(type => AnswerRequest, answer => answer.user)
  answers: AnswerRequest[];
}
