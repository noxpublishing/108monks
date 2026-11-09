"""Build a public source offer from an explicit manifest, never from all server files."""
import json
import zipfile
from pathlib import Path
from tempfile import TemporaryDirectory

def build_source_archive(root: Path, destination: Path) -> Path:
    root = root.resolve()
    paths = json.loads((root / 'SOURCE_MANIFEST.json').read_text('utf-8'))
    if not isinstance(paths, list) or len(paths) > 200 or not all(isinstance(name, str) for name in paths):
        raise ValueError('Invalid public source manifest')
    with TemporaryDirectory(prefix='.source-', dir=destination.parent) as staging:
        temporary = Path(staging) / destination.name
        with zipfile.ZipFile(temporary, 'w', zipfile.ZIP_DEFLATED) as archive:
            for name in paths:
                path = Path(name)
                if not path.parts or path.is_absolute() or '..' in path.parts or path.parts[0] in ('data','.git','.venv'):
                    raise ValueError('Unsafe source manifest entry')
                if path.name in ('.env','node.json','peers.json','manifest.json') or 'identity' in path.name:
                    raise ValueError('Private configuration must not enter the source offer')
                file = root / path
                if file.resolve() != file or not file.is_file() or file.stat().st_size > 4 * 1024 * 1024:
                    raise ValueError('Invalid source file')
                archive.write(file, 'meditating-monks/' + path.as_posix())
        temporary.replace(destination)
    return destination
