import * as fs from "fs";
import * as path from "path";
import { BusinessContext } from "../types/business";

export interface CachedContextEntry {
  startLine: number;
  endLine: number;
  context: BusinessContext;
}

export class MockCache {
  private readonly cacheDir: string;
  public readonly cacheFilePath: string;
  private readonly data: Map<string, CachedContextEntry[]> = new Map();

  constructor(workspaceRoot: string, relativeCachePath: string = ".aidm/mock-cache.json") {
    this.cacheFilePath = path.join(workspaceRoot, relativeCachePath);
    this.cacheDir = path.dirname(this.cacheFilePath);
  }

  load(): void {
    try {
      if (fs.existsSync(this.cacheFilePath)) {
        const raw = fs.readFileSync(this.cacheFilePath, "utf-8");
        const json = JSON.parse(raw);
        this.data.clear();
        
        Object.entries(json).forEach(([filePath, fileData]) => {
          console.log(`Loading cache for file: ${filePath}`);
          
          // Check if this is the new range-based format
          if (typeof fileData === 'object' && !Array.isArray(fileData)) {
            const entries: CachedContextEntry[] = [];
            
            Object.entries(fileData as Record<string, any>).forEach(([range, context]) => {
              // Parse range like "15-30" into startLine and endLine
              const [startStr, endStr] = range.split('-');
              const startLine = parseInt(startStr, 10);
              const endLine = parseInt(endStr, 10);
              
              console.log(`  Range ${range}: lines ${startLine}-${endLine}`);
              
              entries.push({
                startLine,
                endLine,
                context: context as BusinessContext
              });
            });
            
            this.data.set(filePath, entries);
            console.log(`  Loaded ${entries.length} entries for ${filePath}`);
          } else if (Array.isArray(fileData)) {
            // Handle legacy format
            this.data.set(filePath, fileData as CachedContextEntry[]);
            console.log(`  Loaded ${fileData.length} entries for ${filePath} (legacy format)`);
          }
        });
        
        console.log(`MockCache loaded successfully. Total files: ${this.data.size}`);
      } else {
        console.log(`Cache file does not exist: ${this.cacheFilePath}`);
      }
    } catch (error) {
      // If load fails, start with empty cache; do not throw to avoid breaking server
      // eslint-disable-next-line no-console
      console.error("Failed to load mock cache:", error);
      this.data.clear();
    }
  }

  save(): void {
    try {
      if (!fs.existsSync(this.cacheDir)) {
        fs.mkdirSync(this.cacheDir, { recursive: true });
      }
      const json: Record<string, CachedContextEntry[]> = {};
      for (const [filePath, entries] of this.data.entries()) {
        json[filePath] = entries;
      }
      fs.writeFileSync(this.cacheFilePath, JSON.stringify(json, null, 2), "utf-8");
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Failed to save mock cache:", error);
    }
  }

  get(filePath: string, line: number): BusinessContext | null {
    console.log(`MockCache.get() called with filePath: "${filePath}", line: ${line}`);
    console.log(`MockCache has ${this.data.size} file(s) cached`);
    
    const entries = this.data.get(filePath);
    if (!entries || entries.length === 0) {
      console.log(`No entries found for filePath: "${filePath}"`);
      console.log(`Available file paths:`, Array.from(this.data.keys()));
      return null;
    }
    
    console.log(`Found ${entries.length} entries for "${filePath}":`, 
      entries.map(e => `${e.startLine}-${e.endLine}`));
    
    const match = entries.find((e) => line >= e.startLine && line <= e.endLine);
    console.log(`Looking for line ${line}, match found:`, !!match);
    if (match) {
      console.log(`Match: lines ${match.startLine}-${match.endLine}`);
    }
    
    return match ? match.context : null;
  }

  upsert(filePath: string, startLine: number, endLine: number, context: BusinessContext): void {
    if (!this.data.has(filePath)) {
      this.data.set(filePath, []);
    }
    const entries = this.data.get(filePath)!;
    const overlappingIndex = entries.findIndex(
      (e) => !(endLine < e.startLine || startLine > e.endLine)
    );
    if (overlappingIndex >= 0) {
      entries[overlappingIndex] = { startLine, endLine, context };
    } else {
      entries.push({ startLine, endLine, context });
    }
  }

  clear(pattern?: string): void {
    if (!pattern) {
      this.data.clear();
      return;
    }
    for (const key of Array.from(this.data.keys())) {
      if (key.includes(pattern)) {
        this.data.delete(key);
      }
    }
  }

  /**
   * Get all cache keys for debugging purposes
   */
  getCacheKeys(): string[] {
    return Array.from(this.data.keys());
  }
}


