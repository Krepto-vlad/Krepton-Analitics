import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';
import { OPENAPI_SPEC_FILENAME } from '../../../constants.js';

export const OPENAPI_SPEC_PATH = path.resolve(__dirname, '../../../../', OPENAPI_SPEC_FILENAME);

interface DocumentedRequestSchema {
  $ref?: string;
  required?: string[];
  properties?: Record<string, unknown>;
}

interface OpenApiOperation {
  requestBody?: {
    content?: Record<string, { schema?: DocumentedRequestSchema }>;
  };
}

interface OpenApiDocument {
  paths: Record<string, Record<string, OpenApiOperation>>;
  components: { schemas: Record<string, DocumentedRequestSchema> };
}

const JSON_CONTENT_TYPE = 'application/json';
const SCHEMA_REFERENCE_PREFIX = '#/components/schemas/';

function loadOpenApiDocument(): OpenApiDocument {
  return parse(readFileSync(OPENAPI_SPEC_PATH, 'utf8')) as OpenApiDocument;
}

function readDocumentedRequestSchema(
  specPath: string,
  httpMethod: string
): DocumentedRequestSchema {
  const document = loadOpenApiDocument();
  const schema =
    document.paths[specPath]?.[httpMethod]?.requestBody?.content?.[JSON_CONTENT_TYPE]?.schema;
  if (!schema) {
    throw new Error(
      `No JSON request body is documented for ${httpMethod.toUpperCase()} ${specPath}`
    );
  }
  if (schema.$ref?.startsWith(SCHEMA_REFERENCE_PREFIX)) {
    return document.components.schemas[schema.$ref.slice(SCHEMA_REFERENCE_PREFIX.length)];
  }
  return schema;
}

export interface RequestBodyDrift {
  missingRequiredFields: string[];
  undocumentedFields: string[];
}

/** Compares the keys a client sends with the request body the OpenAPI spec documents. */
export function findRequestBodyDrift(
  specPath: string,
  httpMethod: string,
  requestBody: Record<string, unknown>
): RequestBodyDrift {
  const documentedSchema = readDocumentedRequestSchema(specPath, httpMethod);
  const documentedFields = Object.keys(documentedSchema.properties ?? {});
  const sentFields = Object.keys(requestBody);

  return {
    missingRequiredFields: (documentedSchema.required ?? []).filter(
      (field) => !sentFields.includes(field)
    ),
    undocumentedFields: sentFields.filter((field) => !documentedFields.includes(field)),
  };
}
