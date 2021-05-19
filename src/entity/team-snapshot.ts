import {User} from "./user";
import {Expose, Transform, Type} from "class-transformer";
import {Team} from "./team";
import QuestionSnapshot from "./question-snapshot";
import {sortByIndex, transformCollection} from "../services/utils";
import {
  AfterCreate,
  BeforeCreate,
  Cascade,
  Collection,
  Entity,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryKey,
  Property
} from "@mikro-orm/core";

@Entity()
export class TeamSnapshot {
  @PrimaryKey()
  id: number;

  @ManyToOne(() => Team, {
    nullable: false,
    //eager: true,
  })
  originTeam: Team;

  // @Expose({groups: ["view_standups"]})
  // @Transform(transformCollection)
  @ManyToMany(() => User, 'teamSnapshots', {
    //cascade: [Cascade.PERSIST],
    owner: true
  })
  users = new Collection<User, TeamSnapshot>(this);

  @Expose({groups: ["view_standups"]})
  @Transform(transformCollection)
  @OneToMany(() => QuestionSnapshot, question => question.team, {
    //eager: true,
    cascade: [Cascade.PERSIST],
  })
  questions = new Collection<QuestionSnapshot, TeamSnapshot>(this);

  @Expose({groups: ["view_standups"]})
  @Property({nullable: false, defaultRaw: 'CURRENT_TIMESTAMP'})
  createdAt: Date;

  @BeforeCreate()
  setupCreatedAt() {
    this.createdAt = new Date();
  }

  @AfterCreate()
  normalizeSort() {
    // if (!this.questions.isInitialized()) {
    //   return;
    // }

    // this.questions.set(this.questions.getItems().sort(sortByIndex))
    //
    // this.questions.getItems().forEach(q => {
    //   q.options.set(q.options.getItems().sort(sortByIndex))
    // })
  }

  // @Expose()
  // @Type(() => Channel)
  // @ManyToOne(type => Channel, null, {
  //   eager: true,
  //   nullable: false,
  // })
  // reportChannel: Channel

  simplify() {
    return {
      users: this.users.getIdentifiers(),
      questions: [...this.questions.getItems()].sort(sortByIndex).map(q => ({
        index: q.index,
        text: q.text,
        originQuestionId: q.originQuestion.id,
        options: [...q.options.getItems()].sort(sortByIndex).map(o => ({
          originOptionId: o.originOption.id,
          index: o.index,
          text: o.text
        }))
      }))
    }
  }

  equals(team: TeamSnapshot) {
    return JSON.stringify(this.simplify()) === JSON.stringify(team.simplify())
  }
}
