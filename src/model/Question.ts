import {Entity, Column, PrimaryGeneratedColumn, ManyToOne, BeforeInsert, BeforeUpdate, OneToMany} from "typeorm";
import Team from "./Team";
import {Channel} from "./Channel";
import {IQuestion} from "../bot/models";
import PredefinedAnswer from "./PredefinedAnswer";

@Entity()
class Question implements IQuestion
{
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    index: number;

    @Column()
    text: string;

    @Column({default: true})
    isEnabled: boolean = true;

    @OneToMany(type => PredefinedAnswer, pa => pa.question, {
        cascade: true,
        eager: true
    })
    predefinedAnswers: PredefinedAnswer[];

    @Column()
    createdAt: Date;

    @ManyToOne(type => Channel, {
        cascade: ["insert"]
    })
    channel: Channel;

    @BeforeInsert()
    setupCreatedAt() {
        this.createdAt = new Date();
    }

    get team() { // IQuestion interface
        return this.channel
    }
}

export default Question;
