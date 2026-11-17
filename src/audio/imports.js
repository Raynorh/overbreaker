export const IMPORT_LIMITS = Object.freeze({
  files: 128,
  archive: 32 * 1024 ** 2,
  file: 20 * 1024 ** 2,
  total: 96 * 1024 ** 2,
  ratio: 150,
  duration: 600,
});
export function validateAudio(buffer) {
  const bytes = new Uint8Array(buffer);
  const text = new TextDecoder("ascii").decode(bytes.subarray(0, 12));
  const known =
    text.startsWith("ID3") ||
    (bytes[0] === 255 && (bytes[1] & 224) === 224) ||
    (text.startsWith("RIFF") && text.slice(8) === "WAVE") ||
    text.startsWith("OggS") ||
    text.startsWith("fLaC") ||
    text.slice(4, 8) === "ftyp";
  if (!known || buffer.byteLength > IMPORT_LIMITS.file)
    throw new Error("Audio inválido o demasiado grande");
}
export async function unzip(buffer) {
  if (buffer.byteLength > IMPORT_LIMITS.archive || buffer.byteLength < 22)
    throw new Error("ZIP inválido o demasiado grande");
  const view = new DataView(buffer),
    bytes = new Uint8Array(buffer);
  let end = bytes.length - 22;
  while (
    end >= Math.max(0, bytes.length - 65557) &&
    view.getUint32(end, true) !== 0x06054b50
  )
    end--;
  if (end < Math.max(0, bytes.length - 65557))
    throw new Error("Directorio ZIP no encontrado");
  if (view.getUint16(end + 4, true) || view.getUint16(end + 6, true))
    throw new Error("ZIP multipart no compatible");
  const count = view.getUint16(end + 10, true);
  if (count > IMPORT_LIMITS.files)
    throw new Error("Demasiados archivos en el ZIP");
  let offset = view.getUint32(end + 16, true),
    total = 0;
  const entries = [];
  for (let i = 0; i < count; i++) {
    if (offset + 46 > end || view.getUint32(offset, true) !== 0x02014b50)
      throw new Error("Directorio ZIP inválido");
    const flags = view.getUint16(offset + 8, true),
      method = view.getUint16(offset + 10, true);
    const compressed = view.getUint32(offset + 20, true),
      size = view.getUint32(offset + 24, true);
    const length = view.getUint16(offset + 28, true),
      extra = view.getUint16(offset + 30, true),
      comment = view.getUint16(offset + 32, true);
    const local = view.getUint32(offset + 42, true);
    const name = new TextDecoder().decode(
      bytes.subarray(offset + 46, offset + 46 + length),
    );
    offset += 46 + length + extra + comment;
    if (offset > end) throw new Error("Entrada truncada");
    if (name.endsWith("/")) continue;
    total += size;
    if (
      size > IMPORT_LIMITS.file ||
      total > IMPORT_LIMITS.total ||
      size / Math.max(1, compressed) > IMPORT_LIMITS.ratio
    )
      throw new Error("ZIP excede el presupuesto de memoria");
    if (
      flags & 1 ||
      ![0, 8].includes(method) ||
      local + 30 > bytes.length ||
      view.getUint32(local, true) !== 0x04034b50
    )
      throw new Error("Entrada ZIP no compatible");
    const start =
      local +
      30 +
      view.getUint16(local + 26, true) +
      view.getUint16(local + 28, true);
    if (start + compressed > bytes.length)
      throw new Error("Datos ZIP truncados");
    entries.push({
      name: name.split("/").pop(),
      start,
      compressed,
      size,
      method,
    });
  }
  const result = [];
  for (const entry of entries) {
    const raw = bytes.slice(entry.start, entry.start + entry.compressed);
    let data = raw;
    if (entry.method === 8) {
      const reader = new Blob([raw])
        .stream()
        .pipeThrough(new DecompressionStream("deflate-raw"))
        .getReader();
      const chunks = [];
      let length = 0;
      try {
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          length += value.byteLength;
          if (length > entry.size)
            throw new Error("Tamaño descomprimido excedido");
          chunks.push(value);
        }
      } catch (error) {
        await reader.cancel();
        throw error;
      }
      data = new Uint8Array(length);
      let position = 0;
      for (const chunk of chunks) {
        data.set(chunk, position);
        position += chunk.length;
      }
    }
    if (data.byteLength !== entry.size)
      throw new Error("Tamaño ZIP incorrecto");
    validateAudio(data.buffer);
    result.push({ name: entry.name, buf: data.buffer });
  }
  return result;
}
