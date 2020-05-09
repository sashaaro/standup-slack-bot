import Question from './../model/Question';
import {EntityRepository, Repository} from "typeorm";
import {Team} from "../model/Team";

const questions = [
  'What I worked on yesterday?',
  'What I working on today?',
  'Is anything standing in your way?'
]

@EntityRepository(Question)
export class QuestionRepository extends Repository<Question> {
  async setupDefaultQuestionsToChannel(team: Team): Promise<Question[]> {
    // TODO transaction
    let index = 0
    const result = [];
    for (const q of questions) {
      const qu = this.create();
      qu.text = q;
      qu.index = index;
      qu.isEnabled = true;
      qu.team = team;
      qu.index = index
      ++index;
      await this.insert(qu)
      result.push(qu);
    }

    return result;
  }
}
