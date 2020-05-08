import {MigrationInterface, QueryRunner} from "typeorm";

export class predefinedAnswers1588613935309 implements MigrationInterface {
    name = 'predefinedAnswers1588613935309'
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "predefined_answer" ("id" SERIAL NOT NULL, "text" character varying NOT NULL, "updatedAt" TIMESTAMP NOT NULL, "createdAt" TIMESTAMP NOT NULL, "questionId" integer, CONSTRAINT "PK_6cda41fc0b23f3dba83b4bf5310" PRIMARY KEY ("id"))`, undefined);
        await queryRunner.query(`ALTER TABLE "answer_request" ADD "predefinedAnswerId" integer`, undefined);
        await queryRunner.query(`ALTER TABLE "predefined_answer" ADD CONSTRAINT "FK_e0c90554270cdb40c861f7313e6" FOREIGN KEY ("questionId") REFERENCES "question"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`, undefined);
        await queryRunner.query(`ALTER TABLE "answer_request" ADD CONSTRAINT "FK_8877cab68f1b94672812dd48f01" FOREIGN KEY ("predefinedAnswerId") REFERENCES "predefined_answer"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`, undefined);
    }
    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "answer_request" DROP CONSTRAINT "FK_8877cab68f1b94672812dd48f01"`, undefined);
        await queryRunner.query(`ALTER TABLE "predefined_answer" DROP CONSTRAINT "FK_e0c90554270cdb40c861f7313e6"`, undefined);
        await queryRunner.query(`ALTER TABLE "answer_request" DROP COLUMN "predefinedAnswerId"`, undefined);
        await queryRunner.query(`DROP TABLE "predefined_answer"`, undefined);
    }
}
