import {Entity, Column, PrimaryGeneratedColumn, ManyToOne} from "typeorm";
import Team from "./Team";

@Entity()
class User
{
    @PrimaryGeneratedColumn()
    id: number;

    @Column({
        length: 500
    })
    name: string;

    @ManyToOne(type => Team, team => team.users)
    team: Team;
}

export default User;