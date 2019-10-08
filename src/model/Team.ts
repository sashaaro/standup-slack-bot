import {Column, Entity, OneToMany, PrimaryColumn} from "typeorm";
import User from "./User";
import {Channel} from "./Channel";
import {SlackTeam} from "../slack/model/SlackTeam";

@Entity()
class Team {
  @PrimaryColumn()
  id: string;

  @Column()
  name: string;

  @Column()
  domain: string;

  @OneToMany(type => User, user => user.team)
  users: User[]

  @OneToMany(type => Channel, channel => channel.team, {
    eager: true
  })
  channels: Channel[]

  @Column("simple-json", {nullable: true})
  slackData: SlackTeam

  //@Column("string", {nullable: true})
  //accessToken: string;

  get enableChannels() {
    return this.channels.filter((ch) => ch.isEnabled && !ch.isArchived && ch.nameNormalized !== 'general')
  }
}

export default Team;
