import {MigrationInterface, QueryRunner} from "typeorm";
export class snapshots1615648463046 implements MigrationInterface {
    name = 'snapshots1615648463046'
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "team_snapshot_users_user" ("teamSnapshotId" integer NOT NULL, "userId" character varying NOT NULL, CONSTRAINT "PK_3412e3090c590a0ead25a459f09" PRIMARY KEY ("teamSnapshotId", "userId"))`, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_630a0f5d91e291f38f25b801e2" ON "team_snapshot_users_user" ("teamSnapshotId") `, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_c6c60d494e59e99b797c4270b4" ON "team_snapshot_users_user" ("userId") `, undefined);
        await queryRunner.query(`ALTER TABLE "team_snapshot_users_user" ADD CONSTRAINT "FK_630a0f5d91e291f38f25b801e20" FOREIGN KEY ("teamSnapshotId") REFERENCES "team_snapshot"("id") ON DELETE CASCADE ON UPDATE NO ACTION`, undefined);
        await queryRunner.query(`ALTER TABLE "team_snapshot_users_user" ADD CONSTRAINT "FK_c6c60d494e59e99b797c4270b4e" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`, undefined);
    }
    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "team_snapshot_users_user" DROP CONSTRAINT "FK_c6c60d494e59e99b797c4270b4e"`, undefined);
        await queryRunner.query(`ALTER TABLE "team_snapshot_users_user" DROP CONSTRAINT "FK_630a0f5d91e291f38f25b801e20"`, undefined);
        await queryRunner.query(`DROP INDEX "IDX_c6c60d494e59e99b797c4270b4"`, undefined);
        await queryRunner.query(`DROP INDEX "IDX_630a0f5d91e291f38f25b801e2"`, undefined);
        await queryRunner.query(`DROP TABLE "team_snapshot_users_user"`, undefined);
    }
}
