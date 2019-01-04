import {Entity, Column, BeforeInsert, ManyToOne, PrimaryGeneratedColumn, OneToMany} from "typeorm";
import Answer from "./Answer";
import {IStandUp} from "../StandUpBotService";
import {Channel} from "./Channel";

@Entity()
class StandUp implements IStandUp
{
    @PrimaryGeneratedColumn()
    id: number;

    // slack channel
    @ManyToOne(type => Channel, {
        cascade: true
    })
    channel: Channel

    @Column()
    start: Date;

    @Column()
    end: Date;

    @OneToMany(type => Answer, answer => answer.standUp)
    answers: Answer[];

    @BeforeInsert()
    setupCreatedAt() {
        this.start = new Date();
    }


    // implements IStandUp
    get team() {
        return this.channel;
    }
}

export default StandUp;
