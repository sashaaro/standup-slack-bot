import {Entity, Column, ManyToOne, BeforeInsert, PrimaryGeneratedColumn} from "typeorm";
import Question from "./Question";
import Im from "./Im";
import StandUp from "./StandUp";

@Entity()
class Answer
{
    @PrimaryGeneratedColumn()
    id: string

    @ManyToOne(type => Im, null, {
        eager: true
    })
    im: Im;

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
