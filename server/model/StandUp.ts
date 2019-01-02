import {Entity, Column, BeforeInsert, ManyToOne, PrimaryGeneratedColumn} from "typeorm";
import Team from "./Team";

@Entity()
class StandUp
{
    @PrimaryGeneratedColumn()
    id: string;

    @ManyToOne(type => Team, {
        cascade: true
    })
    team: Team

    @Column()
    start: Date;

    @Column()
    end: Date;

    @BeforeInsert()
    setupCreatedAt() {
        this.start = new Date();
    }
}

export default StandUp;
