const run=async(bytes,Stream)=>new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new Stream('gzip'))).arrayBuffer());
export const gzip=b=>run(b,CompressionStream);
export const gunzip=b=>run(b,DecompressionStream);
