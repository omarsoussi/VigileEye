from setuptools import setup

APP = ["dev_runner.py"]
DATA_FILES = ["projects.json"]

OPTIONS = {
    "argv_emulation": True,
    "packages": [],
    "includes": ["library_db"],
    "plist": {
        "CFBundleName": "Dev Runner",
        "CFBundleDisplayName": "Dev Runner",
        "CFBundleIdentifier": "com.omarsoussi.devrunner",
        "CFBundleShortVersionString": "1.0.0",
        "CFBundleVersion": "1.0.0",
        "NSHighResolutionCapable": True,
    },
}

setup(
    name="DevRunner",
    app=APP,
    data_files=DATA_FILES,
    options={"py2app": OPTIONS},
    setup_requires=["py2app"],
)
