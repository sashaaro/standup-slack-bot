import {Entity, Column, ManyToOne, BeforeInsert, PrimaryGeneratedColumn} from "typeorm";
import Question from "./Question";
import StandUp from "./StandUp";
import User from "./User";
import {IAnswerRequest} from "../bot/models";

@Entity()
class AnswerRequest implements IAnswerRequest {
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

  @ManyToOne(type => Question)
  question: Question

  @Column({nullable: true})
  answerMessage: string

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
