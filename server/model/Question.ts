import {Entity, Column, PrimaryGeneratedColumn, ManyToOne, BeforeInsert, BeforeUpdate} from "typeorm";
import Team from "./Team";
import {IQuestion} from "../SlackStandupBotClientService";

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
    disabled: boolean;

    @Column()
    createdAt: Date;

    // TODO @ManyToOne(type => Team)
    team: Team;

    @BeforeInsert()
    setupCreatedAt() {
        this.createdAt = new Date();
    }
}

export default Question;
