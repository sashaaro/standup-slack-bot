import {Entity, Column, BeforeInsert, ManyToOne, PrimaryGeneratedColumn, OneToMany} from "typeorm";
import AnswerRequest from "./AnswerRequest";
import {Channel} from "./Channel";
import {IStandUp} from "../bot/models";

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
    startAt: Date;

    @Column()
    endAt: Date;

    @OneToMany(type => AnswerRequest, answer => answer.standUp)
    answers: AnswerRequest[];

    @BeforeInsert()
    setupCreatedAt() {
        this.startAt = new Date();
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
