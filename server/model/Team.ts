import {Entity, OneToMany, PrimaryColumn} from "typeorm";
import User from "./User";
import {Channel} from "./Channel";

@Entity()
class Team {
  @PrimaryColumn()
  id: string;

  @OneToMany(type => User, user => user.team)
  users: User[]

  @OneToMany(type => Channel, channel => channel.team, {
    eager: true
  })
  channels: Channel[]
}

export default Team;
