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

  // TODO nullable: false?!
  @Column()
  domain: string;

  @OneToMany(type => User, user => user.workspace)
  users: User[]

  @OneToMany(type => Team, team => team.workspace)
  team: Team[]

  @OneToMany(type => Channel, ch => ch.workspace)
  channels: Channel[]

  @Column("jsonb", {nullable: false})
  slackData: SlackTeam

  // https://api.slack.com/authentication/token-types#granular_bot
  @Column({nullable: false})
  accessToken: string;
}

export default SlackWorkspace;
