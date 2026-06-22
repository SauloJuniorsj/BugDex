/**
 * Hash djb2 determinístico. Retorna inteiro sem sinal de 32 bits.
 * Não usa nada que dependa de ambiente — mesmo input sempre dá mesmo output.
 */
export function stableHash(input: string): number {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    // hash * 33 + charCode, mantido em 32 bits.
    hash = ((hash << 5) + hash + input.charCodeAt(i)) | 0;
  }
  return hash >>> 0;
}
