/// <reference types="vite/client" />

/**
 * This declaration file provides TypeScript with type information for the
 * `@google/genai` module, which is loaded via an import map from a CDN.
 * This allows TypeScript to type-check the code without needing a local
 * `node_modules` installation of the package.
 */
declare module '@google/genai' {
  /**
   * Represents the main client for interacting with the Google Generative AI API.
   */
  export class GoogleGenAI {
    constructor(options: { apiKey: string });

    /**
     * Accessor for model-related operations.
     */
    models: {
      /**
       * Generates content based on a prompt and model configuration.
       */
      generateContent(request: {
        model: string;
        contents: string;
        config: {
          responseMimeType: 'application/json';
          responseSchema: any;
        };
      }): Promise<{ text: string }>;
    };
  }

  /**
   * Enum for specifying data types in a response schema, mirroring the OpenAPI specification.
   */
  export enum Type {
    TYPE_UNSPECIFIED = 'TYPE_UNSPECIFIED',
    STRING = 'STRING',
    NUMBER = 'NUMBER',
    INTEGER = 'INTEGER',
    BOOLEAN = 'BOOLEAN',
    ARRAY = 'ARRAY',
    OBJECT = 'OBJECT',
    NULL = 'NULL',
  }
}

/**
 * Vite environment variables
 */
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
