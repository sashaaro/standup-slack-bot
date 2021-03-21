import {MigrationInterface, QueryRunner} from "typeorm";
export class fixName1616319043633 implements MigrationInterface {
    name = 'fixName1616319043633'
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "answer_request" DROP CONSTRAINT "FK_f821fefd4198919b7193f0ec01b"`, undefined);
        await queryRunner.query(`ALTER TABLE "answer_request" RENAME COLUMN "userStandUpId" TO "userStandupId"`, undefined);
        await queryRunner.query(`ALTER TABLE "answer_request" ADD CONSTRAINT "FK_b53ee81f4ebb8df21b3ba62c3d7" FOREIGN KEY ("userStandupId") REFERENCES "user_standup"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`, undefined);
    }
    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "answer_request" DROP CONSTRAINT "FK_b53ee81f4ebb8df21b3ba62c3d7"`, undefined);
        await queryRunner.query(`ALTER TABLE "answer_request" RENAME COLUMN "userStandupId" TO "userStandUpId"`, undefined);
        await queryRunner.query(`ALTER TABLE "answer_request" ADD CONSTRAINT "FK_f821fefd4198919b7193f0ec01b" FOREIGN KEY ("userStandUpId") REFERENCES "user_standup"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`, undefined);
    }
}
