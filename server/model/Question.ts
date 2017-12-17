import {Entity, Column, PrimaryGeneratedColumn, ManyToOne} from "typeorm";
import Im from "./Im";

@Entity()
class Question
{
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    index: number;

    @Column()
    text: string;

    @ManyToOne(type => Im, null, {
        eager: true
    })
    im: Im;
}

export default Question;