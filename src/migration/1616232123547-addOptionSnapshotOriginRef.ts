import {MigrationInterface, QueryRunner} from "typeorm";
export class addOptionSnapshotOriginRef1616232123547 implements MigrationInterface {
    name = 'addOptionSnapshotOriginRef1616232123547'
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "question_option_snapshot" ADD "originOptionId" integer NOT NULL`, undefined);
        await queryRunner.query(`ALTER TABLE "question_option_snapshot" ADD CONSTRAINT "FK_5275a8035e42b870e1d539d228c" FOREIGN KEY ("originOptionId") REFERENCES "question_option"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`, undefined);
    }
    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "question_option_snapshot" DROP CONSTRAINT "FK_5275a8035e42b870e1d539d228c"`, undefined);
        await queryRunner.query(`ALTER TABLE "question_option_snapshot" DROP COLUMN "originOptionId"`, undefined);
    }
}
