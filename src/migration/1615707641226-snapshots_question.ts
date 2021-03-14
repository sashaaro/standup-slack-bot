import {MigrationInterface, QueryRunner} from "typeorm";
export class snapshots_question1615707641226 implements MigrationInterface {
    name = 'snapshots_question1615707641226'
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "answer_request" DROP CONSTRAINT "FK_72c8029ce793661de4cbc5093a7"`, undefined);
        await queryRunner.query(`ALTER TABLE "answer_request" DROP CONSTRAINT "FK_9321019b60471a82c818947a264"`, undefined);
        await queryRunner.query(`ALTER TABLE "answer_request" ADD CONSTRAINT "FK_72c8029ce793661de4cbc5093a7" FOREIGN KEY ("questionId") REFERENCES "question_snapshot"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`, undefined);
        await queryRunner.query(`ALTER TABLE "answer_request" ADD CONSTRAINT "FK_9321019b60471a82c818947a264" FOREIGN KEY ("optionId") REFERENCES "question_option_snapshot"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`, undefined);
    }
    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "answer_request" DROP CONSTRAINT "FK_9321019b60471a82c818947a264"`, undefined);
        await queryRunner.query(`ALTER TABLE "answer_request" DROP CONSTRAINT "FK_72c8029ce793661de4cbc5093a7"`, undefined);
        await queryRunner.query(`ALTER TABLE "answer_request" ADD CONSTRAINT "FK_9321019b60471a82c818947a264" FOREIGN KEY ("optionId") REFERENCES "question_option"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`, undefined);
        await queryRunner.query(`ALTER TABLE "answer_request" ADD CONSTRAINT "FK_72c8029ce793661de4cbc5093a7" FOREIGN KEY ("questionId") REFERENCES "question"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`, undefined);
    }
}
