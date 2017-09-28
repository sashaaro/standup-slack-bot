import {Entity, Column, PrimaryGeneratedColumn, OneToMany} from "typeorm";
import User from "./User";

@Entity()
class Team
{
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    settings: object;

    @OneToMany(type => User, user => user.team, {
        cascadeInsert: true
    })
    users: User[]
}

export default Team;