import {Column, Entity, OneToMany, PrimaryColumn} from "typeorm";
import User from "./User";
import {SlackTeam} from "../slack/model/SlackTeam";
import {Team} from "./Team";
import {Channel} from "./Channel";
import {Expose} from "class-transformer";

@Entity()
class SlackWorkspace {
  @Expose()
  @PrimaryColumn()
  id: string;

  @Column()
  name: string;

  @Column()
  domain: string;

  @OneToMany(type => User, user => user.workspace)
  users: User[]

  @OneToMany(type => Team, team => team.workspace)
  team: Team[]

  @OneToMany(type => Channel, ch => ch.workspace)
  channels: Channel[]

  @Column("json", {nullable: true})
  slackData: SlackTeam

  //@Column("string", {nullable: true})
  //accessToken: string;
}

export default SlackWorkspace;
