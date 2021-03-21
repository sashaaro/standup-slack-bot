import {MigrationInterface, QueryRunner} from "typeorm";
export class fix1616332587377 implements MigrationInterface {
    name = 'fix1616332587377'
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "answer_request" DROP CONSTRAINT "FK_b53ee81f4ebb8df21b3ba62c3d7"`, undefined);
        await queryRunner.query(`ALTER TABLE "answer_request" ALTER COLUMN "userStandupId" SET NOT NULL`, undefined);
        await queryRunner.query(`COMMENT ON COLUMN "answer_request"."userStandupId" IS NULL`, undefined);
        await queryRunner.query(`ALTER TABLE "answer_request" ADD CONSTRAINT "FK_b53ee81f4ebb8df21b3ba62c3d7" FOREIGN KEY ("userStandupId") REFERENCES "user_standup"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`, undefined);
    }
    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "answer_request" DROP CONSTRAINT "FK_b53ee81f4ebb8df21b3ba62c3d7"`, undefined);
        await queryRunner.query(`COMMENT ON COLUMN "answer_request"."userStandupId" IS NULL`, undefined);
        await queryRunner.query(`ALTER TABLE "answer_request" ALTER COLUMN "userStandupId" DROP NOT NULL`, undefined);
        await queryRunner.query(`ALTER TABLE "answer_request" ADD CONSTRAINT "FK_b53ee81f4ebb8df21b3ba62c3d7" FOREIGN KEY ("userStandupId") REFERENCES "user_standup"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`, undefined);
    }
}
