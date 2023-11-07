import { Provable, PublicKey } from 'o1js';
import * as fs from 'fs';

type ArbitraryData = { [key: string]: any };

interface IDataEntry {
  label: string;
  data: ArbitraryData;
}

class DataGuard {
  private static INSTANCE: DataGuard;
  private cache: IDataEntry[] = [];
  private path: string;

  private constructor(path: string) {
    this.path = path;
  }

  static activate(path: string = ''): DataGuard {
    if (!this.INSTANCE) {
      this.INSTANCE = new DataGuard(path);
    }
    return this.INSTANCE;
  }

  static get(): DataGuard {
    if (!this.INSTANCE) throw new Error('DataGuard has not been activated.');
    return this.INSTANCE;
  }

  addData(label: string, data: ArbitraryData): void {
    if (Provable.inCheckedComputation()) {
      Provable.asProver(() => {
        this._addData(label, data);
      })
    } else {
      this._addData(label, data);
    }
  }

  private _addData(label: string, data: ArbitraryData) {
    const existingEntryIndex = this.cache.findIndex(
      (entry) => entry.label === label
    );
    if (existingEntryIndex !== -1) {
      this.cache[existingEntryIndex].data = data;
    } else {
      this.cache.push({ label, data });
    }
  }

  async saveDataToFile(name: string): Promise<void> {
    const filePath = `${this.path}/${name}.json`;
    const fileData = this.cache.reduce((acc, { label, data }) => {
      acc[label] = data;
      return acc;
    }, {} as { [label: string]: ArbitraryData });

    await fs.promises.writeFile(filePath, JSON.stringify(fileData), 'utf8');
    console.log(`Data saved to file: ${filePath}`);
  }

  async readDataFromFile<T>(
    name: string,
    label: string
  ): Promise<T | null> {
    const filePath = `${this.path}/${name}.json`;
    try {
      const fileContent = await fs.promises.readFile(filePath, 'utf8');
      const allData = JSON.parse(fileContent);
      return allData[label] as T | null;
    } catch (err) {
      return null;
    }
  }

  changePath(path: string): void {
    this.path = path;
  }
}

export default DataGuard;
