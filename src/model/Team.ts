import {Column, Entity, ManyToMany, ManyToOne, OneToMany, PrimaryGeneratedColumn} from "typeorm";
import User from "./User";
import SlackWorkspace from "./SlackWorkspace";
import Question from "./Question";
import {ITeam} from "../bot/models";
import Timezone from "./Timezone";

@Entity()
export class Team implements ITeam {
  @PrimaryGeneratedColumn()
  id: string

  @Column()
  name: string

  @Column({default: false})
  isEnabled: boolean = true;

  // TODO isPrivate: boolean;

  @ManyToOne(type => User, null, {
    eager: true,
    nullable: false
  })
  createdBy: User

  @ManyToOne(type => SlackWorkspace, null, {
    eager: true,
    nullable: false
  })
  workspace: SlackWorkspace

  @ManyToMany(type => User, user => user.teams, {
    cascade: ["insert", "update"],
  })
  users: Array<User>

  @OneToMany(type => Question, question => question.team, {
    eager: true,
    cascade: true
  })
  questions: Question[];

  @ManyToOne(type => Timezone, null, {
    eager: true
  })
  timezone: Timezone;

  @Column({default: '11:00'})
  start: string
  @Column({default: 30})
  duration: number

  @Column({nullable: false})
  reportSlackChannel: string

  untilTime()
  {
    const time = new Date(new Date('2020.01.01 ' + this.start).getTime() + this.duration * 60 * 1000);
    return time.getHours().toString().padStart(2, '0') + ':' + time.getMinutes().toString().padStart(2, '0')
  }
}
