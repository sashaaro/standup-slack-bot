import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  Entity, JoinTable,
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
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsMilitaryTime,
  IsNotEmpty, Length,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested
} from "class-validator";
import {JoinColumn} from "typeorm/browser";

export const TEAM_STATUS_ACTIVATED = 1;
export const TEAM_STATUS_DEACTIVATED = 2;
export const TEAM_STATUS_ACHIEVED = 3;

export const teamStatuses = [TEAM_STATUS_ACTIVATED, TEAM_STATUS_DEACTIVATED, TEAM_STATUS_ACHIEVED]

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

  @Column({default: TEAM_STATUS_ACTIVATED, asExpression: 'smallint'})
  status: number = TEAM_STATUS_ACTIVATED;

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
    //cascade: ["insert", "update"],
  })
  // @JoinTable({
  //   name: 'user_teams_team',
  //   joinColumn: {name: 'teamId'},
  //   inverseJoinColumn: 'userId',
  // })
  users: Array<User>

  @Expose()
  @Type(() => Question)
  @IsNotEmpty()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested()
  @OneToMany(type => Question, question => question.team, {
    cascade: true
  })
  questions: Question[];

  @Expose()
  @Type(() => Timezone)
  @ManyToOne(type => Timezone, null, {
    eager: true,
    nullable: false
  })
  timezone: Timezone;

  @Expose()
  @IsNotEmpty()
  @IsMilitaryTime({message: 'must be a valid in the format HH:MM'})
  @Column({default: '11:00'})
  start: string

  @Expose()
  @IsNotEmpty()
  @IsInt()
  @Min(2)
  @Max(59, {message: 'must not be greater than 59'})
  @Column({default: 30})
  duration: number

  @Expose()
  @Type(() => SlackWorkspace)
  @IsNotEmpty()
  @ManyToOne(type => Channel, null, {
    eager: true,
    nullable: false
  })
  reportChannel: string

  untilTime()
  {
    const time = new Date(new Date('2020.01.01 ' + this.start).getTime() + this.duration * 60 * 1000);
    return time.getHours().toString().padStart(2, '0') + ':' + time.getMinutes().toString().padStart(2, '0')
  }
}
