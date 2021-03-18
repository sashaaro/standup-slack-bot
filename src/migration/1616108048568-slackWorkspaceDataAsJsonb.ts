import {MigrationInterface, QueryRunner} from "typeorm";
export class slackWorkspaceDataAsJsonb1616108048568 implements MigrationInterface {
    name = 'slackWorkspaceDataAsJsonb1616108048568'
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "slack_workspace" DROP COLUMN "slackData"`, undefined);
        await queryRunner.query(`ALTER TABLE "slack_workspace" ADD "slackData" jsonb`, undefined);
    }
    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "slack_workspace" DROP COLUMN "slackData"`, undefined);
        await queryRunner.query(`ALTER TABLE "slack_workspace" ADD "slackData" json`, undefined);
    }
}
