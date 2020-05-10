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
  isEnabled: boolean;

  // TODO isPrivate: boolean;

  @ManyToOne(type => User, null, {
    eager: true
  })
  createdBy: User

  @ManyToOne(type => SlackWorkspace, null, {
    eager: true,
    nullable: false
  })
  workspace: SlackWorkspace

  @ManyToMany(type => User, user => user.channels, {
    cascade: ["insert", "update"]
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

  @Column({nullable: true})
  reportSlackChannel: string
}
