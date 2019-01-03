import {Entity, Column, ManyToOne, BeforeInsert, PrimaryGeneratedColumn} from "typeorm";
import Question from "./Question";
import StandUp from "./StandUp";
import {IAnswer} from "../SlackStandupBotClientService";
import User from "./User";

@Entity()
class Answer implements IAnswer
{
    @PrimaryGeneratedColumn()
    id: string

    @ManyToOne(type => User, null, {
        eager: true
    })
    user: User;

    @ManyToOne(type => StandUp, null, {
        eager: true
    })
    standUp: StandUp;

    @ManyToOne(type => Question)
    question: Question

    @Column({nullable: true})
    message: string

    @Column()
    createdAt: Date;

    @BeforeInsert()
    setupCreatedAt() {
        this.createdAt = new Date();
    }
}

export default Answer;
