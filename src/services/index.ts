import {createConfFromEnv, createLogger, createProviders} from "./providers";
import fs from "fs";
import dotenv from "dotenv";
import pino from "pino";
import {ReflectiveInjector} from "injection-js";

// const env = yargs.option('env', {
//   default: 'dev',
//   describe: 'Environment'
// }).argv.env;

const env = 'dev';
if (fs.existsSync(`.env.${env}`)) {
    dotenv.config({path: `.env.${env}`})
}
const config = createConfFromEnv(env);
const logger: pino.Logger = createLogger(config);

const {providers, commands} = createProviders(config, logger);

const injector = ReflectiveInjector.resolveAndCreate([...providers, ...commands]);

export {logger, injector, config, env}
