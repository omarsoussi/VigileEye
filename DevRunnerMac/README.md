# DevRunner (macOS)

A small macOS desktop launcher to run your projects (FastAPI backends + React frontend) and keep per-project notes/files/images.

## Run (dev)

```bash
cd /Users/mac/Desktop/PFE/DevRunnerMac
python3 dev_runner.py
```

## Build a real `.app` (py2app)

Note: on macOS 26.x, `py2app` currently aborts with an OS-version check error (likely a compatibility issue with the new macOS version). Use **PyInstaller** below instead.

```bash
cd /Users/mac/Desktop/PFE/DevRunnerMac
python3 -m pip install --upgrade pip
python3 -m pip install py2app
python3 setup.py py2app
```

## Build a real `.app` (recommended: PyInstaller)

```bash
cd /Users/mac/Desktop/PFE/DevRunnerMac
zsh build_app_pyinstaller.sh
```

Output: `dist/Dev Runner.app`

Your app will be in `dist/Dev Runner.app` (name can vary slightly).

### Where data is stored

When built as a `.app`, the config and library are stored here:

- `~/Library/Application Support/DevRunner/projects.json`
- `~/Library/Application Support/DevRunner/library.sqlite3`
- `~/Library/Application Support/DevRunner/storage/`

## Add new projects

- In the app: click **Config** to open `projects.json`.
- Add an entry with `name`, `working_dir`, `start_command`, and (optional) `port` + `kill_port_before_start`.

Example:

```json
{
  "name": "MyService",
  "working_dir": "/absolute/path/to/service",
  "start_command": "python3 -m uvicorn main:app --reload --port 8010",
  "port": 8010,
  "kill_port_before_start": true,
  "env": {}
}
```
