import {Collection, Entity, ManyToMany, ManyToOne, OneToMany, PrimaryKey, Property} from "@mikro-orm/core";
import Question from "./question";
import {TeamSnapshot} from "./team-snapshot";
import QuestionOptionSnapshot from "./question-option-snapshot";

@Entity()
class QuestionSnapshot {
  @PrimaryKey()
  id: number;

  @Property()
  index: number;

  @Property()
  text: string;

  @OneToMany(() => QuestionOptionSnapshot, o => o.question, {
    //eager: true,
    //cascade: ["insert"],
  })
  options = new Collection<QuestionOptionSnapshot, QuestionSnapshot>(this);

  @ManyToOne(type => Question, {
    //eager: true
  }) // TODO nullable true
  originQuestion: Question;

  @ManyToOne(type => TeamSnapshot, {
    nullable: false,
    onDelete: "CASCADE",
    inversedBy: 'questions'
  })
  team: TeamSnapshot;
}

export default QuestionSnapshot;
