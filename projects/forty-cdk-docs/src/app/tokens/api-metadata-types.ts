/**
 * Shape of the JSON files emitted by
 * `projects/forty-cdk-docs/scripts/generate-api-metadata.ts`. Hand-kept in
 * sync with the script's output — there is no schema codegen step, the
 * tradeoff is intentional given the small size and the fact that the script
 * lives in this same project.
 */
export interface ApiMember {
  name: string;
  kind: 'input' | 'inputRequired' | 'output' | 'model' | 'modelRequired';
  type: string;
  defaultValue: string | null;
  doc: string;
}

export interface ApiMethod {
  name: string;
  signature: string;
  doc: string;
}

export interface ApiPiece {
  class: string;
  kind: 'directive' | 'component';
  selector: string | null;
  exportAs: string | null;
  host: Record<string, string>;
  doc: string;
  source: string;
  inputs: ApiMember[];
  outputs: ApiMember[];
  models: ApiMember[];
  methods: ApiMethod[];
}

export interface PrimitiveMetadata {
  primitive: string;
  pieces: ApiPiece[];
}
