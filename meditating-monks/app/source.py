"""Build a public source offer from an explicit manifest, never from all server files."""
import json
import zipfile
from pathlib import Path

def build_source_archive(root: Path, destination: Path) -> Path:
    paths = json.loads((root / 'SOURCE_MANIFEST.json').read_text('utf-8'))
    if not isinstance(paths, list) or len(paths) > 200:
        raise ValueError('Invalid public source manifest')
    temporary = destination.with_suffix('.tmp')
    with zipfile.ZipFile(temporary, 'w', zipfile.ZIP_DEFLATED) as archive:
        for name in paths:
            path = Path(name)
            if path.is_absolute() or '..' in path.parts or path.parts[0] in ('data','.git','.venv'):
                raise ValueError('Unsafe source manifest entry')
            if path.name in ('.env','node.json','peers.json','manifest.json') or 'identity' in path.name:
                raise ValueError('Private configuration must not enter the source offer')
            file = (root / path).resolve()
            if not file.is_relative_to(root.resolve()) or not file.is_file() or file.stat().st_size > 4 * 1024 * 1024:
                raise ValueError('Invalid source file')
            archive.write(file, 'meditating-monks/' + path.as_posix())
    temporary.replace(destination)
    return destination
