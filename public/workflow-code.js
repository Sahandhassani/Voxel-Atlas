// Export a reproducible demonstration selected in the synthesis UI.
// No model weights or external compute service are assumed by this file.
export function workflowCode(model, dataset, origin) {
  const study = dataset.studyId || dataset.id.replace(/-(t1|t2|t1ce|flair)$/i, '');
  const config = {
    mode: 'precomputed-demo',
    model_workflow: model.id,
    source_modality: model.source,
    target_modality: model.target,
    dataset: dataset.id,
    input_filename: `${dataset.id}.nii.gz`,
    output_filename: `${study}-${model.target.toLowerCase()}.nii.gz`,
    input_url: new URL(dataset.downloadUrl || dataset.url, origin).href,
    output_url: new URL(`/data/${study}-${model.target.toLowerCase()}.nii.gz`, origin).href,
    real_inference_connected: false,
  };
  const code = `#!/usr/bin/env python3
"""Voxel Atlas: ${model.source} to ${model.target} workflow demonstration.

Downloads the selected synthetic input and its precomputed paired target.
This does not execute a trained AI model or generate a clinical prediction.
No API key, payment, or Python package installation is needed.
This standalone download does not change the website's demo-credit balance.

Usage: python3 voxel_workflow.py
For real inference, connect your validated model in run_trained_model().
"""
import argparse
import json
from pathlib import Path
from urllib.request import urlopen

CONFIG = json.loads(r'''${JSON.stringify(config, null, 2)}''')


def download_volume(url, destination):
    if destination.exists():
        print(f"Already exists, kept: {destination}")
        return
    with urlopen(url, timeout=60) as response:
        payload = response.read()
    if not payload.startswith(b'\\x1f\\x8b'):
        raise ValueError("Expected a gzip-compressed NIfTI volume")
    destination.write_bytes(payload)
    print(f"Saved {destination} ({len(payload):,} bytes)")


def run_trained_model(input_path, output_path):
    raise NotImplementedError(
        "Real inference is not connected. Supply your trained model, "
        "preprocessing, and validation before using this integration point."
    )


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-dir", default="voxel_demo", help="Folder for the paired synthetic volumes")
    args = parser.parse_args()
    output = Path(args.output_dir)
    output.mkdir(parents=True, exist_ok=True)
    (output / "workflow.json").write_text(json.dumps(CONFIG, indent=2))
    download_volume(CONFIG["input_url"], output / CONFIG["input_filename"])
    download_volume(CONFIG["output_url"], output / CONFIG["output_filename"])
    print("Demo complete: paired synthetic samples, no AI inference performed.")


if __name__ == "__main__":
    main()
`;
  return { code, config };
}
