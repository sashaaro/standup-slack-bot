
import {
  BeforeCreate,
  Collection,
  Entity,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryKey,
  Property
} from "@mikro-orm/core";
import QuestionSnapshot from "./question-snapshot";
import QuestionOptionSnapshot from "./question-option-snapshot";
import UserStandup from "./user-standup";
import {Expose, Transform, Type} from "class-transformer";
import {transformCollection} from "../services/utils";

@Entity()
export default class AnswerRequest {
  @PrimaryKey()
  id: number

  @ManyToOne(type => UserStandup, {
    // eager: true,
    nullable: false,
    inversedBy: 'answers'
  })
  userStandup: UserStandup;

  @Expose({groups: ["view_standups"]})
  @Type(_ => QuestionSnapshot)
  @ManyToOne(type => QuestionSnapshot, {
    //eager: true,
    nullable: false
  })
  question: QuestionSnapshot

  @Expose({groups: ["view_standups"]})
  @Property({nullable: true})
  answerMessage: string

  @Expose({groups: ["view_standups"]})
  @Type(_ => QuestionOptionSnapshot)
  @ManyToOne(type => QuestionOptionSnapshot, {nullable: true})
  option: QuestionOptionSnapshot; // TODO multiple

  @Property()
  createdAt: Date;

  @Property({nullable: true})
  answerCreatedAt: Date;

  @BeforeCreate()
  setupCreatedAt() {
    this.createdAt = new Date();
  }
}