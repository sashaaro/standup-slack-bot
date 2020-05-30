import {Entity, Column, ManyToOne, BeforeInsert, PrimaryGeneratedColumn} from "typeorm";
import Question from "./Question";
import StandUp from "./StandUp";
import User from "./User";
import {IAnswerRequest} from "../bot/models";
import QuestionOption from "./QuestionOption";

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

  @ManyToOne(type => QuestionOption)
  option: QuestionOption;

  @Column()
  createdAt: Date;

  @Column({nullable: true})
  answerCreatedAt: Date;

  @BeforeInsert()
  setupCreatedAt() {
    this.createdAt = new Date();
  }


  formatAnswerMessage() {
    // const slackDomain = this.standUp.team.workspace.domain;
    let formattedMsg = this.answerMessage


    /* do {
      const originMsg = formattedMsg
      formattedMsg = originMsg.replace(new RegExp('<'+linkExpr+'>'), '<a target="_blank" href="$1">$1</a>')
    } while (formattedMsg !== originMsg)*/
  }
}

export default AnswerRequest;
