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
          ];

          shellHook = ''
            echo "sleep-lecturer dev environment"
            export PYTHONPATH="$PWD/backend:$PYTHONPATH"
          '';
        };
      });
}
