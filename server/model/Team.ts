import {Entity, Column, PrimaryColumn, OneToMany, ManyToOne} from "typeorm";
import User from "./User";
import parameters from './../parameters'
import {ITeam, ITeamSettings} from "../StandUpBotService";
import {Channel} from "./Channel";

export class TeamSettings implements ITeamSettings {
  timezone: string
  start: string
  end: string
  report_channel: string
}

@Entity()
class Team implements ITeam {
  @PrimaryColumn()
  id: string;

  @Column('json')
  settings: TeamSettings;

  @OneToMany(type => User, user => user.team)
  users: User[]

  @OneToMany(type => Channel, channel => channel.team, {
    eager: true
  })
  channel: Channel[]

  constructor() {
    this.settings = <TeamSettings>parameters.defaultSettings
  }
}

export default Team;
