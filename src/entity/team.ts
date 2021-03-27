import {Expose, Transform, Type, TransformFnParams} from "class-transformer";
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
import {TeamRepository} from "../repository/team.repository";
import {em} from "../services/providers";
import {Channel} from "./channel";

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

  @Expose()
  @Transform((params: TransformFnParams) => {
    return params.value.map(v => em().getReference(User, v.id))
  }, {
    toClassOnly: true
  })
  @Transform((params: TransformFnParams) => params.value.toArray(), {
    toPlainOnly: true
  })
  @Type(() => User)
  // @Min(1)
  @IsNotEmpty()
  @ManyToMany(() => User, u => u.teams, {})
  users = new Collection<User, Team>(this)

  @Expose()
  @Property({default: 30, nullable: false})
  duration: number

  @Expose()
  @Property({default: '11:00', nullable: false})
  start: string

  @Expose()
  @Property({type: IntArrayType, defaultRaw: "'{0,1,2,3,4}'"})
  days: number[] = [0, 1, 2, 3, 4];

  @Expose()
  @Transform((params: TransformFnParams) => {
    return params.value.map(v => em().getReference(Question, v.id))
  }, {
    toClassOnly: true
  })
  @Transform((params: TransformFnParams) => params.value.toArray(), {
    toPlainOnly: true
  })
  @Type(() => Question)
  @IsNotEmpty()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested()
  @OneToMany(type => Question, question => question.team, {
    //cascade: true,
  })
  questions = new Collection<Question, Team>(this)

  @Expose()
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
