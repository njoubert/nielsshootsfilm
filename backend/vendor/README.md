# Go Vendoring and Hermetic Builds

This repository includes the code of all the dependencies for the back-end. To build the Go backend, you only need this repository, no downloads from a package manager. This is called a Hermetic Build.

Go makes this easy with a process called "vendoring". We use that here to save all our dependent packages right into our repo, very nice!

This folder is managed by the Go build system.
You can use the `../scripts/update-deps.sh` script to manage updating these dependencies.

**One note:** This does NOT include the C++ libraries we might depend on. The `../../provision.sh` is still needed to install the C++ dependencies locally, and if you're releasing bare metal rather than through Docker, also needed on the server.
