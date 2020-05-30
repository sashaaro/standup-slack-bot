import {templateDirPath} from "../http/controller";
import * as pug from 'pug'

export class RenderEngine {
  compiledTemplates = {};
  globalParams = {};

  constructor(private enableCache = false) {
  }

  compileTemplate(templateName: string) {
    const fileName = `${templateDirPath}/${templateName}.pug`;
    let compiledTemplate;

    if (this.enableCache) {
      compiledTemplate = this.compiledTemplates[fileName]
    }

    if (!compiledTemplate) {
      compiledTemplate = pug.compileFile(fileName)
    }

    if (this.enableCache) {
      this.compiledTemplates[fileName] = compiledTemplate;
    }

    return compiledTemplate;
  }

  render(templateName: string, params?: object): string {
    return this.compileTemplate(templateName)(params ? {...this.globalParams, ...params} : this.globalParams)
  }
}
