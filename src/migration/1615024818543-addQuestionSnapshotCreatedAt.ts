import {MigrationInterface, QueryRunner} from "typeorm";
export class addQuestionSnapshotCreatedAt1615024818543 implements MigrationInterface {
    name = 'addQuestionSnapshotCreatedAt1615024818543'
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "question_snapshot" ADD "createdAt" TIMESTAMP NOT NULL`, undefined);
    }
    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "question_snapshot" DROP COLUMN "createdAt"`, undefined);
    }
}
