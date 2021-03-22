import {Entity, Column, ManyToOne, BeforeInsert, PrimaryGeneratedColumn, OneToMany} from "typeorm";
import StandUp from "./StandUp";
import User from "./User";
import {MessageResult} from "../slack/model/MessageResult";
import AnswerRequest from "./AnswerRequest";
import {Exclude} from "class-transformer";

@Entity()
class UserStandup {
  @PrimaryGeneratedColumn()
  id: string

  @ManyToOne(type => User, null, {
    eager: true
  })
  user: User;

  @Exclude()
  @ManyToOne(type => StandUp, standup => standup.users, {
    eager: true
  })
  standUp: StandUp;

  @OneToMany(type => AnswerRequest, answer => answer.userStandup)
  answers: AnswerRequest[];

  @Column()
  createdAt: Date;

  // TODO rename? slackDialogMessage
  @Exclude()
  @Column("jsonb")
  slackMessage: MessageResult

  @BeforeInsert()
  setupCreatedAt() {
    this.createdAt = new Date();
  }
}

export default UserStandup;
