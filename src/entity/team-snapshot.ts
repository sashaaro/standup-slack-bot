import {User} from "./user";
import {Expose, Type} from "class-transformer";
import {Team} from "./team";
import QuestionSnapshot from "./question-snapshot";
import {sortByIndex} from "../services/utils";
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

  @Expose()
  @Type(() => User)
  @ManyToMany(() => User, u => u.teamSnapshots, {
    //cascade: ["persist"],
  })
  users = new Collection<User, TeamSnapshot>(this);

  @Expose()
  @Type(() => QuestionSnapshot)
  @OneToMany(() => QuestionSnapshot, question => question.team, {
    //eager: true,
    cascade: [Cascade.PERSIST],
  })
  questions = new Collection<QuestionSnapshot, TeamSnapshot>(this);

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

    this.questions.set(this.questions.getItems().sort(sortByIndex))

    this.questions.getItems().forEach(q => {
      q.options.set(q.options.getItems().sort(sortByIndex))
    })
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
      questions: this.questions.getItems().map(q => ({
        index: q.index, // TODO ensure correct order
        text: q.text,
        originQuestionId: q.originQuestion.id,
        options: q.options.getItems().map(o => ({
          originOptionId: o.originOption.id,
          index: o.index,
          text: o.text
        }))
      }))
    }
  }

  equals(team: TeamSnapshot) {
    console.log(this.simplify())
    console.log(team.simplify())
    return JSON.stringify(this.simplify()) === JSON.stringify(team.simplify())
  }
}
