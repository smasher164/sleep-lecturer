{
  description = "Sleep Lecturer dev environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in {
        devShells.default = pkgs.mkShell {
          packages = with pkgs; [
            python311
            uv
            nodejs_20
            overmind
            tmux
            ollama
          ];

          shellHook = ''
            echo "sleep-lecturer dev environment"
            export PYTHONPATH="$PWD/backend:$PYTHONPATH"

            if [ ! -d backend/.venv ]; then
              echo "Installing Python dependencies..."
              (cd backend && uv venv .venv && uv pip install -e ".[dev]")
            fi

            source backend/.venv/bin/activate

            if [ ! -d frontend/node_modules ]; then
              echo "Installing Node dependencies..."
              npm --prefix frontend install
            fi

            if ! ollama list 2>/dev/null | grep -q "llama3.2"; then
              echo "hint: run 'ollama pull llama3.2' to enable local model support"
            fi
          '';
        };
      });
}
