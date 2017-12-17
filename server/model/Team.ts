import {Entity, Column, PrimaryColumn, OneToMany} from "typeorm";
import User from "./User";
import parameters from './../parameters'

export class TeamSettings
{
    timezone: string
    start: string
    end: string
    report_channel: string
}

@Entity()
class Team
{
    @PrimaryColumn()
    id: string;

    @Column('json')
    settings: TeamSettings;

    @OneToMany(type => User, user => user.team, {
        cascadeInsert: true
    })
    users: User[]

    constructor()
    {
        this.settings = <TeamSettings>parameters.defaultSettings
    }
}

export default Team;