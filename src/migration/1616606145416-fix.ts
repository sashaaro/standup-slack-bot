import {MigrationInterface, QueryRunner} from "typeorm";
export class fix1616606145416 implements MigrationInterface {
    name = 'fix1616606145416'
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`COMMENT ON COLUMN "team"."days" IS NULL`, undefined);
        await queryRunner.query(`ALTER TABLE "team" ALTER COLUMN "days" SET DEFAULT '{0,1,2,3,4}'::integer[]`, undefined);
        await queryRunner.query(`ALTER TABLE "question_snapshot" DROP CONSTRAINT "FK_fc65efbcfebde907582a3518ecc"`, undefined);
        await queryRunner.query(`ALTER TABLE "question_snapshot" ALTER COLUMN "originQuestionId" DROP NOT NULL`, undefined);
        await queryRunner.query(`COMMENT ON COLUMN "question_snapshot"."originQuestionId" IS NULL`, undefined);
        await queryRunner.query(`ALTER TABLE "question_snapshot" ADD CONSTRAINT "FK_fc65efbcfebde907582a3518ecc" FOREIGN KEY ("originQuestionId") REFERENCES "question"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`, undefined);
    }
    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "question_snapshot" DROP CONSTRAINT "FK_fc65efbcfebde907582a3518ecc"`, undefined);
        await queryRunner.query(`COMMENT ON COLUMN "question_snapshot"."originQuestionId" IS NULL`, undefined);
        await queryRunner.query(`ALTER TABLE "question_snapshot" ALTER COLUMN "originQuestionId" SET NOT NULL`, undefined);
        await queryRunner.query(`ALTER TABLE "question_snapshot" ADD CONSTRAINT "FK_fc65efbcfebde907582a3518ecc" FOREIGN KEY ("originQuestionId") REFERENCES "question"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`, undefined);
        await queryRunner.query(`ALTER TABLE "team" ALTER COLUMN "days" SET DEFAULT '{0,1,2,3,4}'`, undefined);
        await queryRunner.query(`COMMENT ON COLUMN "team"."days" IS NULL`, undefined);
    }
}
