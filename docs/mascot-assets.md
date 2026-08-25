# Mascot asset notices

## Maid Whale test deployment

The shared development deployment renders the `maid-whale-rig.glb` asset from
[`baiyuscc13724-max/deepseek-harness-desktop`](https://github.com/baiyuscc13724-max/deepseek-harness-desktop)
at commit `a055814112232ef3b42775d38341b90200cc5259`.

The Maid Whale artwork is licensed separately under
[CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/). It is
used only on the non-commercial shared test server. The asset is fetched
unchanged; this project adds a Three.js presentation adapter and viewport
normalization.

Attribution retained from the upstream notice:

- 上善: original whale-girl character design
  ([Pixiv](https://www.pixiv.net/users/62155430))
- zipzip: maid whale-girl redesign with DeepSeek elements, based on 上善's
  design ([Pixiv](https://www.pixiv.net/users/18604994))
- Small-tailqwq: DSH Web skin adaptation
  ([source](https://github.com/Small-tailqwq/dsh-deep-whale))
- Harness Desktop contributors: rigged GLB test asset and runtime packaging

This is an unofficial community presentation and is not affiliated with or
endorsed by DeepSeek. DeepSeek names, marks, and related brand rights remain
separate from the open-source software licenses.

The GLB provides skeletal actions but no facial morph targets. It does not
support phoneme-level lip sync. Production deployments should select the
`live2d` renderer and a properly licensed first-party model with a mouth-open
parameter.
