import {Column, Entity, OneToMany, PrimaryColumn} from "typeorm";
import User from "./User";
import {Channel} from "./Channel";

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

  get enableChannels() {
    return this.channels.filter((ch) => ch.isEnabled && !ch.isArchived)
  }
}

export default Team;
