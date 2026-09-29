from pathlib import Path
import hashlib, json, tarfile
root = Path('/Users/mrkokom/My Drive (cocombees@gmail.com)/Hermes/AI Video/Prism/work')
out = Path('/Users/mrkokom/My Drive (cocombees@gmail.com)/Hermes/AI Video/Prism/outputs/rollback/2026-08-30-prism-3d-camera-sixteenth-source')
out.mkdir(parents=True, exist_ok=True)
paths = [p for p in (root/'src/camera3d').rglob('*') if p.is_file()]
paths += [p for p in (root/'src/camera-tester').rglob('*') if p.is_file()]
paths += [root/'electron.vite.camera.config.ts', root/'electron-builder.camera.json', root/'package.json', root/'package-lock.json', root/'src/renderer/src/styles-next.css', root/'src/renderer/src/StoryboardSharedControls.tsx', root/'src/shared/minimapGeometry.ts']
paths = sorted(set(p for p in paths if p.exists()), key=lambda p: p.relative_to(root).as_posix())
manifest = {'root': str(root), 'parent': 'Prism 3D Camera Sixteenth verified source', 'files': []}
for p in paths:
    data = p.read_bytes()
    manifest['files'].append({'path': p.relative_to(root).as_posix(), 'size': len(data), 'sha256': hashlib.sha256(data).hexdigest()})
manifest_path = out/'manifest.json'
manifest_path.write_text(json.dumps(manifest, indent=2)+'\n')
archive_path = out/'prism-3d-camera-sixteenth-source.tar.gz'
with tarfile.open(archive_path, 'w:gz') as archive:
    for p in paths:
        archive.add(p, arcname=p.relative_to(root).as_posix(), recursive=False)
for p in [manifest_path, archive_path]:
    print(f'{p}\t{hashlib.sha256(p.read_bytes()).hexdigest()}')
print(f'FILES\t{len(paths)}')
