import Question from './../model/Question';

interface QuestionRepositoryInterface {
    findById():Question;
}

class QuestionRepository implements QuestionRepositoryInterface
{
    findById():Question {
        return new Question();
    }
}

export default QuestionRepository;