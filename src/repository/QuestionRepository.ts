import Question from './../model/Question';
import {EntityRepository, Repository} from "typeorm";
import {Channel} from "../model/Channel";

const questions = [
    'What I worked on yesterday?',
    'What I working on today?',
    'Is anything standing in your way?'
]

@EntityRepository(Question)
class QuestionRepository extends Repository<Question>
{
    async setupDefaultQuestionsToChannel(channel: Channel) {
        // TODO transaction
        let index = 0
        for (const q of questions) {
            const qu = new Question()
            qu.text = q;
            qu.index = index;
            qu.isEnabled = true;
            qu.channel = channel;
            qu.index = index
            ++index;
            await this.insert(qu)
        }

        return await this.manager.getRepository(Channel).findOneOrFail(channel.id, {relations: ['questions']})
    }

    async updateForChannel(newQuestions: string[], channel: Channel) {
        const questions = await this.createQueryBuilder('q')
          .where({channel: channel.id, isEnabled: true})
          .orderBy("q.index", "ASC")
          .getMany()

        const disableQIds = []
        const addQuestions: Question[] = []

        for (let index = 0;index < questions.length || index < newQuestions.length; index++) {
            const oldQuestion = questions[index];
            const newQuestion = newQuestions[index];

            //console.log(oldQuestion, newQuestion);

            if (oldQuestion && oldQuestion.index !== index) {
                throw new Error('Wrong order.')
            }

            if (oldQuestion && !newQuestion) {
                disableQIds.push(oldQuestion.id)
                continue;
            }

            if (!oldQuestion && newQuestion) {
                const newQ = new Question();
                newQ.text = newQuestion;
                newQ.isEnabled = true;
                newQ.channel = channel;
                newQ.index = index;
                addQuestions.push(newQ)
                continue;
            }

            if (oldQuestion.text !== newQuestion) {
                disableQIds.push(oldQuestion.id)

                const newQ = new Question();
                newQ.text = newQuestion;
                newQ.isEnabled = true;
                newQ.channel = channel;
                newQ.index = oldQuestion.index;
                addQuestions.push(newQ)
            }
        }

        await this.manager.transaction(async (transactionalManager) => {
            transactionalManager.createQueryBuilder(Question, 'q')

            if (disableQIds.length) {
                await this.manager.createQueryBuilder()
                  .update(Question)
                  .where({channel: channel.id})
                  .andWhere('id = ANY(:ids)', {ids: disableQIds})
                  .set({isEnabled: false})
                  .useTransaction(true)
                  .execute()
            }
            for(const q of addQuestions) {
                await transactionalManager.save(q);
            }
        })
    }
}

export default QuestionRepository;