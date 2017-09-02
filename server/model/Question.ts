interface QuestionInterface {
    id: number;
    text: string;
}

class Question implements QuestionInterface
{
    id: number;
    text: string;
}

export default Question;