import {Cascade, Collection, Entity, ManyToMany, ManyToOne, OneToMany, PrimaryKey, Property} from "@mikro-orm/core";
import Question from "./question";
import {TeamSnapshot} from "./team-snapshot";
import QuestionOptionSnapshot from "./question-option-snapshot";
import {Expose, Transform} from "class-transformer";
import {transformCollection} from "../services/utils";

@Entity()
class QuestionSnapshot {
  @PrimaryKey()
  id: number;

  @Expose({groups: ["view_standups"]})
  @Property()
  index: number;

  @Expose({groups: ["view_standups"]})
  @Property()
  text: string;

  @Expose({groups: ["view_standups"]})
  @Transform(transformCollection)
  @OneToMany(() => QuestionOptionSnapshot, o => o.question, {
    //eager: true,
    //cascade: ["insert"],
    cascade: [Cascade.PERSIST],
  })
  options = new Collection<QuestionOptionSnapshot, QuestionSnapshot>(this);

  @ManyToOne(type => Question, {
    //eager: true
  })
  originQuestion: Question;

  @ManyToOne(type => TeamSnapshot, {
    nullable: false,
    onDelete: "CASCADE",
    inversedBy: 'questions'
  })
  team: TeamSnapshot;
}

export default QuestionSnapshot;
