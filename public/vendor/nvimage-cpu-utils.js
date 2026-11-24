/** CPU-only scalar extraction helpers for NiiVue 0.69.0 NVImage objects. */
export function canonicalScalar(image, frame = 0) {
  if (!image.hdr || !image.img || !image.dimsRAS || !image.matRAS) throw new Error('Image has not finished loading.');
  if ([128, 2304].includes(image.hdr.datatypeCode)) throw new Error('This fallback currently supports scalar MRI volumes, not RGB/RGBA volumes.');
  const dims = image.dimsRAS.slice(1, 4);
  const count = dims.reduce((a, b) => a * b, 1);
  const frames = Math.max(1, Math.floor(image.img.length / count));
  frame = Math.max(0, Math.min(Math.floor(frame), frames - 1));
  // img2RAS() in 0.69.0 returns the whole input for identity permutations.
  const identity = image.permRAS.every((p, i) => p === i + 1);
  const raw = identity ? image.img.subarray(frame * count, (frame + 1) * count) : image.img2RAS(frame).subarray(0, count);
  const slope = Number.isFinite(image.hdr.scl_slope) && image.hdr.scl_slope !== 0 ? image.hdr.scl_slope : 1;
  const intercept = Number.isFinite(image.hdr.scl_inter) ? image.hdr.scl_inter : 0;
  const data = new Float32Array(count);
  for (let i = 0; i < count; i++) data[i] = Number(raw[i]) * slope + intercept;
  return {
    image, dims, data, frames, frame,
    spacing: image.pixDimsRAS.slice(1, 4).map(Math.abs),
    affine: Array.from(image.matRAS), // ROW major: translations at 3, 7, 11.
    calMin: image.cal_min, calMax: image.cal_max,
    worldAt: (xyz) => Array.from(image.vox2mm(xyz, image.matRAS)),
    voxelAt: (mm) => Array.from(image.mm2vox(mm, true))
  };
}

/** Resample scalar labels to the reference voxel grid, preserving both affines. */
export function mapOverlayNearest(reference, overlay) {
  const [nx, ny, nz] = reference.dims;
  const [ox, oy, oz] = overlay.dims;
  const transform = (p) => overlay.voxelAt(reference.worldAt(p));
  const origin = transform([0, 0, 0]);
  const dx = transform([1, 0, 0]).map((v, i) => v - origin[i]);
  const dy = transform([0, 1, 0]).map((v, i) => v - origin[i]);
  const dz = transform([0, 0, 1]).map((v, i) => v - origin[i]);
  const out = new Float32Array(nx * ny * nz);
  let i = 0;
  for (let z = 0; z < nz; z++) {
    for (let y = 0; y < ny; y++) {
      const bx = origin[0] + z * dz[0] + y * dy[0];
      const by = origin[1] + z * dz[1] + y * dy[1];
      const bz = origin[2] + z * dz[2] + y * dy[2];
      for (let x = 0; x < nx; x++, i++) {
        const sx = Math.round(bx + x * dx[0]);
        const sy = Math.round(by + x * dx[1]);
        const sz = Math.round(bz + x * dx[2]);
        if (sx >= 0 && sx < ox && sy >= 0 && sy < oy && sz >= 0 && sz < oz) out[i] = overlay.data[sx + ox * (sy + oy * sz)];
      }
    }
  }
  return out;
}
