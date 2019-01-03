import {Entity, Column, PrimaryColumn, OneToMany} from "typeorm";
import User from "./User";
import parameters from './../parameters'
import {ITeam} from "../SlackStandupBotClientService";

export class TeamSettings
{
    timezone: string
    start: string
    end: string
    report_channel: string
}

@Entity()
class Team implements ITeam
{
    @PrimaryColumn()
    id: string;

    @Column('json')
    settings: TeamSettings;

    @OneToMany(type => User, user => user.team)
    users: User[]

    constructor()
    {
        this.settings = <TeamSettings>parameters.defaultSettings
    }
}

export default Team;
