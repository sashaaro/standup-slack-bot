import {Entity, Column, ManyToOne, PrimaryColumn, ManyToMany, JoinTable, OneToMany} from "typeorm";
import SlackWorkspace from "./SlackWorkspace";
import {SlackUserProfile} from "../slack/model/SlackUser";
import {Channel} from "./Channel";
import {IUser} from "../bot/models";
import {Team} from "./Team";
import AnswerRequest from "./AnswerRequest";

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
export default class User implements IUser {
  @PrimaryColumn()
  id: string;

  @Column({
    length: 500
  })
  name: string;

  @ManyToOne(type => SlackWorkspace, team => team.users, {
    eager: true,
    nullable: false
  })
  workspace: SlackWorkspace;

  @Column({
    length: 10,
    nullable: true,
  })
  im: string;

  @Column('json', {default: new Profile()})
  profile: SlackUserProfile = new Profile();

  @ManyToMany(type => Team, channel => channel.users, {
    eager: true,
  })
  @JoinTable()
  teams: Team[];

  @ManyToMany(type => Channel, channel => channel.users, {
    eager: true,
  })
  @JoinTable()
  channels: Channel[];

  @OneToMany(type => AnswerRequest, answer => answer.user)
  answers: AnswerRequest[];
}
