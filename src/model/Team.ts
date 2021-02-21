import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  Entity,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn
} from "typeorm";
import User from "./User";
import SlackWorkspace from "./SlackWorkspace";
import Question from "./Question";
import {ITeam} from "../bot/models";
import Timezone from "./Timezone";
import {Channel} from "./Channel";
import {Expose, Type} from "class-transformer";
import {IsInt, IsMilitaryTime, IsNotEmpty, Max, MaxLength, Min, MinLength, ValidateNested} from "class-validator";

@Entity()
export class Team implements ITeam {
  @PrimaryGeneratedColumn()
  id: number;

  @Expose()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(40)
  @Column()
  name: string;

  @Column({default: true})
  isEnabled: boolean;

  @ManyToOne(type => User, null, {
    eager: true,
    nullable: false
  })
  createdBy: User;

  @ManyToOne(type => SlackWorkspace, null, {
    eager: true,
    nullable: false
  })
  workspace: SlackWorkspace;

  @Expose()
  @Type(() => User)
  // @Min(1)
  @IsNotEmpty()
  @ManyToMany(type => User, user => user.teams, {
    cascade: ["insert", "update"],
  })
  users: Array<User>

  @Expose()
  @Type(() => Question)
  @IsNotEmpty()
  @ValidateNested()
  @OneToMany(type => Question, question => question.team, {
    eager: true,
    cascade: true
  })
  questions: Question[];

  @ManyToOne(type => Timezone, null, {
    eager: true
  })
  timezone: Timezone;

  @Expose()
  @IsNotEmpty()
  @IsMilitaryTime({message: 'must be a valid in the format HH:MM'})
  @Column({default: '11:00'})
  start: string

  @IsNotEmpty()
  @IsInt()
  @Min(2)
  @Max(59, {message: 'must not be greater than 59'})
  @Column({default: 30})
  duration: number

  @ManyToOne(type => Channel, null, {
    eager: true,
    nullable: false
  })
  @IsNotEmpty()
  @Type(() => SlackWorkspace)
  reportChannel: string

  untilTime()
  {
    const time = new Date(new Date('2020.01.01 ' + this.start).getTime() + this.duration * 60 * 1000);
    return time.getHours().toString().padStart(2, '0') + ':' + time.getMinutes().toString().padStart(2, '0')
  }
}
