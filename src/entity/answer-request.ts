import {Collection, Entity, ManyToMany, ManyToOne, OneToMany, PrimaryKey, Property} from "@mikro-orm/core";
import QuestionSnapshot from "./question-snapshot";
import QuestionOptionSnapshot from "./question-option-snapshot";
import UserStandup from "./user-standup";

@Entity()
class AnswerRequest {
  @PrimaryKey()
  id: string

  @ManyToOne(type => UserStandup, {
    // eager: true,
    nullable: false,
    inversedBy: 'answers'
  })
  userStandup: UserStandup;

  @ManyToOne(type => QuestionSnapshot, {
    //eager: true,
    nullable: false
  })
  question: QuestionSnapshot

  @Property({nullable: true})
  answerMessage: string

  @ManyToOne(type => QuestionOptionSnapshot)
  option: QuestionOptionSnapshot; // TODO multiple

  @Property()
  createdAt: Date;

  @Property({nullable: true})
  answerCreatedAt: Date;

  //@BeforeInsert()
  setupCreatedAt() {
    this.createdAt = new Date();
  }
}

export default AnswerRequest;
