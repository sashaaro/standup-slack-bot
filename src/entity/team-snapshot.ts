import {User} from "./user";
import {Expose, Type} from "class-transformer";
import {Team} from "./team";
import QuestionSnapshot from "./question-snapshot";
import {sortByIndex} from "../services/utils";
import {Entity, ManyToMany, ManyToOne, OneToMany, PrimaryKey, Property} from "@mikro-orm/core";


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
  users: Array<User>

  @Expose()
  @Type(() => QuestionSnapshot)
  @OneToMany(() => QuestionSnapshot, question => question.team, {
    //eager: true,
    //cascade: true,
  })
  questions: QuestionSnapshot[];

  @Property({nullable: false})
  createdAt: Date;

  //@BeforeInsert()
  setupCreatedAt() {
    this.createdAt = new Date();
  }

  //@AfterLoad()
  normalizeSort() {
    if (this.questions == null) {
      return;
    }
    this.questions = this.questions.sort(sortByIndex)

    this.questions.forEach(q => {
      q.options = q.options.sort(sortByIndex)
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
      users: this.users.map(u => u.id),
      questions: this.questions.map(q => ({
        index: q.index, // TODO ensure correct order
        text: q.text,
        originQuestionId: q.originQuestion.id,
        options: q.options.map(o => ({
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
