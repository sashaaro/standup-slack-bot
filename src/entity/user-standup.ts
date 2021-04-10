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
import {Exclude, Expose, Transform, Type} from "class-transformer";
import {transformCollection} from "../services/utils";

// todo user standup index
@Entity()
class UserStandup {
  @PrimaryKey()
  id: number

  @Expose({groups: ["view_standups"]})
  @Type(_ => User)
  @ManyToOne(() => User, {
    //eager: true
  })
  user: User;

  @Type(_ => Standup)
  @ManyToOne(() => Standup, {
    //eager: true
  })
  standup: Standup;

  @Expose({groups: ["view_standups"]})
  @Transform(transformCollection)
  @OneToMany(() => AnswerRequest, answer => answer.userStandup)
  answers = new Collection<AnswerRequest, UserStandup>(this);

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
