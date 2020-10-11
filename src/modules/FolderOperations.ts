import { RawModule } from "../types";
import ENV from "../ENV";
import * as path from "path";
import * as fs from "fs";
import { simpleMove } from "../util";
import { forEveryEntry, getEnts } from "../util";

const TEMP_DIR_NAME = "___tmp";

const FolderOperations: RawModule = {
  flatten: {
    cmdName: 'flatten',
    help: 'Flatten folders that only contain one folder',
    run: async () => {
      console.log('Start flattening...');

      const tempDir = path.join(ENV.cwd, TEMP_DIR_NAME);
      if (!fs.existsSync(tempDir))
        fs.mkdirSync(tempDir);
      const errors = [];

      await forEveryEntry(ENV.cwd, (dir, folder) => {
        if (!dir.isDirectory()) return;

        const currentFolder = path.join(folder, dir.name);
        
        const ents = getEnts(currentFolder);
        if (ents.filter(ent => ent.isDirectory()).length !== 1 || ents.some(ent => ent.isFile()))
        return;
        
        const nestedDir = ents[0];
        
        simpleMove(currentFolder, nestedDir.name, tempDir);

        try {
          fs.rmdirSync(currentFolder);
          simpleMove(tempDir, nestedDir.name, folder, true);
          console.log(`Flattened ${dir.name} -> ${nestedDir.name}`);
        } catch (err) {
          errors.push(err);
        }
      });
      
      if (fs.readdirSync(tempDir).length) {
        console.error(`Could not remove ${TEMP_DIR_NAME} because of ${errors.length} errors:`, errors);
      } else {
        fs.rmdirSync(tempDir);
      }
    }
  },
  clean: {
    cmdName: 'clean',
    help: 'Remove empty folders',
    getRun: iterate => async () => iterate((dir, folder) => {
      if (!dir.isDirectory()) return;

      const dirPath = path.join(folder, dir.name);

      if (fs.readdirSync(dirPath).length) return;

      fs.rmdirSync(dirPath);
      console.log(`Removed ${dirPath}`);
    })
  },
};

export default FolderOperations;