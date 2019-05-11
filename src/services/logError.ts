import * as fs from "fs";

export const logError = (error: Error|any) => {
  console.warn(error);

  if (error instanceof Error) {
    error = `${error.name} ${error.stack} ${error.message}`
  }

  const errorMessage = `[${new Date().toISOString()}] ${error}\n`;
  fs.appendFileSync('./var/errors.log', errorMessage);
}