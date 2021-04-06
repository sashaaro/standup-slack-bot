import { Migration } from '@mikro-orm/migrations';

export class Migration20210403091701 extends Migration {

  async up(): Promise<void> {
    this.addSql('create table "slack_workspace" ("id" varchar(255) not null, "name" varchar(255) not null, "domain" varchar(255) not null, "slack_data" jsonb null, "access_token" varchar(255) not null);');
    this.addSql('alter table "slack_workspace" add constraint "slack_workspace_pkey" primary key ("id");');

    this.addSql('create table "user" ("id" varchar(255) not null, "name" varchar(500) not null, "workspace_id" varchar(255) not null, "im" varchar(20) null, "access_token" varchar(255) null, "profile" jsonb not null);');
    this.addSql('alter table "user" add constraint "user_pkey" primary key ("id");');

    this.addSql('create table "channel" ("id" varchar(255) not null, "name" varchar(255) not null, "name_normalized" varchar(255) not null, "is_archived" bool not null default false, "is_enabled" bool not null default false, "created_by_id" varchar(255) not null, "workspace_id" varchar(255) not null);');
    this.addSql('alter table "channel" add constraint "channel_pkey" primary key ("id");');

    this.addSql('create table "timezone" ("id" serial primary key, "utc_offset" interval not null, "name" varchar(255) not null);');

    this.addSql('create table "team" ("id" serial primary key, "name" varchar(255) not null, "status" int2 not null, "workspace_id" varchar(255) not null, "duration" int4 not null default 30, "start" varchar(255) not null default \'11:00\', "days" integer[] not null default \'{0,1,2,3,4}\', "timezone_id" int4 not null, "report_channel_id" varchar(255) not null, "created_by_id" varchar(255) not null);');

    this.addSql('create table "question" ("id" serial primary key, "index" int4 not null, "text" varchar(255) not null, "is_enabled" bool not null default true, "created_at" timestamptz(0) not null, "team_id" int4 not null);');

    this.addSql('create table "question_option" ("id" serial primary key, "question_id" int4 not null, "is_enabled" bool not null default true, "text" varchar(255) not null, "index" int4 not null, "updated_at" timestamptz(0) not null, "created_at" timestamptz(0) not null);');

    this.addSql('create table "team_snapshot" ("id" serial primary key, "origin_team_id" int4 not null, "created_at" timestamptz(0) not null default CURRENT_TIMESTAMP);');

    this.addSql('create table "standup" ("id" serial primary key, "team_id" int4 not null, "start_at" timestamptz(0) not null, "end_at" timestamptz(0) not null);');

    this.addSql('create table "user_standup" ("id" serial primary key, "user_id" varchar(255) not null, "standup_id" int4 not null, "created_at" timestamptz(0) not null, "slack_message" jsonb not null);');

    this.addSql('create table "question_snapshot" ("id" serial primary key, "index" int4 not null, "text" varchar(255) not null, "origin_question_id" int4 not null, "team_id" int4 not null);');

    this.addSql('create table "question_option_snapshot" ("id" serial primary key, "index" int4 not null, "text" varchar(255) not null, "question_id" int4 not null, "origin_option_id" int4 not null);');

    this.addSql('create table "answer_request" ("id" varchar(255) not null, "user_standup_id" int4 not null, "question_id" int4 not null, "answer_message" varchar(255) null, "option_id" int4 not null, "created_at" timestamptz(0) not null, "answer_created_at" timestamptz(0) null);');
    this.addSql('alter table "answer_request" add constraint "answer_request_pkey" primary key ("id");');

    this.addSql('create table "user_team_snapshots" ("user_id" varchar(255) not null, "team_snapshot_id" int4 not null);');
    this.addSql('alter table "user_team_snapshots" add constraint "user_team_snapshots_pkey" primary key ("user_id", "team_snapshot_id");');

    this.addSql('create table "user_teams" ("user_id" varchar(255) not null, "team_id" int4 not null);');
    this.addSql('alter table "user_teams" add constraint "user_teams_pkey" primary key ("user_id", "team_id");');

    this.addSql('alter table "user" add constraint "user_workspace_id_foreign" foreign key ("workspace_id") references "slack_workspace" ("id") on update cascade;');

    this.addSql('alter table "channel" add constraint "channel_created_by_id_foreign" foreign key ("created_by_id") references "user" ("id") on update cascade;');
    this.addSql('alter table "channel" add constraint "channel_workspace_id_foreign" foreign key ("workspace_id") references "slack_workspace" ("id") on update cascade;');

    this.addSql('alter table "team" add constraint "team_workspace_id_foreign" foreign key ("workspace_id") references "slack_workspace" ("id") on update cascade;');
    this.addSql('alter table "team" add constraint "team_timezone_id_foreign" foreign key ("timezone_id") references "timezone" ("id") on update cascade;');
    this.addSql('alter table "team" add constraint "team_report_channel_id_foreign" foreign key ("report_channel_id") references "channel" ("id") on update cascade;');
    this.addSql('alter table "team" add constraint "team_created_by_id_foreign" foreign key ("created_by_id") references "user" ("id") on update cascade;');

    this.addSql('alter table "question" add constraint "question_team_id_foreign" foreign key ("team_id") references "team" ("id") on update cascade;');

    this.addSql('alter table "question_option" add constraint "question_option_question_id_foreign" foreign key ("question_id") references "question" ("id") on update cascade;');

    this.addSql('alter table "team_snapshot" add constraint "team_snapshot_origin_team_id_foreign" foreign key ("origin_team_id") references "team" ("id") on update cascade;');

    this.addSql('alter table "standup" add constraint "standup_team_id_foreign" foreign key ("team_id") references "team_snapshot" ("id") on update cascade;');

    this.addSql('alter table "user_standup" add constraint "user_standup_user_id_foreign" foreign key ("user_id") references "user" ("id") on update cascade;');
    this.addSql('alter table "user_standup" add constraint "user_standup_standup_id_foreign" foreign key ("standup_id") references "standup" ("id") on update cascade;');

    this.addSql('alter table "question_snapshot" add constraint "question_snapshot_origin_question_id_foreign" foreign key ("origin_question_id") references "question" ("id") on update cascade;');
    this.addSql('alter table "question_snapshot" add constraint "question_snapshot_team_id_foreign" foreign key ("team_id") references "team_snapshot" ("id") on update cascade on delete CASCADE;');

    this.addSql('alter table "question_option_snapshot" add constraint "question_option_snapshot_question_id_foreign" foreign key ("question_id") references "question_snapshot" ("id") on update cascade on delete CASCADE;');
    this.addSql('alter table "question_option_snapshot" add constraint "question_option_snapshot_origin_option_id_foreign" foreign key ("origin_option_id") references "question_option" ("id") on update cascade;');

    this.addSql('alter table "answer_request" add constraint "answer_request_user_standup_id_foreign" foreign key ("user_standup_id") references "user_standup" ("id") on update cascade;');
    this.addSql('alter table "answer_request" add constraint "answer_request_question_id_foreign" foreign key ("question_id") references "question_snapshot" ("id") on update cascade;');
    this.addSql('alter table "answer_request" add constraint "answer_request_option_id_foreign" foreign key ("option_id") references "question_option_snapshot" ("id") on update cascade;');

    this.addSql('alter table "user_team_snapshots" add constraint "user_team_snapshots_user_id_foreign" foreign key ("user_id") references "user" ("id") on update cascade on delete cascade;');
    this.addSql('alter table "user_team_snapshots" add constraint "user_team_snapshots_team_snapshot_id_foreign" foreign key ("team_snapshot_id") references "team_snapshot" ("id") on update cascade on delete cascade;');

    this.addSql('alter table "user_teams" add constraint "user_teams_user_id_foreign" foreign key ("user_id") references "user" ("id") on update cascade on delete cascade;');
    this.addSql('alter table "user_teams" add constraint "user_teams_team_id_foreign" foreign key ("team_id") references "team" ("id") on update cascade on delete cascade;');
  }

}
