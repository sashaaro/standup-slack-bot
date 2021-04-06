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
import Standup from "./standup";
import {User} from "./user";
import {MessageResult} from "../slack/model/MessageResult";
import AnswerRequest from "./answer-request";
import {Exclude} from "class-transformer";

// todo user standup index
@Entity()
class UserStandup {
  @PrimaryKey()
  id: number

  @ManyToOne(() => User, {
    //eager: true
  })
  user: User;

  @Exclude()
  @ManyToOne(() => Standup, {
    //eager: true
  })
  standup: Standup;

  @OneToMany(() => AnswerRequest, answer => answer.userStandup)
  answers: AnswerRequest[];

  @Property()
  createdAt: Date;

  // TODO rename? slackDialogMessage
  @Exclude()
  @Property({type: "jsonb"})
  slackMessage: MessageResult

  @BeforeCreate()
  setupCreatedAt() {
    this.createdAt = new Date();
  }
}

export default UserStandup;
