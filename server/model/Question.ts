import {Entity, Column, PrimaryGeneratedColumn} from "typeorm";

@Entity()
class Question
{
    @PrimaryGeneratedColumn()
    id: number;

    @Column({
        length: 500
    })
    text: string;
}

export default Question;