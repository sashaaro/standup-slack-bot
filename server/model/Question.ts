import {Entity, Column, PrimaryGeneratedColumn, ManyToOne, BeforeInsert, BeforeUpdate} from "typeorm";
import Team from "./Team";
import {Channel} from "./Channel";
import {IQuestion} from "../bot/models";

@Entity()
class Question implements IQuestion
{
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    index: number;

    @Column()
    text: string;

    @Column()
    isEnabled: boolean = true;

    @Column()
    createdAt: Date;

    @ManyToOne(type => Channel)
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
