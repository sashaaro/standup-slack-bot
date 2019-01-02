import {Entity, Column, PrimaryGeneratedColumn, ManyToOne, BeforeInsert, BeforeUpdate} from "typeorm";
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

    @Column()
    createdAt: Date;

    @Column()
    updatedAt: Date;

    @BeforeInsert()
    setupCreatedAt() {
        this.createdAt = new Date();
    }

    @BeforeInsert()
    @BeforeUpdate()
    setupUpdatedAt() {
        this.updatedAt = new Date();
    }
}

export default Question;
