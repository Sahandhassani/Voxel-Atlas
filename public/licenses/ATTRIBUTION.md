# NiiVue and MRI demonstration attribution

The viewer uses NiiVue 0.69.0, distributed under the BSD 2-Clause license. The standalone ESM file is decoded from the official npm package’s `build/index.min.js` export; it is not a modified implementation. Retain NIIVUE-LICENSE.txt.

The bundled `mni152.nii.gz` file is a reference brain template, not an individual patient scan. It was downloaded from https://niivue.github.io/niivue-demo-images/mni152.nii.gz. The NiiVue demo-images repository identifies it as derived from the ICBM 152 Nonlinear atlases version 2009. Retain DEMO-IMAGES-LICENSE.txt and ICBM-LICENSE.txt.

Sources:
- https://github.com/niivue/niivue
- https://github.com/niivue/niivue-demo-images
- https://www.bic.mni.mcgill.ca/ServicesAtlases/ICBM152NLin2009

Atlas publications requested by the originating institution:
- Fonov VS et al. Unbiased average age-appropriate atlases for pediatric studies. NeuroImage 54(1), 2011. https://doi.org/10.1016/j.neuroimage.2010.07.033
- Fonov VS et al. Unbiased nonlinear average age-appropriate brain templates from birth to adulthood. NeuroImage 47 Supplement 1, S102, 2009. https://doi.org/10.1016/S1053-8119(09)70884-5

NIfTI header: uint8, native dimensions 207 × 256 × 215, isotropic voxel spacing approximately 0.737463 mm. Header default intensity window: 40 to 80. Respect the image affine; do not infer anatomical axes solely from native array dimensions.
