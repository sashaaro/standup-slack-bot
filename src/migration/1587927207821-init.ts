import {MigrationInterface, QueryRunner} from "typeorm";

export class init1587927207821 implements MigrationInterface {
  name = 'init1587927207821'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "team" ("id" character varying NOT NULL, "name" character varying NOT NULL, "domain" character varying NOT NULL, "slackData" json, CONSTRAINT "PK_f57d8293406df4af348402e4b74" PRIMARY KEY ("id"))`, undefined);
    await queryRunner.query(`CREATE TABLE "user" ("id" character varying NOT NULL, "name" character varying(500) NOT NULL, "im" character varying(10), "profile" json NOT NULL DEFAULT '{}', "teamId" character varying, CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`, undefined);
    await queryRunner.query(`CREATE TABLE "timezone" ("id" SMALLSERIAL, "utc_offset" interval NOT NULL, "name" character varying NOT NULL, CONSTRAINT "PK_2706edc3223dd1d219f9f6a11b1" PRIMARY KEY ("id"))`, undefined);
    await queryRunner.query(`CREATE TABLE "channel" ("id" character varying NOT NULL, "name" character varying NOT NULL, "isArchived" boolean NOT NULL DEFAULT false, "isEnabled" boolean NOT NULL DEFAULT false, "nameNormalized" character varying NOT NULL, "start" character varying NOT NULL DEFAULT '11:00', "duration" integer NOT NULL DEFAULT 30, "createdById" character varying, "teamId" character varying, "timezoneId" integer, CONSTRAINT "PK_590f33ee6ee7d76437acf362e39" PRIMARY KEY ("id"))`, undefined);
    await queryRunner.query(`CREATE TABLE "question" ("id" SERIAL, "index" integer NOT NULL, "text" character varying NOT NULL, "isEnabled" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL, "channelId" character varying, CONSTRAINT "PK_21e5786aa0ea704ae185a79b2d5" PRIMARY KEY ("id"))`, undefined);
    await queryRunner.query(`CREATE TABLE "answer_request" ("id" SERIAL NOT NULL, "answerMessage" character varying, "createdAt" TIMESTAMP NOT NULL, "answerCreatedAt" TIMESTAMP, "userId" character varying, "standUpId" integer, "questionId" integer, CONSTRAINT "PK_e95abf2917a2e6a78ecd8ec39cb" PRIMARY KEY ("id"))`, undefined);
    await queryRunner.query(`CREATE TABLE "stand_up" ("id" SERIAL NOT NULL, "start" TIMESTAMP NOT NULL, "end" TIMESTAMP NOT NULL, "channelId" character varying, CONSTRAINT "PK_00077ae773e68bfe42c0f5451a1" PRIMARY KEY ("id"))`, undefined);
    await queryRunner.query(`CREATE TABLE "answer" ("id" SERIAL NOT NULL, "message" character varying, "createdAt" TIMESTAMP NOT NULL, "userId" character varying, "standUpId" integer, "questionId" integer, CONSTRAINT "PK_9232db17b63fb1e94f97e5c224f" PRIMARY KEY ("id"))`, undefined);
    await queryRunner.query(`CREATE TABLE "user_channels_channel" ("userId" character varying NOT NULL, "channelId" character varying NOT NULL, CONSTRAINT "PK_01cb58c2f493472e335712d76c7" PRIMARY KEY ("userId", "channelId"))`, undefined);
    await queryRunner.query(`CREATE INDEX "IDX_9c701cabd952769d5c75844343" ON "user_channels_channel" ("userId") `, undefined);
    await queryRunner.query(`CREATE INDEX "IDX_ab9fe5d9528e30e09b462c345d" ON "user_channels_channel" ("channelId") `, undefined);
    await queryRunner.query(`ALTER TABLE "user" ADD CONSTRAINT "FK_1e89f1fd137dc7fea7242377e25" FOREIGN KEY ("teamId") REFERENCES "team"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`, undefined);
    await queryRunner.query(`ALTER TABLE "channel" ADD CONSTRAINT "FK_b2207f24c9461a9e053f2d2e090" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`, undefined);
    await queryRunner.query(`ALTER TABLE "channel" ADD CONSTRAINT "FK_1401e6454f1c5b030c5080d0842" FOREIGN KEY ("teamId") REFERENCES "team"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`, undefined);
    await queryRunner.query(`ALTER TABLE "channel" ADD CONSTRAINT "FK_aee33f32c6ba4979ac7b12a802c" FOREIGN KEY ("timezoneId") REFERENCES "timezone"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`, undefined);
    await queryRunner.query(`ALTER TABLE "question" ADD CONSTRAINT "FK_4ae050836fe0a9897502e851fe8" FOREIGN KEY ("channelId") REFERENCES "channel"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`, undefined);
    await queryRunner.query(`ALTER TABLE "answer_request" ADD CONSTRAINT "FK_2d3ccf6de45f8f96399229009d2" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`, undefined);
    await queryRunner.query(`ALTER TABLE "answer_request" ADD CONSTRAINT "FK_7daa632484b0b8ae9cf2edaa7fd" FOREIGN KEY ("standUpId") REFERENCES "stand_up"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`, undefined);
    await queryRunner.query(`ALTER TABLE "answer_request" ADD CONSTRAINT "FK_72c8029ce793661de4cbc5093a7" FOREIGN KEY ("questionId") REFERENCES "question"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`, undefined);
    await queryRunner.query(`ALTER TABLE "stand_up" ADD CONSTRAINT "FK_3b8c544c4434f61481865002502" FOREIGN KEY ("channelId") REFERENCES "channel"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`, undefined);
    await queryRunner.query(`ALTER TABLE "answer" ADD CONSTRAINT "FK_5a26907efcd78a856c8af5829e6" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`, undefined);
    await queryRunner.query(`ALTER TABLE "answer" ADD CONSTRAINT "FK_235dd094f54380a21160adda6b5" FOREIGN KEY ("standUpId") REFERENCES "stand_up"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`, undefined);
    await queryRunner.query(`ALTER TABLE "answer" ADD CONSTRAINT "FK_a4013f10cd6924793fbd5f0d637" FOREIGN KEY ("questionId") REFERENCES "question"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`, undefined);
    await queryRunner.query(`ALTER TABLE "user_channels_channel" ADD CONSTRAINT "FK_9c701cabd952769d5c75844343c" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`, undefined);
    await queryRunner.query(`ALTER TABLE "user_channels_channel" ADD CONSTRAINT "FK_ab9fe5d9528e30e09b462c345d2" FOREIGN KEY ("channelId") REFERENCES "channel"("id") ON DELETE CASCADE ON UPDATE NO ACTION`, undefined);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user_channels_channel" DROP CONSTRAINT "FK_ab9fe5d9528e30e09b462c345d2"`, undefined);
    await queryRunner.query(`ALTER TABLE "user_channels_channel" DROP CONSTRAINT "FK_9c701cabd952769d5c75844343c"`, undefined);
    await queryRunner.query(`ALTER TABLE "answer" DROP CONSTRAINT "FK_a4013f10cd6924793fbd5f0d637"`, undefined);
    await queryRunner.query(`ALTER TABLE "answer" DROP CONSTRAINT "FK_235dd094f54380a21160adda6b5"`, undefined);
    await queryRunner.query(`ALTER TABLE "answer" DROP CONSTRAINT "FK_5a26907efcd78a856c8af5829e6"`, undefined);
    await queryRunner.query(`ALTER TABLE "stand_up" DROP CONSTRAINT "FK_3b8c544c4434f61481865002502"`, undefined);
    await queryRunner.query(`ALTER TABLE "answer_request" DROP CONSTRAINT "FK_72c8029ce793661de4cbc5093a7"`, undefined);
    await queryRunner.query(`ALTER TABLE "answer_request" DROP CONSTRAINT "FK_7daa632484b0b8ae9cf2edaa7fd"`, undefined);
    await queryRunner.query(`ALTER TABLE "answer_request" DROP CONSTRAINT "FK_2d3ccf6de45f8f96399229009d2"`, undefined);
    await queryRunner.query(`ALTER TABLE "question" DROP CONSTRAINT "FK_4ae050836fe0a9897502e851fe8"`, undefined);
    await queryRunner.query(`ALTER TABLE "channel" DROP CONSTRAINT "FK_aee33f32c6ba4979ac7b12a802c"`, undefined);
    await queryRunner.query(`ALTER TABLE "channel" DROP CONSTRAINT "FK_1401e6454f1c5b030c5080d0842"`, undefined);
    await queryRunner.query(`ALTER TABLE "channel" DROP CONSTRAINT "FK_b2207f24c9461a9e053f2d2e090"`, undefined);
    await queryRunner.query(`ALTER TABLE "user" DROP CONSTRAINT "FK_1e89f1fd137dc7fea7242377e25"`, undefined);
    await queryRunner.query(`DROP INDEX "IDX_ab9fe5d9528e30e09b462c345d"`, undefined);
    await queryRunner.query(`DROP INDEX "IDX_9c701cabd952769d5c75844343"`, undefined);
    await queryRunner.query(`DROP TABLE "user_channels_channel"`, undefined);
    await queryRunner.query(`DROP TABLE "answer"`, undefined);
    await queryRunner.query(`DROP TABLE "stand_up"`, undefined);
    await queryRunner.query(`DROP TABLE "answer_request"`, undefined);
    await queryRunner.query(`DROP TABLE "question"`, undefined);
    await queryRunner.query(`DROP TABLE "channel"`, undefined);
    await queryRunner.query(`DROP TABLE "timezone"`, undefined);
    await queryRunner.query(`DROP TABLE "user"`, undefined);
    await queryRunner.query(`DROP TABLE "team"`, undefined);
  }

}
