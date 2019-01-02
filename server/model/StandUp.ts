import {Entity, Column, BeforeInsert, ManyToOne, PrimaryGeneratedColumn, OneToMany} from "typeorm";
import Team from "./Team";
import Answer from "./Answer";

@Entity()
class StandUp
{
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(type => Team, {
        cascade: true
    })
    team: Team

    @Column()
    start: Date;

    @Column({nullable: true})
    end: Date;

    @OneToMany(type => Answer, answer => answer.standUp)
    answers: Answer[];

    @BeforeInsert()
    setupCreatedAt() {
        this.start = new Date();
    }
}

export default StandUp;
