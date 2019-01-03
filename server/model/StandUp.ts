import {Entity, Column, BeforeInsert, ManyToOne, PrimaryGeneratedColumn, OneToMany} from "typeorm";
import Team from "./Team";
import Answer from "./Answer";
import {IStandUp} from "../SlackStandupBotClientService";

@Entity()
class StandUp implements IStandUp
{
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(type => Team, {
        cascade: true
    })
    team: Team

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
}

export default StandUp;
