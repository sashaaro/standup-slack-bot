import {Entity, Column, ManyToOne, BeforeInsert, PrimaryGeneratedColumn} from "typeorm";
import QuestionSnapshot from "./QuestionSnapshot";
import QuestionOptionSnapshot from "./QuestionOptionSnapshot";
import UserStandup from "./UserStandup";

@Entity()
class AnswerRequest {
  @PrimaryGeneratedColumn()
  id: string

  @ManyToOne(type => UserStandup, us => us.answers, {
    eager: true
  })
  userStandup: UserStandup;

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
