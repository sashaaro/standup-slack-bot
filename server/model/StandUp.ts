import {Entity, Column, BeforeInsert, ManyToOne, PrimaryGeneratedColumn, OneToMany} from "typeorm";
import AnswerRequest from "./AnswerRequest";
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

    @OneToMany(type => AnswerRequest, answer => answer.standUp)
    answers: AnswerRequest[];

    @BeforeInsert()
    setupCreatedAt() {
        this.start = new Date();
    }

    // implements IStandUp
    get team() {
        return this.channel;
    }

    set team(channel: Channel) {
      this.channel = channel
    }
}

export default StandUp;
