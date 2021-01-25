import * as yargs from "yargs";
import {Connection} from "typeorm";
import {Injectable} from "injection-js";
import * as fs from "fs";
import {bind} from "../services/utils";

const camelCase = function(str) {
  return str
    .replace(/\s(.)/g, function($1) { return $1.toUpperCase(); })
    .replace(/\s/g, '')
    .replace(/^(.)/, function($1) { return $1.toLowerCase(); });
}

/**
 * Generates a new migration file with sql needs to be executed to update schema.
 */
@Injectable()
export class MigrationGenerateCommand implements yargs.CommandModule {
  command = "migration:generate";
  describe = "Generates a new migration file with sql needs to be executed to update schema.";
  aliases = "migrations:generate";

  builder(args: yargs.Argv) {
    return args
      .option("n", {
        alias: "name",
        describe: "Name of the migration class.",
        demand: true
      });
  }

  constructor(private connection: Connection) {}

  @bind
  async handler(args: yargs.Arguments) {
    const timestamp = new Date().getTime();
    const filename = timestamp + "-" + args.name + ".ts";
    let directory = 'src/migration';

    await this.connection.connect();
    const connection = this.connection
    const sqlInMemory = await connection.driver.createSchemaBuilder().log();
    const upSqls: string[] = [], downSqls: string[] = [];

    sqlInMemory.upQueries.forEach(upQuery => {
      upSqls.push("        await queryRunner.query(`" + upQuery.query.replace(new RegExp("`", "g"), "\\`") + "`, " + JSON.stringify(upQuery.parameters) + ");");
    });
    sqlInMemory.downQueries.forEach(downQuery => {
      downSqls.push("        await queryRunner.query(`" + downQuery.query.replace(new RegExp("`", "g"), "\\`") + "`, " + JSON.stringify(downQuery.parameters) + ");");
    });


    const fileContent = MigrationGenerateCommand.getTemplate(args.name as any, timestamp, upSqls, downSqls.reverse());
    const path = process.cwd() + "/" + (directory ? (directory + "/") : "") + filename;
    fs.writeFile(path, fileContent, () => {})

    this.connection.close()
  }

  // -------------------------------------------------------------------------
  // Protected Static Methods
  // -------------------------------------------------------------------------

  /**
   * Gets contents of the migration file.
   */
  protected static getTemplate(name: string, timestamp: number, upSqls: string[], downSqls: string[]): string {
    const migrationName = `${camelCase(name)}${timestamp}`;

    return `import {MigrationInterface, QueryRunner} from "typeorm";
export class ${migrationName} implements MigrationInterface {
    name = '${migrationName}'
    public async up(queryRunner: QueryRunner): Promise<void> {
${upSqls.join(`
`)}
    }
    public async down(queryRunner: QueryRunner): Promise<void> {
${downSqls.join(`
`)}
    }
}
`;
  }

}
