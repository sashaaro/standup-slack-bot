import {Expose, Type} from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsMilitaryTime,
  IsNotEmpty,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested
} from "class-validator";
import {
  Collection,
  Entity,
  ManyToMany,
  ManyToOne,
  PrimaryKey,
  Property,
  SerializedPrimaryKey,
  OneToMany, ArrayType
} from "@mikro-orm/core";
import {TEAM_STATUS_ACTIVATED} from "../model/Team";
import Timezone from "./timezone";
import {User} from "./user";
import SlackWorkspace from "./slack-workspace";
import Question from "./question";
import {IntArrayType} from "../services/utils";

@Entity()
export class Team {
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

  @ManyToOne(() => SlackWorkspace, {})
  workspace: SlackWorkspace;

  @Expose()
  @Type(() => User)
  // @Min(1)
  @IsNotEmpty()
  @ManyToMany(() => User, u => u.teams)
  users = new Collection<User>(this)

  @Property({default: 30, nullable: false})
  duration: number

  @Property({default: '11:00', nullable: false})
  start: string

  @Property({type: IntArrayType, defaultRaw: "'{0,1,2,3,4}'"})
  days: number[] = [0, 1, 2, 3, 4];

  @Expose()
  @Type(() => Question)
  @IsNotEmpty()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested()
  @OneToMany(type => Question, question => question.team, {
    //cascade: true,
  })
  questions: Question[];

  @ManyToOne(() => Timezone, {})
  timezone: Timezone;

  @ManyToOne(() => User, {
    //eager: true,
    nullable: false,
  })
  createdBy: User;
}
