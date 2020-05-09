import {Column, Entity, OneToMany, PrimaryColumn} from "typeorm";
import User from "./User";
import {SlackTeam} from "../slack/model/SlackTeam";
import {Team} from "./Team";

@Entity()
class SlackWorkspace {
  @PrimaryColumn()
  id: string;

  @Column()
  name: string;

  @Column()
  domain: string;

  @OneToMany(type => User, user => user.workspace)
  users: User[]

  @OneToMany(type => Team, team => team.workspace, {
    eager: true
  })
  team: Team[]

  @Column("json", {nullable: true})
  slackData: SlackTeam

  //@Column("string", {nullable: true})
  //accessToken: string;
}

export default SlackWorkspace;
