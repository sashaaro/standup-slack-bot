import {
  BeforeInsert,
  Column,
  Entity, JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn
} from "typeorm";
import User from "./User";
import {Expose, Type} from "class-transformer";
import {Team} from "./Team";
import QuestionSnapshot from "./QuestionSnapshot";


@Entity()
export class TeamSnapshot {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(type => Team, {
    nullable: false,
    eager: true,
  })
  originTeam: Team;

  @Expose()
  @Type(() => User)
  @ManyToMany(type => User, {
    eager: true,
  })
  @JoinTable()
  users: Array<User>

  @Expose()
  @Type(() => QuestionSnapshot)
  @OneToMany(type => QuestionSnapshot, question => question.team, {
    eager: true,
    cascade: true,
  })
  questions: QuestionSnapshot[];

  @Column({nullable: false})
  createdAt: Date;

  @BeforeInsert()
  setupCreatedAt() {
    this.createdAt = new Date();
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
        index: q.index,
        text: q.text,
        originQuestionId: q.originQuestion.id,
        options: q.options.map(o => ({
          text: o.text
          // TODO index?!
        }))
      }))
    }
  }

  equals(team: TeamSnapshot) {
    return JSON.stringify(this.simplify()) === JSON.stringify(team.simplify())
  }
}
