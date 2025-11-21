export interface Question {
    _id: string;
    text: string;
    category: string;
    counselor: string;
    createdAt: string;
}

export interface QuestionForm {
    text: string;
    category: string;
}

export interface UsedQuestion extends Question {
    timestamp: number;
}