import {Expose, Transform, TransformFnParams, Type} from "class-transformer";
import {ArrayMinSize, IsArray, IsNotEmpty, Max, MaxLength, Min, MinLength, ValidateNested} from "class-validator";
import {
  Cascade,
  Collection,
  Entity,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryKey,
  Property,
  SerializedPrimaryKey
} from "@mikro-orm/core";
import Timezone from "./timezone";
import {User} from "./user";
import SlackWorkspace from "./slack-workspace";
import Question from "./question";
import {BitmaskType, IntArrayType, sortByIndex, transformCollection} from "../services/utils";
import {TeamRepository} from "../repository/team.repository";
import {Channel} from "./channel";

export const TEAM_STATUS_ACTIVATED = 1;
export const TEAM_STATUS_DEACTIVATED = 2;
export const TEAM_STATUS_ACHIEVED = 3;

export const teamStatuses = [TEAM_STATUS_ACTIVATED, TEAM_STATUS_DEACTIVATED, TEAM_STATUS_ACHIEVED]
export const weekDayBits = [1, 2, 4, 8, 16, 32, 64]; // start from monday
const scheduleBitmaskDefault = 1 | 2 | 4 | 8 | 16

const scheduleBitmaskType = new BitmaskType(weekDayBits.length);

@Entity({customRepository: () => TeamRepository})
export class Team {
  @Expose()
  @PrimaryKey()
  @SerializedPrimaryKey()
  id: number;

  @Expose()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(16)
  @Property()
  name: string;

  @Property({type: 'smallint'})
  status: number = TEAM_STATUS_ACTIVATED;

  @Expose()
  @ManyToOne(() => SlackWorkspace, {})
  workspace: SlackWorkspace;

  @Expose({groups: ['edit']})
  @Transform(transformCollection)
  // TODO @Type(() => User)
  // @Min(1)
  @IsNotEmpty()
  @ManyToMany(() => User, 'teams', {
    cascade: [Cascade.PERSIST],
    owner: true
  })
  users = new Collection<User, Team>(this)

  @Expose()
  @Property({default: 30, nullable: false})
  duration: number

  @Expose()
  @Property({default: '11:00', nullable: false})
  start: string

  @Max(2 ** weekDayBits.length - 1)
  @Min(1)
  @Expose()
  @Property({type: scheduleBitmaskType, defaultRaw: scheduleBitmaskType.convertToDatabaseValueSQL(scheduleBitmaskDefault.toString(10))})
  scheduleBitmask: number = scheduleBitmaskDefault;

  @Expose({groups: ["edit"]})
  @Transform((params) => transformCollection(params).filter(e => e.isEnabled).sort(sortByIndex), {
    toPlainOnly: true
  })
  @Type(() => Question)
  @IsNotEmpty()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested()
  @OneToMany(type => Question, question => question.team, {
    cascade: [Cascade.PERSIST],
  })
  questions = new Collection<Question, Team>(this)

  @Expose({groups: ["edit"]})
  @Type(_ => Timezone)
  @ManyToOne(() => Timezone, {})
  timezone: Timezone;

  @Expose()
  @Type(() => Channel)
  @IsNotEmpty()
  @ManyToOne(type => Channel, {
    nullable: false,
  })
  reportChannel: Channel

  @ManyToOne(() => User, {
    //eager: true,
    nullable: false,
  })
  createdBy: User;
}
