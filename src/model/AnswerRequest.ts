import {Entity, Column, ManyToOne, BeforeInsert, PrimaryGeneratedColumn} from "typeorm";
import Question from "./Question";
import StandUp from "./StandUp";
import User from "./User";
import QuestionOption from "./QuestionOption";
import QuestionSnapshot from "./QuestionSnapshot";
import QuestionOptionSnapshot from "./QuestionOptionSnapshot";

@Entity()
class AnswerRequest {
  @PrimaryGeneratedColumn()
  id: string

  @ManyToOne(type => User, null, {
    eager: true
  })
  user: User;

  @ManyToOne(type => StandUp, null, {
    eager: true
  })
  standUp: StandUp;

  @ManyToOne(type => QuestionSnapshot, {
    //eager: true,
    nullable: false
  })
  question: QuestionSnapshot

  @Column({nullable: true})
  answerMessage: string

  @ManyToOne(type => QuestionOptionSnapshot)
  option: QuestionOptionSnapshot; // TODO multiple

  @Column()
  createdAt: Date;

  @Column({nullable: true})
  answerCreatedAt: Date;

  @BeforeInsert()
  setupCreatedAt() {
    this.createdAt = new Date();
  }
}

export default AnswerRequest;
