import {Column, Entity, JoinTable, ManyToMany, ManyToOne, OneToMany, PrimaryColumn} from "typeorm";
import User from "./User";
import Team from "./Team";
import Question from "./Question";
import {ITeam} from "../bot/models";
import Timezone from "./Timezone";

@Entity()
export class Channel implements ITeam {
  @PrimaryColumn()
  id: string

  @Column()
  name: string

  @Column({default: false})
  isArchived: boolean;

  @Column({default: false})
  isEnabled: boolean;

  // TODO isPrivate: boolean;

  @Column()
  nameNormalized: string;

  @ManyToOne(type => User, null, {
    eager: true
  })
  createdBy: User

  @ManyToOne(type => Team, null, {
    eager: true,
    nullable: false
  })
  team: Team

  @ManyToMany(type => User, user => user.channels, {
    cascade: ["insert", "update"]
  })
  users: Array<User>

  @OneToMany(type => Question, question => question.channel, {
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
}
