import * as fs from "fs";

export const logError = (error) => {
  if (error instanceof Error) {
    error = error.message
  }

  const errorMessage = `[${new Date().toISOString()}] ${error}\n`;
  console.warn(errorMessage);

  fs.appendFileSync('./var/errors.log', errorMessage);
}